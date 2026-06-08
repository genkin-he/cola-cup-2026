"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PICK_LABELS, type Pick } from "../../lib/stage";
import { formatBottles } from "../../lib/format";

export type Payout = {
  nickname: string;
  emoji: string | null;
  avatarUrl: string | null;
  pick: Pick;
  delta: number;
  owe: number;
  recv: number;
};

export type AdminMatch = {
  id: number;
  label: string;
  stageLabel: string;
  kickoffAt: number;
  settled: boolean;
  cokeSettled: boolean;
  hasOdds: boolean;
  votes: number;
  picks: { key: Pick; label: string }[];
  allowsDraw: boolean;
  result: string | null;
  homeScore: number | null;
  awayScore: number | null;
  voteOdds: { home: number | null; draw: number | null; away: number | null } | null;
  platformBottles: number;
  payouts: Payout[];
};

export type SettlementSummary = {
  rows: { nickname: string; emoji: string | null; owe: number; recv: number }[];
  platformPool: number;
  pendingMatches: number;
};

const FILTERS = [
  { key: "todo", label: "待结算" },
  { key: "coke", label: "可乐总账" },
  { key: "done", label: "已完成" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function pct(p: number | null): string {
  return p == null ? "—" : `${Math.round(p * 100)}%`;
}

export function AdminPanel({
  matches,
  summary,
}: {
  matches: AdminMatch[];
  summary: SettlementSummary;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("todo");
  const [msg, setMsg] = useState<string | null>(null);

  async function post(url: string, body: object): Promise<boolean> {
    setMsg(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(`❌ ${data.error ?? "操作失败"}`);
      return false;
    }
    setMsg("✅ 操作成功");
    router.refresh();
    return true;
  }

  const visible = matches
    .filter((m) =>
      filter === "todo"
        ? !m.settled
        : filter === "coke"
          ? m.settled && !m.cokeSettled
          : m.cokeSettled,
    )
    .sort((a, b) => a.kickoffAt - b.kickoffAt);

  return (
    <div className="space-y-4">
      {msg && <p className="text-sm">{msg}</p>}

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-pill px-3 py-1.5 text-sm ${
              filter === f.key
                ? "bg-coke-red text-white"
                : "bg-bg-surface text-text-mid"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === "coke" && (
        <SettlementSummaryCard summary={summary} onPost={post} />
      )}

      <div className="space-y-3">
        {visible.map((m) => (
          <AdminRow key={m.id} match={m} onPost={post} />
        ))}
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-text-low">没有比赛</p>
        )}
      </div>
    </div>
  );
}

function SettlementSummaryCard({
  summary,
  onPost,
}: {
  summary: SettlementSummary;
  onPost: (url: string, body: object) => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const receivers = summary.rows.filter((r) => r.recv > 0);
  const buyers = summary.rows.filter((r) => r.owe > 0);

  return (
    <div className="space-y-3 rounded-card border border-amber/40 bg-amber/5 p-4">
      <div className="flex items-center justify-between">
        <span className="font-display text-base tracking-wide">🥤 可乐总账</span>
        <span className="text-xs text-text-low">{summary.pendingMatches} 场待结</span>
      </div>

      {summary.rows.length === 0 ? (
        <p className="text-sm text-text-low">当前没有待结的可乐。</p>
      ) : (
        <>
          {receivers.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-text-mid">应发放（赢家收）</p>
              <ul className="space-y-1">
                {receivers.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {r.emoji ?? "🙂"} {r.nickname}
                    </span>
                    <span className="shrink-0 text-win tabular">收 {r.recv} 瓶</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {buyers.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-text-mid">应收取（输家买）</p>
              <ul className="space-y-1">
                {buyers.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {r.emoji ?? "🙂"} {r.nickname}
                    </span>
                    <span className="shrink-0 text-loss tabular">买 {r.owe} 瓶</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="text-amber-soft">🏦 平台可乐池</span>
            <span className="text-amber tabular">{summary.platformPool} 瓶</span>
          </div>
        </>
      )}

      {summary.pendingMatches > 0 &&
        (confirming ? (
          <div className="flex gap-2">
            <button
              onClick={() =>
                onPost("/api/admin/settle-all", {}).then(() =>
                  setConfirming(false),
                )
              }
              className="flex-1 rounded-pill bg-coke-red px-4 py-2 text-sm font-medium text-white"
            >
              确认平账（{summary.pendingMatches} 场）
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-pill border border-border px-4 py-2 text-sm text-text-mid"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-full rounded-pill bg-coke-red px-4 py-2 text-sm font-medium text-white"
          >
            ✅ 全部平账
          </button>
        ))}
    </div>
  );
}

function PayoutList({
  payouts,
  voteOdds,
  platformBottles,
}: {
  payouts: Payout[];
  voteOdds: AdminMatch["voteOdds"];
  platformBottles: number;
}) {
  return (
    <div className="space-y-2">
      {voteOdds && (
        <p className="text-xs text-text-mid">
          同事赔率：主 {pct(voteOdds.home)}
          {voteOdds.draw != null && ` · 平 ${pct(voteOdds.draw)}`} · 客{" "}
          {pct(voteOdds.away)}
        </p>
      )}

      {payouts.length === 0 ? (
        <p className="text-xs text-text-low">本场无人下注。</p>
      ) : (
        <ul className="space-y-1.5">
          {payouts.map((p, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 truncate">
                {p.emoji ?? "🙂"} {p.nickname}
                <span className="ml-1 text-xs text-text-low">
                  {PICK_LABELS[p.pick]}
                </span>
              </span>
              <span className="shrink-0 tabular">
                <span className="text-text-low">{formatBottles(p.delta)}</span>
                <span className="mx-1 text-text-low">→</span>
                <span
                  className={
                    p.recv > 0
                      ? "text-win"
                      : p.owe > 0
                        ? "text-loss"
                        : "text-text-mid"
                  }
                >
                  {p.recv > 0
                    ? `收 ${p.recv} 瓶`
                    : p.owe > 0
                      ? `交 ${p.owe} 瓶`
                      : "持平"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-amber-soft">
        🏦 本场平台获得 {platformBottles} 瓶
      </p>
    </div>
  );
}

function AdminRow({
  match,
  onPost,
}: {
  match: AdminMatch;
  onPost: (url: string, body: object) => Promise<boolean>;
}) {
  const [result, setResult] = useState<Pick | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [odds, setOdds] = useState({ pHome: "", pDraw: "", pAway: "" });
  const [scoreH, setScoreH] = useState(
    match.homeScore != null ? String(match.homeScore) : "",
  );
  const [scoreA, setScoreA] = useState(
    match.awayScore != null ? String(match.awayScore) : "",
  );

  const kickoff = new Date(match.kickoffAt).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-card border border-border bg-bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{match.label}</span>
        <span className="text-xs text-text-low">
          {match.stageLabel} · {kickoff}
        </span>
      </div>
      <p className="mt-1 text-xs text-text-low">
        {match.votes} 票 · {match.hasOdds ? "有盘口" : "无盘口"}
        {match.settled && match.result && ` · 已结算：${match.result}`}
      </p>

      {!match.settled && !match.hasOdds && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-xs text-text-mid">补录赔率（概率 0–1）</p>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="主胜"
              value={odds.pHome}
              onChange={(e) => setOdds({ ...odds, pHome: e.target.value })}
              className="w-20 rounded-lg border border-border bg-bg-base px-2 py-1 text-sm"
            />
            {match.allowsDraw && (
              <input
                placeholder="平"
                value={odds.pDraw}
                onChange={(e) => setOdds({ ...odds, pDraw: e.target.value })}
                className="w-20 rounded-lg border border-border bg-bg-base px-2 py-1 text-sm"
              />
            )}
            <input
              placeholder="客胜"
              value={odds.pAway}
              onChange={(e) => setOdds({ ...odds, pAway: e.target.value })}
              className="w-20 rounded-lg border border-border bg-bg-base px-2 py-1 text-sm"
            />
            <button
              onClick={() =>
                onPost("/api/admin/odds", {
                  matchId: match.id,
                  pHome: Number(odds.pHome),
                  pDraw: match.allowsDraw ? Number(odds.pDraw) : undefined,
                  pAway: Number(odds.pAway),
                })
              }
              className="rounded-pill bg-pitch-green px-3 py-1 text-sm font-medium text-white"
            >
              保存赔率
            </button>
          </div>
        </div>
      )}

      {!match.settled && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-xs text-text-mid">录入结果</p>
          <div className="flex flex-wrap items-center gap-2">
            {match.picks.map((p) => (
              <button
                key={p.key}
                onClick={() => setResult(p.key)}
                className={`rounded-pill border px-3 py-1 text-sm ${
                  result === p.key
                    ? "border-transparent bg-amber text-bg-base"
                    : "border-border text-text-mid"
                }`}
              >
                {p.label}
              </button>
            ))}
            <input
              placeholder="主"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="w-12 rounded-lg border border-border bg-bg-base px-2 py-1 text-sm tabular"
            />
            <span className="text-text-low">:</span>
            <input
              placeholder="客"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="w-12 rounded-lg border border-border bg-bg-base px-2 py-1 text-sm tabular"
            />
            <button
              disabled={!result}
              onClick={() =>
                onPost("/api/admin/result", {
                  matchId: match.id,
                  result,
                  homeScore: homeScore === "" ? null : Number(homeScore),
                  awayScore: awayScore === "" ? null : Number(awayScore),
                })
              }
              className="rounded-pill bg-coke-red px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
            >
              结算
            </button>
          </div>
        </div>
      )}

      {match.settled && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-mid">比分</span>
            <input
              placeholder="主"
              value={scoreH}
              onChange={(e) => setScoreH(e.target.value)}
              className="w-12 rounded-lg border border-border bg-bg-base px-2 py-1 text-sm tabular"
            />
            <span className="text-text-low">:</span>
            <input
              placeholder="客"
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              className="w-12 rounded-lg border border-border bg-bg-base px-2 py-1 text-sm tabular"
            />
            <button
              onClick={() =>
                onPost("/api/admin/score", {
                  matchId: match.id,
                  homeScore: scoreH === "" ? null : Number(scoreH),
                  awayScore: scoreA === "" ? null : Number(scoreA),
                })
              }
              className="rounded-pill border border-border px-3 py-1 text-xs text-text-mid"
            >
              保存比分
            </button>
          </div>

          {!match.cokeSettled ? (
            <div>
              <p className="mb-2 text-xs text-text-mid">线下收发名单</p>
              <PayoutList
                payouts={match.payouts}
                voteOdds={match.voteOdds}
                platformBottles={match.platformBottles}
              />
              <button
                onClick={() =>
                  onPost("/api/admin/coke", { matchId: match.id, settled: true })
                }
                className="mt-3 rounded-pill bg-coke-red px-4 py-1.5 text-sm font-medium text-white"
              >
                🥤 标记可乐已结清
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-win">✅ 可乐已结清</span>
              <button
                onClick={() =>
                  onPost("/api/admin/coke", { matchId: match.id, settled: false })
                }
                className="rounded-pill border border-border px-3 py-1 text-xs text-text-mid"
              >
                撤销
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
