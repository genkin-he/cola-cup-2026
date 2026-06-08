import { settleMatch } from "../settlement";
import {
  buildMatchIndex,
  resolveTeam,
  type MatchIndex,
} from "../../scripts/matchPolymarket";
import { fetchJsonRetry } from "./http";
import type { Pick } from "../stage";

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const WORLD_CUP_CODE = "WC";

type FdMatch = {
  id: number;
  status: string;
  homeTeam: { name: string | null };
  awayTeam: { name: string | null };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
  };
};

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Our-perspective result: prefer football-data's winner (covers ET/penalties),
 *  fall back to the full-time score. `fdHomeIsOurHome` maps their home/away to ours. */
function deriveResult(fd: FdMatch, fdHomeIsOurHome: boolean): Pick | null {
  const winner = fd.score.winner;
  if (winner === "HOME_TEAM") return fdHomeIsOurHome ? "home" : "away";
  if (winner === "AWAY_TEAM") return fdHomeIsOurHome ? "away" : "home";
  if (winner === "DRAW") return "draw";

  const { home, away } = fd.score.fullTime;
  if (home == null || away == null) return null;
  const ourHome = fdHomeIsOurHome ? home : away;
  const ourAway = fdHomeIsOurHome ? away : home;
  if (ourHome > ourAway) return "home";
  if (ourHome < ourAway) return "away";
  return "draw";
}

/**
 * Pull finished World Cup matches from football-data.org and auto-settle any
 * fixture we can match by team pair that isn't settled yet. Only touches
 * un-settled matches, so manual score/result corrections are never overwritten.
 * No-op (not an error) when FOOTBALL_DATA_API_KEY is unset.
 */
export async function runSyncResults(): Promise<{
  settled: number;
  skipped: number;
  unmatched: number;
}> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    console.log("[syncResults] FOOTBALL_DATA_API_KEY not set — skipping.");
    return { settled: 0, skipped: 0, unmatched: 0 };
  }

  const data = await fetchJsonRetry<{ matches: FdMatch[] }>(
    `${FOOTBALL_DATA_BASE}/competitions/${WORLD_CUP_CODE}/matches?status=FINISHED`,
    { headers: { "X-Auth-Token": key } },
  );
  const finished = data.matches ?? [];
  const index: MatchIndex = buildMatchIndex();

  let settled = 0;
  let skipped = 0;
  let unmatched = 0;

  for (const fd of finished) {
    const homeId = fd.homeTeam.name ? resolveTeam(fd.homeTeam.name, index) : null;
    const awayId = fd.awayTeam.name ? resolveTeam(fd.awayTeam.name, index) : null;
    if (homeId == null || awayId == null) {
      unmatched += 1;
      continue;
    }
    const match = index.pairToMatch.get(pairKey(homeId, awayId));
    if (!match) {
      unmatched += 1;
      continue;
    }

    const fdHomeIsOurHome = homeId === match.homeId;
    const result = deriveResult(fd, fdHomeIsOurHome);
    if (!result) {
      skipped += 1;
      continue;
    }

    const fh = fd.score.fullTime.home;
    const fa = fd.score.fullTime.away;
    const homeScore = fh == null || fa == null ? null : fdHomeIsOurHome ? fh : fa;
    const awayScore = fh == null || fa == null ? null : fdHomeIsOurHome ? fa : fh;

    const outcome = settleMatch(match.id, result, homeScore, awayScore);
    // A failure here is almost always "already settled" or a knockout draw —
    // both are fine to skip silently.
    if (outcome.ok) settled += 1;
    else skipped += 1;
  }

  console.log(
    `[syncResults] finished=${finished.length} settled=${settled} skipped=${skipped} unmatched=${unmatched}`,
  );
  return { settled, skipped, unmatched };
}
