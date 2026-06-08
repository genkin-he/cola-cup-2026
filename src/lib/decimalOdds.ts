const MIN_PROB = 0.001;
const MAX_PROB = 0.999;

export function clampProb(price: number): number {
  if (!Number.isFinite(price)) return MIN_PROB;
  return Math.min(MAX_PROB, Math.max(MIN_PROB, price));
}

export function priceToDecimal(price: number): number {
  return 1 / clampProb(price);
}

/**
 * Platform rake via asymmetric rounding: losers round their owed bottles UP,
 * winners round their received bottles DOWN. The gap accrues to the house pool.
 */

/** Bottles a net-loser must buy — rounded up (house-favouring). */
export function bottlesToBuy(net: number): number {
  return net < 0 ? Math.ceil(Math.abs(net)) : 0;
}

/** Bottles a net-winner receives — rounded down (house-favouring). */
export function bottlesToReceive(net: number): number {
  return net > 0 ? Math.floor(net) : 0;
}

/** The platform's coke pool = bottles bought by losers − bottles paid to winners. */
export function platformPool(nets: number[]): number {
  let pool = 0;
  for (const net of nets) pool += bottlesToBuy(net) - bottlesToReceive(net);
  return pool;
}

export function formatDecimal(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}
