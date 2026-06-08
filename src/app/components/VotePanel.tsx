"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Pick } from "../../lib/stage";

const STAKE_CHOICES = [1, 2, 3] as const;

const PICK_TONE: Record<Pick, string> = {
  home: "ring-win text-win",
  draw: "ring-draw text-draw",
  away: "ring-loss text-loss",
};

export type VotePanelProps = {
  matchId: number;
  picks: { key: Pick; label: string }[];
  oddsDecimal: Partial<Record<Pick, number | null>>;
  votable: boolean;
  hasIdentity: boolean;
  initialPick: Pick | null;
  initialStake: number | null;
};

export function VotePanel({
  matchId,
  picks,
  oddsDecimal,
  votable,
  hasIdentity,
  initialPick,
  initialStake,
}: VotePanelProps) {
  const router = useRouter();
  const [pick, setPick] = useState<Pick | null>(initialPick);
  const [stake, setStake] = useState<number>(initialStake ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const decimal = pick ? oddsDecimal[pick] ?? null : null;
  const potential =
    decimal != null && Number.isFinite(decimal)
      ? stake * (decimal - 1)
      : null;

  async function submit() {
    if (!pick) return;
    setError(null);
    setSaving(true);
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, pick, stake }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "投票失败");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1800);
  }

  if (!hasIdentity) {
    return (
      <section className="rounded-card border border-border bg-bg-surface p-4">
        <p className="text-sm text-text-mid">
          想投票？先去
          <a href="/identity" className="mx-1 text-coke-red underline">
            设置身份
          </a>
          。
        </p>
      </section>
    );
  }

  if (!votable) {
    return (
      <section className="rounded-card border border-border bg-bg-surface p-4 text-sm text-text-mid">
        {initialPick ? (
          <p>
            🔒 已锁盘，你押了
            <span className="mx-1 font-semibold text-text-hi">
              {picks.find((p) => p.key === initialPick)?.label}
            </span>
            · {initialStake} 瓶。
          </p>
        ) : (
          <p>🔒 当前无法投票（无盘口或已锁盘）。</p>
        )}
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-card border border-border bg-bg-surface p-4">
      <h2 className="mb-3 font-display text-lg tracking-wide">你押谁？</h2>

      <div
        className={`grid gap-2 ${picks.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {picks.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPick(p.key)}
            className={`rounded-xl border px-2 py-3 text-sm font-semibold transition ${
              pick === p.key
                ? `border-transparent bg-bg-elevated ring-2 ${PICK_TONE[p.key]}`
                : "border-border text-text-mid hover:border-border-hi"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="mt-4 mb-2 text-sm text-text-mid">下注几瓶可乐？</p>
      <div className="grid grid-cols-3 gap-2">
        {STAKE_CHOICES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStake(s)}
            className={`rounded-pill border px-2 py-2 text-sm tabular transition ${
              stake === s
                ? "border-transparent bg-coke-red text-white"
                : "border-border text-text-mid hover:border-border-hi"
            }`}
          >
            🥤 {s}
          </button>
        ))}
      </div>

      {potential != null && (
        <p className="mt-4 text-sm text-text-mid">
          押中约赢
          <span className="mx-1 font-semibold tabular text-win">
            +{potential.toFixed(1)} 瓶
          </span>
          <span className="text-text-low">（按当前投票赔率，开赛前 1 小时锁定）</span>
        </p>
      )}

      {error && <p className="mt-2 text-sm text-loss">{error}</p>}

      <button
        type="button"
        disabled={!pick || saving}
        onClick={submit}
        className="mt-3 w-full rounded-pill bg-coke-red px-4 py-3 font-semibold text-white shadow-[0_0_24px_rgba(244,0,9,0.35)] transition hover:bg-coke-red-700 disabled:opacity-40 disabled:shadow-none"
      >
        {saving
          ? "投票中…"
          : saved
            ? "✅ 已记录"
            : initialPick
              ? "🥤 改投"
              : "🥤 投！"}
      </button>
      {initialPick && (
        <p className="mt-2 text-center text-xs text-text-low">
          开赛前可随时改票
        </p>
      )}
    </section>
  );
}
