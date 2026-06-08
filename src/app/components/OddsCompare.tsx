import { formatDecimal } from "../../lib/decimalOdds";
import type { Pick } from "../../lib/stage";
import { PICK_LABELS } from "../../lib/stage";

export type OutcomeOdds = {
  key: Pick;
  teamLabel: string;
  marketP: number | null;
  marketD: number | null;
  crowdP: number | null;
  crowdD: number | null;
};

function pct(p: number | null): string {
  return p == null ? "—" : `${Math.round(p * 100)}%`;
}

function Bar({
  p,
  color,
}: {
  p: number | null;
  color: "market" | "crowd";
}) {
  const width = p == null ? 0 : Math.round(p * 100);
  const bg = color === "market" ? "bg-market" : "bg-crowd";
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
      <span
        className={`block h-full rounded-full ${bg} transition-[width] duration-500`}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}

export function OddsCompare({
  outcomes,
  crowdTotal,
  lowSample,
  locked,
  polymarketUrl,
}: {
  outcomes: OutcomeOdds[];
  crowdTotal: number;
  lowSample: boolean;
  locked: boolean;
  polymarketUrl?: string | null;
}) {
  const hasMarket = outcomes.some((o) => o.marketP != null);

  return (
    <section className="rounded-card border border-border bg-bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg tracking-wide">赔率对比</h2>
        {locked && (
          <span className="rounded-pill bg-amber/15 px-2 py-0.5 text-[11px] text-amber">
            🔒 已锁定
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="flex items-center gap-1.5 text-market">
          <span className="h-2.5 w-2.5 rounded-full bg-market" /> ⚽ Polymarket 市场
        </span>
        <span className="flex items-center gap-1.5 text-crowd">
          <span className="h-2.5 w-2.5 rounded-full bg-crowd" /> 🥤 群众投票（结算依据）
          {crowdTotal > 0 && (
            <span className="text-text-low">· {crowdTotal} 人</span>
          )}
        </span>
        {polymarketUrl && (
          <a
            href={polymarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 rounded-pill border border-market/40 px-2 py-0.5 text-market transition hover:bg-market/10"
          >
            在 Polymarket 打开 ↗
          </a>
        )}
      </div>

      <div className="space-y-4">
        {outcomes.map((o) => {
          const diff =
            o.crowdP != null && o.marketP != null
              ? Math.round((o.crowdP - o.marketP) * 100)
              : null;
          return (
            <div key={o.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">
                  {o.teamLabel}
                  <span className="ml-1.5 text-xs text-text-low">
                    {PICK_LABELS[o.key]}
                  </span>
                </span>
                {diff != null && (
                  <span
                    className={`text-xs tabular ${
                      diff > 0
                        ? "text-up"
                        : diff < 0
                          ? "text-down"
                          : "text-flat"
                    }`}
                  >
                    {diff > 0 ? "▲+" : diff < 0 ? "▼" : ""}
                    {diff !== 0 ? `${diff}%` : "持平"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-right text-xs tabular text-market">
                  {pct(o.marketP)}
                </span>
                <Bar p={o.marketP} color="market" />
                <span className="w-12 shrink-0 text-right text-xs tabular text-text-mid">
                  {formatDecimal(o.marketD)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-right text-xs tabular text-crowd">
                  {pct(o.crowdP)}
                </span>
                <Bar p={o.crowdP} color="crowd" />
                <span className="w-12 shrink-0 text-right text-xs tabular text-text-mid">
                  {formatDecimal(o.crowdD)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {!hasMarket && (
        <p className="mt-3 text-xs text-text-low">
          Polymarket 暂未对该场开盘（不影响结算，结算以群众投票赔率为准）。
        </p>
      )}
      {lowSample && crowdTotal > 0 && (
        <p className="mt-3 text-xs text-text-low">群众样本不足，赔率仅供参考。</p>
      )}
    </section>
  );
}
