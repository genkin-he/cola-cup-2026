import { db } from "../db/client";
import type { OddsRow } from "../db/queries/matches";
import { getVoteTally } from "../db/queries/votes";
import { computeVoteOdds } from "./voteOdds";
import { allowsDraw, validPicks, type Pick } from "./stage";
import { VOTE_CLOSES_MS_BEFORE } from "./matchState";

type MatchCore = {
  id: number;
  stage: string;
  settled: number;
  kickoff_at: number;
};

function getLockedOdds(matchId: number, sources: string[]): OddsRow | null {
  const placeholders = sources.map(() => "?").join(",");
  return (
    (db
      .prepare(
        `SELECT * FROM odds_snapshot
         WHERE match_id = ? AND is_locked = 1 AND source IN (${placeholders})
         ORDER BY taken_at DESC LIMIT 1`,
      )
      .get(matchId, ...sources) as OddsRow | undefined) ?? null
  );
}

function getLatestMarketOdds(matchId: number): OddsRow | null {
  return (
    (db
      .prepare(
        `SELECT * FROM odds_snapshot
         WHERE match_id = ? AND source IN ('polymarket','manual')
         ORDER BY is_locked DESC, taken_at DESC LIMIT 1`,
      )
      .get(matchId) as OddsRow | undefined) ?? null
  );
}

function insertLockedSnapshot(
  matchId: number,
  source: string,
  odds: {
    p_home: number | null;
    p_draw: number | null;
    p_away: number | null;
    d_home: number | null;
    d_draw: number | null;
    d_away: number | null;
  },
  now: number,
): void {
  db.prepare(
    `INSERT INTO odds_snapshot
       (match_id, source, is_locked, p_home, p_draw, p_away, d_home, d_draw, d_away, taken_at)
     VALUES (@matchId, @source, 1, @pHome, @pDraw, @pAway, @dHome, @dDraw, @dAway, @now)`,
  ).run({
    matchId,
    source,
    pHome: odds.p_home,
    pDraw: odds.p_draw,
    pAway: odds.p_away,
    dHome: odds.d_home,
    dDraw: odds.d_draw,
    dAway: odds.d_away,
    now,
  });
}

/**
 * Freeze a match's binding odds. Settlement uses the locked VOTE odds (crowd
 * implied), so the smart can arbitrage the distribution; the Polymarket/manual
 * market odds are locked too, but only for "crowd vs market" display.
 * Idempotent per source. Returns the locked vote odds (settlement basis).
 */
export function ensureLocked(matchId: number, now: number): OddsRow | null {
  const match = db
    .prepare("SELECT stage FROM matches WHERE id = ?")
    .get(matchId) as { stage: string } | undefined;
  if (!match) return null;

  // Market odds — display only.
  if (!getLockedOdds(matchId, ["polymarket", "manual"])) {
    const latest = getLatestMarketOdds(matchId);
    if (latest) insertLockedSnapshot(matchId, latest.source, latest, now);
  }

  // Vote odds — settlement basis.
  let vote = getLockedOdds(matchId, ["vote"]);
  if (!vote) {
    const voteOdds = computeVoteOdds(
      getVoteTally(matchId),
      allowsDraw(match.stage),
    );
    if (voteOdds) {
      insertLockedSnapshot(matchId, "vote", voteOdds, now);
      vote = getLockedOdds(matchId, ["vote"]);
    }
  }

  return vote;
}

export type SettleResult =
  | { ok: true; settled: number }
  | { ok: false; error: string };

function decimalFor(odds: OddsRow, pick: Pick): number | null {
  return pick === "home" ? odds.d_home : pick === "draw" ? odds.d_draw : odds.d_away;
}

/**
 * Settle a match: write each voter's raw (un-rounded) delta into the ledger
 * using the locked VOTE odds, and mark the match settled. Atomic + idempotent.
 */
