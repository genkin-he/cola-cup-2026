import {
  getAllMatches,
  getMatchesWithOdds,
  getLockedVoteOdds,
} from "../../db/queries/matches";
import { getAllTallies } from "../../db/queries/votes";
import { getMatchPayouts, getSettlementSummary } from "../../db/queries/ledger";
import { getCurrentSettler } from "../../lib/settler";
import { validPicks, stageLabel } from "../../lib/stage";
import {
  bottlesToBuy,
  bottlesToReceive,
  platformPool,
} from "../../lib/decimalOdds";
import {
  AdminPanel,
  type AdminMatch,
  type SettlementSummary,
} from "../components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const settler = await getCurrentSettler();
  if (!settler) {
    return (
      <div className="mx-auto max-w-md space-y-3 pt-10 text-center">
        <h1 className="font-display text-2xl tracking-wide">⚙️ 结算后台</h1>
        <p className="text-text-mid">此页面仅限结算账号访问。</p>
        <p className="text-sm text-text-low">请用结算账号登录后再来。</p>
      </div>
    );
  }

  const matches = getAllMatches();
  const withOdds = getMatchesWithOdds();
  const tallies = getAllTallies();

  const rows: AdminMatch[] = matches.map((m) => {
    const payoutRows = m.settled ? getMatchPayouts(m.id) : [];
    const voteRow = m.settled ? getLockedVoteOdds(m.id) : null;
    return {
      id: m.id,
      label: `${m.home.flag ?? ""} ${m.home.name} vs ${m.away.name} ${m.away.flag ?? ""}`,
      stageLabel: stageLabel(m.stage),
      kickoffAt: m.kickoff_at,
      settled: !!m.settled,
      cokeSettled: !!m.coke_settled,
      hasOdds: withOdds.has(m.id),
      votes: tallies.get(m.id)?.voters ?? 0,
      picks: validPicks(m.stage).map((key) => ({
        key,
        label:
          key === "home" ? m.home.name : key === "away" ? m.away.name : "平局",
      })),
      allowsDraw: validPicks(m.stage).includes("draw"),
      result: m.result,
      homeScore: m.home_score,
      awayScore: m.away_score,
      voteOdds: voteRow
        ? { home: voteRow.p_home, draw: voteRow.p_draw, away: voteRow.p_away }
        : null,
      platformBottles: platformPool(payoutRows.map((p) => p.delta)),
      payouts: payoutRows.map((p) => ({
        nickname: p.nickname,
        emoji: p.emoji,
        avatarUrl: p.avatar_url,
        pick: p.pick,
        delta: p.delta,
        owe: bottlesToBuy(p.delta),
        recv: bottlesToReceive(p.delta),
      })),
    };
  });

  const summaryRows = getSettlementSummary();
  const summary: SettlementSummary = {
    rows: summaryRows.map((r) => ({
      nickname: r.nickname,
      emoji: r.emoji,
      owe: bottlesToBuy(r.pending_net),
      recv: bottlesToReceive(r.pending_net),
    })),
    platformPool: platformPool(summaryRows.map((r) => r.pending_net)),
    pendingMatches: rows.filter((m) => m.settled && !m.cokeSettled).length,
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl tracking-wide">⚙️ 结算后台</h1>
        <p className="mt-1 text-sm text-text-mid">
          录入/同步结果触发结算；在「可乐总账」核对比分、按清单线下收发可乐后一键平账。
        </p>
      </header>
      <AdminPanel matches={rows} summary={summary} />
    </div>
  );
}
