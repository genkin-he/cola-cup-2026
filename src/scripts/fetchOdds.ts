import { db } from "../db/client";
import { priceToDecimal } from "../lib/decimalOdds";
import {
  buildMatchIndex,
  isMoneylineEvent,
  matchEvent,
  type PolyEvent,
  type PolyMarket,
  type MatchedOdds,
} from "./matchPolymarket";

const GAMMA = "https://gamma-api.polymarket.com";
const WORLD_CUP_SERIES_ID = "11433";
const PAGE_SIZE = 100;

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

type RawMarket = {
  slug: string;
  question: string;
  outcomes: unknown;
  outcomePrices: unknown;
  clobTokenIds: unknown;
  conditionId?: string;
};

function shapeEvent(raw: {
  id: string | number;
  slug: string;
  title: string;
  markets?: RawMarket[];
}): PolyEvent {
  const markets: PolyMarket[] = (raw.markets ?? []).map((m) => ({
    slug: m.slug,
    question: m.question,
    outcomes: parseJsonArray(m.outcomes),
    outcomePrices: parseJsonArray(m.outcomePrices),
    clobTokenIds: parseJsonArray(m.clobTokenIds),
    conditionId: m.conditionId,
  }));
  return { id: String(raw.id), slug: raw.slug, title: raw.title, markets };
}

async function fetchAllEvents(): Promise<PolyEvent[]> {
  const events: PolyEvent[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = `${GAMMA}/events?series_id=${WORLD_CUP_SERIES_ID}&limit=${PAGE_SIZE}&offset=${offset}&closed=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Gamma events ${res.status}`);
    const data = (await res.json()) as unknown;
    const page = Array.isArray(data)
      ? data
      : ((data as { data?: unknown[] }).data ?? []);
    if (page.length === 0) break;
    for (const raw of page) events.push(shapeEvent(raw as never));
    if (page.length < PAGE_SIZE) break;
  }
  return events;
}

function writeOdds(matched: MatchedOdds[]): void {
  const now = Date.now();
  const upsertMarket = db.prepare(`
    INSERT INTO poly_markets
      (match_id, event_id, slug, condition_id, token_home, token_draw, token_away,
       match_method, match_score, closed, updated_at)
    VALUES
      (@matchId, @eventId, @slug, @conditionId, @tokenHome, @tokenDraw, @tokenAway,
       'auto', @score, 0, @now)
    ON CONFLICT(match_id) DO UPDATE SET
      event_id = excluded.event_id,
      slug = excluded.slug,
      condition_id = excluded.condition_id,
      token_home = excluded.token_home,
      token_draw = excluded.token_draw,
      token_away = excluded.token_away,
      match_score = excluded.match_score,
      updated_at = excluded.updated_at
  `);

  const insertSnapshot = db.prepare(`
    INSERT INTO odds_snapshot
      (match_id, source, is_locked, p_home, p_draw, p_away, d_home, d_draw, d_away, taken_at)
    VALUES
      (@matchId, 'polymarket', 0, @pHome, @pDraw, @pAway, @dHome, @dDraw, @dAway, @now)
  `);

  const write = db.transaction((rows: MatchedOdds[]) => {
    for (const row of rows) {
      upsertMarket.run({
        matchId: row.matchId,
        eventId: row.eventId,
        slug: row.slug,
        conditionId: row.conditionId,
        tokenHome: row.tokenHome,
        tokenDraw: row.tokenDraw,
        tokenAway: row.tokenAway,
        score: row.score,
        now,
      });
      insertSnapshot.run({
        matchId: row.matchId,
        pHome: row.pHome,
        pDraw: row.pDraw,
        pAway: row.pAway,
        dHome: priceToDecimal(row.pHome),
        dDraw: row.pDraw == null ? null : priceToDecimal(row.pDraw),
        dAway: priceToDecimal(row.pAway),
        now,
      });
    }
  });
  write(matched);
}

async function main(): Promise<void> {
  const index = buildMatchIndex();
  const events = await fetchAllEvents();
  const moneyline = events.filter(isMoneylineEvent);

  const matched: MatchedOdds[] = [];
  let unmatched = 0;
  for (const event of moneyline) {
    const result = matchEvent(event, index);
    if (result) matched.push(result);
    else unmatched += 1;
  }

  writeOdds(matched);

  console.log(`Fetched ${events.length} world-cup events.`);
  console.log(`  moneyline events: ${moneyline.length}`);
  console.log(`  matched to fixtures: ${matched.length}`);
  console.log(`  unmatched moneyline: ${unmatched}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
