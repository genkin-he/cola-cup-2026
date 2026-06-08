import {
  getAllMatches,
  getLatestPolymarketOdds,
} from "../db/queries/matches";
import { getAllTallies } from "../db/queries/votes";
import { deriveStatus } from "../lib/matchState";
import { stageLabel, allowsDraw, type Pick } from "../lib/stage";
import {
  dateKey,
  formatDayLabel,
  formatTimeOnly,
  formatKickoff,
  formatCountdown,
} from "../lib/format";
import { ScheduleTimeline, type RowVM } from "./components/ScheduleTimeline";

export const dynamic = "force-dynamic";

const GROUP_RE = /Group ([A-L])/;

function pct(p: number | null | undefined): number | null {
  return p == null ? null : Math.round(p * 100);
}

export default function HomePage() {
  const now = Date.now();
  const matches = getAllMatches();
  const oddsMap = getLatestPolymarketOdds();
  const tallies = getAllTallies();
  const todayKey = dateKey(now);

  const rows: RowVM[] = matches.map((match) => {
    const odds = oddsMap.get(match.id) ?? null;
    const tally = tallies.get(match.id) ?? {
      home: 0,
      draw: 0,
      away: 0,
      stakeTotal: 0,
      voters: 0,
    };
    const bettable = !!match.home.id && !!match.away.id;
    const status = deriveStatus({
      kickoffAt: match.kickoff_at,
      bettable,
      settled: !!match.settled,
      now,
    });
    const groupLetter = match.group_name?.match(GROUP_RE)?.[1] ?? null;
    const withDraw = allowsDraw(match.stage);

    const crowdLeader: { pick: Pick; pctValue: number } | null =
      tally.stakeTotal > 0
        ? (() => {
            const entries: [Pick, number][] = [
              ["home", tally.home],
              ["draw", withDraw ? tally.draw : -1],
              ["away", tally.away],
            ];
            const [pick, value] = entries.reduce((a, b) =>
              b[1] > a[1] ? b : a,
            );
            return {
              pick,
              pctValue: Math.round((value / tally.stakeTotal) * 100),
            };
          })()
        : null;

    return {
      id: match.id,
      kickoffAt: match.kickoff_at,
      dateKey: dateKey(match.kickoff_at),
      dateLabel: formatDayLabel(match.kickoff_at),
      timeLabel: formatTimeOnly(match.kickoff_at),
      stageLabel: stageLabel(match.stage),
      stageKey: match.stage,
      groupKey: groupLetter,
      groupName: match.group_name,
      status,
      home: { name: match.home.name, flag: match.home.flag },
      away: { name: match.away.name, flag: match.away.flag },
      settled: !!match.settled,
      homeScore: match.home_score,
      awayScore: match.away_score,
      resultPick: (match.result as Pick) ?? null,
      market: odds
        ? {
            home: pct(odds.p_home),
            draw: withDraw ? pct(odds.p_draw) : null,
            away: pct(odds.p_away),
          }
        : null,
      crowd: {
        homePct: tally.stakeTotal ? Math.round((tally.home / tally.stakeTotal) * 100) : 0,
        drawPct: tally.stakeTotal ? Math.round((tally.draw / tally.stakeTotal) * 100) : 0,
        awayPct: tally.stakeTotal ? Math.round((tally.away / tally.stakeTotal) * 100) : 0,
        voters: tally.voters,
        leaderPick: crowdLeader?.pick ?? null,
        leaderPct: crowdLeader?.pctValue ?? null,
      },
      countdown:
        status === "open" || status === "scheduled" || status === "upcoming"
          ? formatCountdown(match.kickoff_at, now)
          : formatKickoff(match.kickoff_at),
      isLive: status === "locked" && now >= match.kickoff_at,
    };
  });

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-card border border-border bg-bg-pitch px-5 py-6">
        <div className="bubbles" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        <p className="text-sm text-amber">2026 FIFA 世界杯 · 美加墨</p>
        <h1 className="mt-1 font-display text-3xl tracking-wide sm:text-4xl">
          按赔率，赌可口可乐 🥤
        </h1>
        <p className="mt-2 max-w-md text-sm text-text-mid">
          赛前给球队投票下注，赛后按群众投票赔率结算。押错了，按净瓶数请大家喝可乐。
        </p>
      </header>

      <ScheduleTimeline rows={rows} todayKey={todayKey} />
    </div>
  );
}
