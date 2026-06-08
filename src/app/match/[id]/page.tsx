import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getMatch,
  getMatchOdds,
  getPolyMarketSlug,
  type OddsRow,
} from "../../../db/queries/matches";
import {
  getVoteTally,
  getUserVote,
  getMatchVotesDetailed,
} from "../../../db/queries/votes";
import { getCurrentUser } from "../../../lib/identity";
import { deriveStatus, isVotable } from "../../../lib/matchState";
import { allowsDraw, validPicks, stageLabel, type Pick } from "../../../lib/stage";
import { computeVoteOdds } from "../../../lib/voteOdds";
import { formatKickoff } from "../../../lib/format";
import { StatusBadge } from "../../components/StatusBadge";
import { OddsCompare, type OutcomeOdds } from "../../components/OddsCompare";
import { VotePanel } from "../../components/VotePanel";
import { VotesList } from "../../components/VotesList";

const POLYMARKET_EVENT_BASE = "https://polymarket.com/event/";

export const dynamic = "force-dynamic";

function marketP(odds: OddsRow | null, key: Pick): number | null {
  if (!odds) return null;
  return key === "home" ? odds.p_home : key === "draw" ? odds.p_draw : odds.p_away;
}
function marketD(odds: OddsRow | null, key: Pick): number | null {
  if (!odds) return null;
  return key === "home" ? odds.d_home : key === "draw" ? odds.d_draw : odds.d_away;
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = getMatch(Number(id));
  if (!match) notFound();

  const user = await getCurrentUser();
  const { polymarket, locked } = getMatchOdds(match.id);
  const marketOdds = locked ?? polymarket;
  const tally = getVoteTally(match.id);
  const withDraw = allowsDraw(match.stage);
  const voteOdds = computeVoteOdds(tally, withDraw);
  const userVote = user ? getUserVote(match.id, user.id) : null;
  const votes = getMatchVotesDetailed(match.id);
  const polySlug = getPolyMarketSlug(match.id);
  const polymarketUrl = polySlug ? `${POLYMARKET_EVENT_BASE}${polySlug}` : null;

  const status = deriveStatus({
    kickoffAt: match.kickoff_at,
    bettable: !!match.home.id && !!match.away.id,
    settled: !!match.settled,
    now: Date.now(),
  });

  const teamLabel: Record<Pick, string> = {
    home: match.home.name,
    draw: "平局",
    away: match.away.name,
  };

  const crowdP = (key: Pick): number | null =>
    key === "home"
      ? (voteOdds?.p_home ?? null)
      : key === "draw"
        ? (voteOdds?.p_draw ?? null)
        : (voteOdds?.p_away ?? null);
  const crowdD = (key: Pick): number | null =>
    key === "home"
      ? (voteOdds?.d_home ?? null)
      : key === "draw"
        ? (voteOdds?.d_draw ?? null)
        : (voteOdds?.d_away ?? null);

  const picks = validPicks(match.stage);
  const outcomes: OutcomeOdds[] = picks.map((key) => ({
    key,
    teamLabel: teamLabel[key],
    marketP: marketP(marketOdds, key),
    marketD: marketD(marketOdds, key),
    crowdP: crowdP(key),
    crowdD: crowdD(key),
  }));

  // Settlement runs on the crowd vote odds, so that's what the preview shows.
  const voteDecimal: Partial<Record<Pick, number | null>> = {};
  for (const key of picks) voteDecimal[key] = crowdD(key);

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-text-mid hover:text-text-hi">
        ← 返回赛程
      </Link>

      <header className="relative overflow-hidden rounded-card border border-border bg-bg-pitch p-5">
        <div className="flex items-center justify-between text-xs text-text-mid">
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-bg-elevated px-1.5 py-0.5 font-semibold">
              {stageLabel(match.stage)}
            </span>
            {match.group_name && <span>{match.group_name}</span>}
          </span>
          <StatusBadge status={status} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-4xl">{match.home.flag ?? "🏳️"}</span>
            <span className="text-center font-display text-lg tracking-wide">
              {match.home.name}
            </span>
          </div>
          <div className="flex flex-col items-center">
            {match.settled && match.home_score != null ? (
              <span className="font-display text-4xl tabular text-amber">
                {match.home_score}–{match.away_score}
              </span>
            ) : (
              <span className="font-display text-2xl text-text-low">VS</span>
            )}
          </div>
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-4xl">{match.away.flag ?? "🏳️"}</span>
            <span className="text-center font-display text-lg tracking-wide">
              {match.away.name}
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-text-mid">
          {formatKickoff(match.kickoff_at)}
          {match.venue && <span className="text-text-low"> · {match.venue}</span>}
        </p>
        {match.settled && match.result && (
          <p className="mt-1 text-center text-sm text-amber">
            结果：{teamLabel[match.result as Pick]}
            {match.result !== "draw" ? "胜" : ""}
          </p>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <OddsCompare
            outcomes={outcomes}
            crowdTotal={tally.voters}
            lowSample={!!voteOdds?.lowSample}
            locked={!!locked}
            polymarketUrl={polymarketUrl}
          />
          <VotesList
            votes={votes}
            teamLabel={teamLabel}
            result={(match.result as Pick) ?? null}
            settled={!!match.settled}
          />
        </div>
        <VotePanel
          matchId={match.id}
          picks={picks.map((key) => ({ key, label: teamLabel[key] }))}
          oddsDecimal={voteDecimal}
          votable={isVotable(status)}
          hasIdentity={!!user}
          initialPick={(userVote?.pick as Pick) ?? null}
          initialStake={userVote?.stake ?? null}
        />
      </div>

      <p className="text-center text-xs text-text-low">
        🥤 结算以<strong className="text-text-mid"> 群众投票赔率 </strong>为准（开赛前 1 小时锁定）·
        Polymarket 仅作对比 ·
        {withDraw ? " 小组赛 主/平/客" : " 淘汰赛 只投晋级方"}
      </p>
    </div>
  );
}
