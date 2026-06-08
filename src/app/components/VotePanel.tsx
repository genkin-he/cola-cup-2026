"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Pick } from "../../lib/stage";
import { STAKE_PRESETS, MIN_STAKE, MAX_STAKE } from "../../lib/betting";

export type VotePanelProps = {
  matchId: number;
  picks: { key: Pick; label: string }[];
  oddsDecimal: Partial<Record<Pick, number | null>>;
  votable: boolean;
  hasIdentity: boolean;
  initialPick: Pick | null;
  initialStake: number | null;
  nextMatchId: number | null;
};

export function VotePanel({
  matchId,
  picks,
  oddsDecimal,
  votable,
  hasIdentity,
  initialPick,
  initialStake,
  nextMatchId,
}: VotePanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pick, setPick] = useState<Pick | null>(initialPick);
  const [stake, setStake] = useState<number>(initialStake ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState<{ pick: Pick; stake: number } | null>(
    initialPick ? { pick: initialPick, stake: initialStake ?? 1 } : null,
  );

  function pickLabel(p: Pick): string {
    return picks.find((x) => x.key === p)?.label ?? p;
  }

  if (!hasIdentity) {
    return (
      <div className="vp">
        <h2 className="disp">想预测？</h2>
        <p className="signed-lock">
          先去{" "}
          <Link
            href="/identity"
            style={{
              color: "var(--red)",
              borderBottom: "1px solid color-mix(in srgb,var(--red) 45%,transparent)",
            }}
          >
            设置身份
          </Link>
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
            <>🔒 当前无法预测（无赔率或已锁定）。</>
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
      setError(data.error ?? "预测失败");
      return;
    }
    setSaved(true);
    setConfirmed({ pick, stake });
    startTransition(() => router.refresh());
    setTimeout(() => setSaved(false), 1800);
  }

  const ctaLabel = saving
    ? "预测中…"
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
        猜错请客几瓶？（预设或自定义，最多 {MAX_STAKE}）
      </p>

      <div className="stakes">
        {STAKE_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            className={"s" + (stake === n ? " sel" : "")}
            onClick={() => setStake(n)}
          >
            🥤 {n}
          </button>
        ))}
        <input
          type="number"
          inputMode="numeric"
          min={MIN_STAKE}
          max={MAX_STAKE}
          value={stake}
          onChange={(e) => {
            const n = Math.floor(Number(e.target.value));
            if (!Number.isFinite(n)) return;
            setStake(Math.max(MIN_STAKE, Math.min(MAX_STAKE, n)));
          }}
          aria-label={`自定义瓶数（最多 ${MAX_STAKE}）`}
          className={
            "s sin" +
            ((STAKE_PRESETS as readonly number[]).includes(stake) ? "" : " sel")
          }
        />
      </div>

      {potential != null && pick ? (
        <p className="pot">
          猜中约赢 <b>+{potential.toFixed(2)} 瓶</b> · 按当前预测赔率
          <br />
          <span style={{ color: "var(--low)", fontSize: 12 }}>
            实发按整瓶向下取整，约 {Math.floor(potential)} 瓶
            {potential < 1 ? "（不足 1 瓶，可能为 0）" : ""}
          </span>
        </p>
      ) : (
        <p className="pot">选个看好的并下注</p>
      )}

      {confirmed && (
        <div className={"vp-status" + (saved ? " just" : "")}>
          <span className="vp-status-ic">✅</span>
          <span className="vp-status-tx">
            当前预测 <b>{pickLabel(confirmed.pick)}</b> · {confirmed.stake} 瓶
          </span>
          {(confirmed.pick !== pick || confirmed.stake !== stake) && (
            <span className="vp-status-dirty">改动待保存</span>
          )}
        </div>
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

      <div className="vp-foot">
        {nextMatchId != null ? (
          <Link
            href={`/match/${nextMatchId}`}
            className={"vp-back" + (saved ? " go" : "")}
          >
            下一场 <span className="bk-arrow">→</span>
          </Link>
        ) : (
          <Link
            href={`/#m-${matchId}`}
            className={"vp-back" + (saved ? " go" : "")}
          >
            <span className="bk-arrow">←</span> 返回赛程
          </Link>
        )}
        <span className="vp-hint">开赛前可随时改预测</span>
      </div>
    </div>
  );
}
