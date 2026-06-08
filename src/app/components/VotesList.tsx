import type { VoteDetail } from "../../db/queries/votes";
import { PICK_LABELS, type Pick } from "../../lib/stage";
import { Avatar } from "./Avatar";

const PICK_TONE: Record<Pick, string> = {
  home: "text-win",
  draw: "text-draw",
  away: "text-loss",
};

export function VotesList({
  votes,
  teamLabel,
  result,
  settled,
}: {
  votes: VoteDetail[];
  teamLabel: Record<Pick, string>;
  result: Pick | null;
  settled: boolean;
}) {
  return (
    <section className="rounded-card border border-border bg-bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg tracking-wide">谁押了什么</h2>
        <span className="text-xs text-text-low">{votes.length} 人</span>
      </div>

      {votes.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-low">
          还没有人投票，来当第一个 🥤
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {votes.map((v) => {
            const won = settled && result ? v.pick === result : null;
            return (
              <li
                key={v.user_id}
                className="flex items-center gap-3 py-2.5"
              >
                <Avatar
                  avatarUrl={v.avatar_url}
                  emoji={v.emoji}
                  nickname={v.nickname}
                  size="sm"
                />

                <span className="min-w-0 flex-1 truncate text-sm">
                  {v.nickname}
                </span>
                <span className={`text-sm font-medium ${PICK_TONE[v.pick]}`}>
                  {teamLabel[v.pick]}
                  <span className="ml-1 text-xs text-text-low">
                    {PICK_LABELS[v.pick]}
                  </span>
                </span>
                <span className="w-14 text-right text-sm tabular text-text-mid">
                  🥤 {v.stake}
                </span>
                {won != null && (
                  <span
                    className={`w-8 text-right text-sm ${won ? "text-win" : "text-loss"}`}
                  >
                    {won ? "✓" : "✗"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
