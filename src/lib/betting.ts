/** Betting limits, in bottles of coke. Single source of truth — edit here to
 *  change the quick-pick presets and the allowed range (preset buttons + a free
 *  input up to MAX_STAKE). Used by the vote UI and the server-side validation. */
export const STAKE_PRESETS = [1, 3, 5] as const;
export const MIN_STAKE = 1;
export const MAX_STAKE = 10;

export function isValidStake(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_STAKE && n <= MAX_STAKE;
}
