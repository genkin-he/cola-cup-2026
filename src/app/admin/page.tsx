import {
  getAllMatches,
  getMatchesWithOdds,
} from "../../db/queries/matches";
import { getAllTallies } from "../../db/queries/votes";
import { validPicks, stageLabel } from "../../lib/stage";
import { AdminPanel, type AdminMatch } from "../components/AdminPanel";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const matches = getAllMatches();
  const withOdds = getMatchesWithOdds();
  const tallies = getAllTallies();

  const rows: AdminMatch[] = matches.map((m) => ({
    id: m.id,
    label: `${m.home.flag ?? ""} ${m.home.name} vs ${m.away.name} ${m.away.flag ?? ""}`,
    stageLabel: stageLabel(m.stage),
    kickoffAt: m.kickoff_at,
    settled: !!m.settled,
    hasOdds: withOdds.has(m.id),
    votes: tallies.get(m.id)?.voters ?? 0,
    picks: validPicks(m.stage).map((key) => ({
      key,
      label: key === "home" ? m.home.name : key === "away" ? m.away.name : "平局",
    })),
    allowsDraw: validPicks(m.stage).includes("draw"),
    result: m.result,
  }));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl tracking-wide">⚙️ 管理后台</h1>
        <p className="mt-1 text-sm text-text-mid">
          录入比赛结果触发结算；为无盘口的比赛手动补录赔率。
        </p>
      </header>
      <AdminPanel matches={rows} />
    </div>
  );
}
