"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Pick } from "../../lib/stage";

const STAKE_CHOICES = [1, 2, 3] as const;

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

  function pickLabel(p: Pick): string {
    return picks.find((x) => x.key === p)?.label ?? p;
  }

  if (!hasIdentity) {
    return (
      <div className="vp">
        <h2 className="disp">想投票？</h2>
        <p className="signed-lock">
          先去{" "}
          <a
            href="/identity"
            style={{
              color: "var(--red)",
              borderBottom: "1px solid color-mix(in srgb,var(--red) 45%,transparent)",
            }}
          >
            设置身份
          </a>
          。
        </p>
      </div>
    );
  }

  if (!votable) {
    return (
      <div className="vp">
        <h2 className="disp">{initialPick ? "已锁定" : "未开放"}</h2>
        <p className="signed-lock">
          {initialPick ? (
            <>
              🔒 你看好 <b>{pickLabel(initialPick)}</b> · {initialStake} 瓶。
            </>
          ) : (
            <>🔒 当前无法投票（无赔率或已锁定）。</>
          )}
        </p>
      </div>
    );
  }

  const decimal = pick ? oddsDecimal[pick] ?? null : null;
  const potential =
    decimal != null && Number.isFinite(decimal) ? stake * (decimal - 1) : null;

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

  const ctaLabel = saving
    ? "投票中…"
    : saved
      ? "✅ 已记录"
      : pick
        ? `🥤 提交预测 · ${pickLabel(pick)} · ${stake} 瓶`
        : "🥤 选个看好的";

  return (
    <div className="vp">
      <h2 className="disp">你看好谁？</h2>

      <div className={picks.length === 2 ? "picks two" : "picks"}>
        {picks.map((p) => (
          <button
            key={p.key}
            type="button"
            className={"p" + (pick === p.key ? " sel" : "")}
            onClick={() => setPick(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p
        className="changenote"
        style={{
          textAlign: "left",
          color: "var(--mid)",
          fontSize: 13,
          padding: "18px 0 0",
        }}
      >
        猜错请客几瓶？
      </p>

      <div className="stakes">
        {STAKE_CHOICES.map((n) => (
          <button
            key={n}
            type="button"
            className={"s" + (stake === n ? " sel" : "")}
            onClick={() => setStake(n)}
          >
            🥤 {n}
          </button>
        ))}
      </div>

      {potential != null && pick ? (
        <p className="pot">
          猜中约赢 <b>+{potential.toFixed(1)} 瓶</b> · 按当前投票赔率
        </p>
      ) : (
        <p className="pot">选个看好的并下注</p>
      )}

      {error && <p className="formerror">{error}</p>}

      <button
        type="button"
        className="cta"
        disabled={!pick || saving}
        onClick={submit}
      >
        {ctaLabel}
      </button>

      <p className="changenote">开赛前可随时改预测</p>
    </div>
  );
}
