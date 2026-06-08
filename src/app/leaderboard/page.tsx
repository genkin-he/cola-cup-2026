import { getLeaderboard } from "../../db/queries/ledger";
import { getCurrentUser } from "../../lib/identity";
import { Avatar } from "../components/Avatar";
import {
  bottlesToBuy,
  bottlesToReceive,
  platformPool,
} from "../../lib/decimalOdds";
import { formatBottles } from "../../lib/format";

export const dynamic = "force-dynamic";

const RANK_BADGE = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const board = getLeaderboard();
  const me = await getCurrentUser();
  const pool = platformPool(board.map((e) => e.net_raw));

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl tracking-wide">🏆 可乐榜</h1>
        <span className="text-xs text-text-low">按累计净瓶数排序</span>
      </header>

      {pool > 0 && (
        <div className="flex items-center justify-between rounded-card border border-amber/40 bg-amber/10 px-4 py-3">
          <span className="text-sm text-amber-soft">🏦 平台可乐池</span>
          <span className="font-display text-xl tabular text-amber">
            {pool} 瓶
          </span>
        </div>
      )}

      {board.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-low">
          还没有人参与，去赛程页投出第一票吧。
        </p>
      ) : (
        <ol className="space-y-2">
          {board.map((entry, i) => {
            const owe = bottlesToBuy(entry.net_raw);
            const recv = bottlesToReceive(entry.net_raw);
            const isMe = me?.id === entry.id;
            const isLeader = i === 0 && entry.bets > 0;
            return (
              <li
                key={entry.id}
                className={`flex items-center gap-3 rounded-card border bg-bg-surface px-4 py-3 ${
                  isLeader
                    ? "border-amber shadow-[0_0_20px_rgba(255,178,0,0.25)]"
                    : isMe
                      ? "border-coke-red/50"
                      : "border-border"
                }`}
              >
                <span className="w-7 text-center font-display text-lg text-text-mid">
                  {RANK_BADGE[i] ?? i + 1}
                </span>
                <Avatar
                  avatarUrl={entry.avatar_url}
                  emoji={entry.emoji}
                  nickname={entry.nickname}
                  size="md"
                  ring={
                    entry.net_raw > 0
                      ? "border-win"
                      : entry.net_raw < 0
                        ? "border-loss"
                        : "border-border-hi"
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {entry.nickname}
                    {isMe && <span className="ml-1.5 text-xs text-coke-red">你</span>}
                  </p>
                  <p className="text-xs text-text-low">
                    {entry.bets} 场 · 猜中 {entry.wins}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-display text-xl tabular ${
                      entry.net_raw > 0
                        ? "text-win"
                        : entry.net_raw < 0
                          ? "text-loss"
                          : "text-text-mid"
                    }`}
                  >
                    {formatBottles(entry.net_raw)}
                  </p>
                  <p className="text-[11px] text-text-low">
                    {owe > 0
                      ? `欠 ${owe} 瓶 🥤`
                      : recv > 0
                        ? `收 ${recv} 瓶`
                        : "持平"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