export function settleMatch(
  matchId: number,
  result: Pick,
  homeScore: number | null,
  awayScore: number | null,
): SettleResult {
  const match = db
    .prepare("SELECT id, stage, settled, kickoff_at FROM matches WHERE id = ?")
    .get(matchId) as MatchCore | undefined;
  if (!match) return { ok: false, error: "比赛不存在" };
  if (match.settled) return { ok: false, error: "该比赛已结算" };
  if (!validPicks(match.stage).includes(result)) {
    return { ok: false, error: "结果与赛段不符（淘汰赛无平局）" };
  }

  const now = Date.now();
  const run = db.transaction((): SettleResult => {
    const voteOdds = ensureLocked(matchId, now);

    const votes = db
      .prepare("SELECT user_id, pick, stake FROM votes WHERE match_id = ?")
      .all(matchId) as { user_id: number; pick: Pick; stake: number }[];

    if (votes.length > 0 && !voteOdds) {
      return { ok: false, error: "缺少投票赔率，无法结算" };
    }

    const insertLedger = db.prepare(
      `INSERT INTO ledger
         (match_id, user_id, pick, stake, d_used, won, delta, created_at)
       VALUES (@matchId, @userId, @pick, @stake, @dUsed, @won, @delta, @now)
       ON CONFLICT(match_id, user_id) DO NOTHING`,
    );

    let count = 0;
    for (const vote of votes) {
      const dUsed = (voteOdds && decimalFor(voteOdds, vote.pick)) || 1;
      const won = vote.pick === result ? 1 : 0;
      const delta = won ? vote.stake * (dUsed - 1) : -vote.stake;
      insertLedger.run({
        matchId,
        userId: vote.user_id,
        pick: vote.pick,
        stake: vote.stake,
        dUsed,
        won,
        delta,
        now,
      });
      count += 1;
    }

    db.prepare(
      `UPDATE matches
       SET result = ?, home_score = ?, away_score = ?, result_at = ?, settled = 1
       WHERE id = ?`,
    ).run(result, homeScore, awayScore, now, matchId);

    return { ok: true, settled: count };
  });

  return run();
}

export type OkResult = { ok: true } | { ok: false; error: string };

/**
 * Mark a match's offline coke payout done (or undo it). Requires the match to be
 * settled first (result + ledger exist); this only records the physical hand-off
 * of bottles, not the betting outcome. Idempotent.
 */
export function markCokeSettled(
  matchId: number,
  settlerId: number,
  done: boolean,
): OkResult {
  const match = db
    .prepare("SELECT settled FROM matches WHERE id = ?")
    .get(matchId) as { settled: number } | undefined;
  if (!match) return { ok: false, error: "比赛不存在" };
  if (!match.settled) {
    return { ok: false, error: "尚未录入结果，无法标记可乐已结清" };
  }
  db.prepare(
    `UPDATE matches
       SET coke_settled = ?, coke_settled_at = ?, coke_settled_by = ?
     WHERE id = ?`,
  ).run(done ? 1 : 0, done ? Date.now() : null, done ? settlerId : null, matchId);
  return { ok: true };
}

/** Settle everyone's coke at once: mark all result-entered matches as paid. */
export function markAllCokeSettled(settlerId: number): { settled: number } {
  const now = Date.now();
  const info = db
    .prepare(
      `UPDATE matches SET coke_settled = 1, coke_settled_at = ?, coke_settled_by = ?
       WHERE settled = 1 AND coke_settled = 0`,
    )
    .run(now, settlerId);
  return { settled: info.changes };
}

/** Correct or fill a match's score without re-running settlement. */
export function updateMatchScore(
  matchId: number,
  homeScore: number | null,
  awayScore: number | null,
): OkResult {
  const match = db
    .prepare("SELECT id FROM matches WHERE id = ?")
    .get(matchId) as { id: number } | undefined;
  if (!match) return { ok: false, error: "比赛不存在" };
  db.prepare(
    "UPDATE matches SET home_score = ?, away_score = ? WHERE id = ?",
  ).run(homeScore, awayScore, matchId);
  return { ok: true };
}

/** Lock snapshots once voting closes (1h before kickoff) (cron/manual). */
export function lockDueMatches(now: number): number {
  const due = db
    .prepare(
      `SELECT id FROM matches
       WHERE (kickoff_at - ?) <= ? AND settled = 0`,
    )
    .all(VOTE_CLOSES_MS_BEFORE, now) as { id: number }[];
  let locked = 0;
  for (const { id } of due) {
    const alreadyLocked = getLockedOdds(id, ["vote", "polymarket", "manual"]);
    ensureLocked(id, now);
    if (!alreadyLocked && getLockedOdds(id, ["vote", "polymarket", "manual"])) {
      locked += 1;
    }
  }
  return locked;
}
