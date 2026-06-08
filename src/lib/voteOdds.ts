import type { VoteTally } from "../db/queries/votes";
import { priceToDecimal } from "./decimalOdds";

const MIN_SAMPLE = 3;

export type VoteOdds = {
  p_home: number;
  p_draw: number | null;
  p_away: number;
  d_home: number;
  d_draw: number | null;
  d_away: number;
  total: number;
  lowSample: boolean;
};

/**
 * Stake-weighted crowd implied probability: each outcome's share of total
 * bottles wagered (betting more on an outcome lowers its odds, diluting your
 * own multiplier). Laplace-smoothed by 1 bottle so a zero-stake outcome still
 * yields a finite decimal. This is the settlement basis.
 */
export function computeVoteOdds(
  tally: VoteTally,
  allowsDraw: boolean,
): VoteOdds | null {
  if (tally.stakeTotal === 0) return null;

  const outcomes = allowsDraw ? 3 : 2;
  const smoothedTotal = tally.stakeTotal + outcomes;
  const pHome = (tally.home + 1) / smoothedTotal;
  const pAway = (tally.away + 1) / smoothedTotal;
  const pDraw = allowsDraw ? (tally.draw + 1) / smoothedTotal : null;

  return {
    p_home: pHome,
    p_draw: pDraw,
    p_away: pAway,
    d_home: priceToDecimal(pHome),
    d_draw: pDraw == null ? null : priceToDecimal(pDraw),
    d_away: priceToDecimal(pAway),
    total: tally.voters,
    lowSample: tally.voters < MIN_SAMPLE,
  };
}
