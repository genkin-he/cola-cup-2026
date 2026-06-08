import { db } from "../client";
import type { Pick } from "../../lib/stage";

export type LeaderboardEntry = {
  id: number;
  avatar_url: string | null;
  emoji: string | null;
  nickname: string;
  net_raw: number;
  pending_net: number;
  bets: number;
  wins: number;
};

export function getLeaderboard(): LeaderboardEntry[] {
  return db
    .prepare(
      `SELECT u.id, u.avatar_url, u.emoji, u.nickname,
              COALESCE(SUM(l.delta), 0) AS net_raw,
              COALESCE(SUM(CASE WHEN m.coke_settled = 0 THEN l.delta ELSE 0 END), 0) AS pending_net,
              COUNT(l.id) AS bets,
              COALESCE(SUM(l.won), 0) AS wins
       FROM users u
       LEFT JOIN ledger l ON l.user_id = u.id
       LEFT JOIN matches m ON m.id = l.match_id
       GROUP BY u.id
       ORDER BY net_raw DESC, bets DESC, u.created_at`,
    )
    .all() as LeaderboardEntry[];
}

export type LedgerEntry = {
  id: number;
  match_id: number;
  pick: Pick;
  stake: number;
  d_used: number;
  won: number;
  delta: number;
  created_at: number;
  stage: string;
  kickoff_at: number;
  coke_settled: number;
  home_name: string;
  away_name: string;
  home_flag: string | null;
  away_flag: string | null;
};

export function getUserLedger(userId: number): LedgerEntry[] {
  return db
    .prepare(
      `SELECT l.id, l.match_id, l.pick, l.stake, l.d_used, l.won, l.delta, l.created_at,
              m.stage, m.kickoff_at, m.coke_settled,
              COALESCE(ht.name_zh, ht.name, m.home_label) AS home_name,
              COALESCE(at.name_zh, at.name, m.away_label) AS away_name,
              ht.flag AS home_flag, at.flag AS away_flag
       FROM ledger l
       JOIN matches m ON m.id = l.match_id
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
       WHERE l.user_id = ?
       ORDER BY m.kickoff_at DESC`,
    )
    .all(userId) as LedgerEntry[];
}

export function getUserNet(userId: number): number {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(delta), 0) AS net FROM ledger WHERE user_id = ?",
    )
    .get(userId) as { net: number };
  return row.net;
}

/** Net split by whether each match's coke has been settled offline. */
export function getUserCokeBreakdown(userId: number): {
  settled_net: number;
  pending_net: number;
} {
  return db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN m.coke_settled = 1 THEN l.delta ELSE 0 END), 0) AS settled_net,
         COALESCE(SUM(CASE WHEN m.coke_settled = 0 THEN l.delta ELSE 0 END), 0) AS pending_net
       FROM ledger l
       JOIN matches m ON m.id = l.match_id
       WHERE l.user_id = ?`,
    )
    .get(userId) as { settled_net: number; pending_net: number };
}

export type MatchPayout = {
  user_id: number;
  nickname: string;
  avatar_url: string | null;
  emoji: string | null;
  pick: Pick;
  stake: number;
  delta: number;
};

/** Per-player payout list for one match — who hands over / receives how many bottles. */
export function getMatchPayouts(matchId: number): MatchPayout[] {
  return db
    .prepare(
      `SELECT l.user_id, u.nickname, u.avatar_url, u.emoji,
              l.pick, l.stake, l.delta
       FROM ledger l
       JOIN users u ON u.id = l.user_id
       WHERE l.match_id = ?
       ORDER BY l.delta DESC`,
    )
    .all(matchId) as MatchPayout[];
}

export type SettlementRow = {
  user_id: number;
  nickname: string;
  emoji: string | null;
  pending_net: number;
};

/** Everyone with an unsettled coke balance — the global pay-off list. */
export function getSettlementSummary(): SettlementRow[] {
  return db
    .prepare(
      `SELECT u.id AS user_id, u.nickname, u.emoji,
              COALESCE(SUM(CASE WHEN m.coke_settled = 0 THEN l.delta ELSE 0 END), 0) AS pending_net
       FROM users u
       JOIN ledger l ON l.user_id = u.id
       JOIN matches m ON m.id = l.match_id
       GROUP BY u.id
       HAVING pending_net != 0
       ORDER BY pending_net DESC`,
    )
    .all() as SettlementRow[];
}
