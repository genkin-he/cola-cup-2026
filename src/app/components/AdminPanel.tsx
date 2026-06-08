"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Pick } from "../../lib/stage";

export type AdminMatch = {
  id: number;
  label: string;
  stageLabel: string;
  kickoffAt: number;
  settled: boolean;
  hasOdds: boolean;
  votes: number;
  picks: { key: Pick; label: string }[];
  allowsDraw: boolean;
  result: string | null;
};

const TOKEN_KEY = "cup_admin_token";

export function AdminPanel({ matches }: { matches: AdminMatch[] }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [filter, setFilter] = useState<"todo" | "settled">("todo");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY) ?? "");
  }, []);

  function saveToken(value: string) {
    setToken(value);
    localStorage.setItem(TOKEN_KEY, value);
  }

  async function post(url: string, body: object): Promise<boolean> {
    setMsg(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, adminToken: token }),
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
    .filter((m) => (filter === "settled" ? m.settled : !m.settled))
    .sort((a, b) => a.kickoffAt - b.kickoffAt);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border bg-bg-surface p-4">
        <label className="mb-1.5 block text-sm text-text-mid">管理员口令</label>
        <input
          type="password"
          value={token}
          onChange={(e) => saveToken(e.target.value)}
          placeholder="ADMIN_TOKEN"
          className="w-full rounded-pill border border-border bg-bg-base px-4 py-2 text-sm outline-none focus:border-coke-red"
        />
      </div>

      {msg && <p className="text-sm">{msg}</p>}

      <div className="flex gap-1.5">
        {(["todo", "settled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-pill px-3 py-1.5 text-sm ${
              filter === f
                ? "bg-coke-red text-white"
                : "bg-bg-surface text-text-mid"
            }`}
          >
            {f === "todo" ? "待处理" : "已结算"}
          </button>
        ))}
      </div>

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
    </div>
  );
}
