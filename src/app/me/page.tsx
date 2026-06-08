import Link from "next/link";
import { getUserLedger, getUserNet } from "../../db/queries/ledger";
import { getCurrentUser } from "../../lib/identity";
import { bottlesToBuy, bottlesToReceive } from "../../lib/decimalOdds";
import { formatBottles, formatKickoff } from "../../lib/format";
import { PICK_LABELS, stageLabel, type Pick } from "../../lib/stage";
import { IdentityBadge } from "../components/IdentityBadge";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-10 text-center">
        <p className="text-text-mid">你还没有身份。</p>
        <Link
          href="/identity"
          className="inline-block rounded-pill bg-coke-red px-6 py-2.5 font-semibold text-white"
        >
          🥤 设置身份
        </Link>
      </div>
    );
  }

  const ledger = getUserLedger(user.id);
  const netRaw = getUserNet(user.id);
  const owe = bottlesToBuy(netRaw);
  const recv = bottlesToReceive(netRaw);

  return (
    <div className="space-y-5">
      <header className="rounded-card border border-border bg-bg-surface p-5">
        <IdentityBadge
          avatarUrl={user.avatar_url}
          emoji={user.emoji}
          nickname={user.nickname}
          size="lg"
        />
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xs text-text-low">累计净瓶数</p>
            <p
              className={`font-display text-3xl tabular ${
                netRaw > 0 ? "text-win" : netRaw < 0 ? "text-loss" : "text-text-mid"
              }`}
            >
              {formatBottles(netRaw)} 瓶
            </p>
          </div>
          <p className="text-sm">
            {owe > 0 ? (
              <span className="text-loss">该买 {owe} 瓶可乐 🥤</span>
            ) : recv > 0 ? (
              <span className="text-win">可收 {recv} 瓶可乐</span>
            ) : (
              <span className="text-text-mid">不欠不赚</span>
            )}
          </p>
        </div>
        <p className="mt-2 text-[11px] text-text-low">
          输家应买向上取整、赢家应收向下取整，差额进平台可乐池
        </p>
      </header>

      <h2 className="font-display text-lg tracking-wide">结算明细</h2>
      {ledger.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-low">
          还没有已结算的投注。
        </p>
      ) : (
        <ul className="space-y-2">
          {ledger.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 rounded-card border border-border bg-bg-surface px-4 py-3"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${row.won ? "bg-win" : "bg-loss"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {row.home_flag ?? ""} {row.home_name} vs {row.away_name}{" "}
                  {row.away_flag ?? ""}
                </p>
                <p className="text-xs text-text-low">
                  {stageLabel(row.stage)} · 押 {PICK_LABELS[row.pick as Pick]} · {row.stake} 瓶 ·
                  赔率 {row.d_used.toFixed(2)}
                </p>
              </div>
              <span
                className={`font-display text-lg tabular ${row.delta >= 0 ? "text-win" : "text-loss"}`}
              >
                {formatBottles(row.delta)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
