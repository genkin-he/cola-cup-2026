"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PICK_LABELS, allowsDraw, type Pick } from "../../lib/stage";
import { formatBottles } from "../../lib/format";
import type { SettlementPreview } from "../../lib/settlement";
import type { SettlementDetail } from "../../db/queries/settlements";

export type TodoMatch = {
  id: number;
  home: string;
  away: string;
  homeFlag: string | null;
  awayFlag: string | null;
  stageLabel: string;
  kickoffAt: number;
  votes: number;
  allowsDraw: boolean;
  isKnockout: boolean;
  result: Pick | null;
  homeScore: number | null;
  awayScore: number | null;
  voteLines: VoteLine[];
};

type VoteLine = {
  nickname: string;
  emoji: string | null;
  pick: Pick;
  stake: number;
};

const PICK_SHORT: Record<Pick, string> = { home: "主", draw: "平", away: "客" };

function VotesBreakdown({
  votes,
  home,
  away,
  allowsDraw: withDraw,
}: {
  votes: VoteLine[];
  home: string;
  away: string;
  allowsDraw: boolean;
}) {
  const groups: { key: Pick; label: string }[] = [
    { key: "home", label: home },
    ...(withDraw ? [{ key: "draw" as Pick, label: "平局" }] : []),
    { key: "away", label: away },
  ];
  return (
    <div className="adm-votes">
      {groups.map((g) => {
        const list = votes.filter((v) => v.pick === g.key);
        return (
          <div key={g.key} className="vline">
            <span className="vk">
              {PICK_SHORT[g.key]} {g.label}
            </span>
            <span className="vlist">
              {list.length === 0 ? (
                <span className="vnone">—</span>
              ) : (
                list.map((v, i) => (
                  <span key={i} className="vchip">
                    {v.emoji ?? "🙂"} {v.nickname} {v.stake}🥤
                  </span>
                ))
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const TABS = [
  { key: "todo", label: "待结算" },
  { key: "records", label: "结算记录" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PostFn = (
  url: string,
  body: object,
) => Promise<Record<string, unknown> | null>;

export function AdminPanel({
  todo,
  records,
}: {
  todo: TodoMatch[];
  records: SettlementDetail[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("todo");
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [busy, setBusy] = useState(false);

  const post: PostFn = async (url, body) => {
    setMsg(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      setMsg(`❌ ${(data.error as string) ?? "操作失败"}`);
      return null;
    }
    return data;
  };

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runPreview() {
    if (selected.size === 0) return;
    setBusy(true);
    const data = await post("/api/admin/settle", { matchIds: [...selected] });
    setBusy(false);
    if (!data) return;
    const pv = data as unknown as SettlementPreview;
    if (!pv.ok) setMsg(`❌ ${pv.error ?? "没有可结算的比赛"}`);
    else setPreview(pv);
  }

  async function confirmSettle() {
    if (!preview) return;
    setBusy(true);
    const data = await post("/api/admin/settle", {
      matchIds: preview.matches.map((m) => m.matchId),
      commit: true,
    });
    setBusy(false);
    if (!data) return;
    setPreview(null);
    setSelected(new Set());
    setTab("records");
    setMsg(`✅ 已结算 ${(data.settled as number) ?? 0} 场`);
    router.refresh();
  }

  const todoMap = useMemo(() => new Map(todo.map((m) => [m.id, m])), [todo]);

  return (
    <>
      {msg && <p className="adm-msg">{msg}</p>}

      <div className="subtabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "on" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === "todo" && todo.length > 0 ? ` (${todo.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "todo" ? (
        <>
          {todo.length === 0 ? (
            <p className="adm-empty">没有已结束待结算的比赛</p>
          ) : (
            <div>
              {todo.map((m) => (
                <TodoRow
                  key={m.id}
                  m={m}
                  checked={selected.has(m.id)}
                  onToggle={() => toggle(m.id)}
                  onPost={post}
                  onSaved={() => router.refresh()}
                />
              ))}
            </div>
          )}

          {selected.size > 0 && (
            <div className="adm-bar">
              <button
                type="button"
                className="cta"
                disabled={busy}
                onClick={runPreview}
              >
                结算选中（{selected.size} 场）
              </button>
            </div>
          )}
        </>
      ) : (
        <RecordsList records={records} />
      )}

      {preview && (
        <PreviewSheet
          preview={preview}
          todoMap={todoMap}
          busy={busy}
          onConfirm={confirmSettle}
          onCancel={() => setPreview(null)}
        />
      )}
    </>
  );
}

function TodoRow({
  m,
  checked,
  onToggle,
  onPost,
  onSaved,
}: {
  m: TodoMatch;
  checked: boolean;
  onToggle: () => void;
  onPost: PostFn;
  onSaved: () => void;
}) {
  const [h, setH] = useState(m.homeScore != null ? String(m.homeScore) : "");
  const [a, setA] = useState(m.awayScore != null ? String(m.awayScore) : "");
  const [koWinner, setKoWinner] = useState<Pick | null>(
    m.result === "home" || m.result === "away" ? m.result : null,
  );
  const [saving, setSaving] = useState(false);
  const [showVotes, setShowVotes] = useState(false);

  const hn = h.trim() === "" ? null : Number(h);
  const an = a.trim() === "" ? null : Number(a);
  const validScore =
    hn != null && an != null && Number.isFinite(hn) && Number.isFinite(an);
  const koTie = validScore && hn === an && !m.allowsDraw;
  const derived: Pick | null = !validScore
    ? null
    : hn! > an!
      ? "home"
      : hn! < an!
        ? "away"
        : m.allowsDraw
          ? "draw"
          : koWinner;

  async function save() {
    setSaving(true);
    const data = await onPost("/api/admin/score", {
      matchId: m.id,
      homeScore: hn,
      awayScore: an,
      result: koTie ? koWinner ?? undefined : undefined,
    });
    setSaving(false);
    if (data) onSaved();
  }

  const resultLabel = derived
    ? derived === "home"
      ? m.home
      : derived === "away"
        ? m.away
        : "平局"
    : null;

  return (
    <div className="adm-item">
      <input
        type="checkbox"
        className="adm-chk"
        checked={checked}
        disabled={m.result == null}
        onChange={onToggle}
        title={m.result == null ? "先保存比分再结算" : undefined}
      />
      <div>
        <div className="tm">
          {m.homeFlag ?? ""} {m.home} vs {m.away} {m.awayFlag ?? ""}
        </div>
        <div className="sub">
          {m.stageLabel} · {fmtTime(m.kickoffAt)} · {m.votes} 票
          {m.result == null && " · 未录入赛果"}
        </div>

        <div className="adm-edit">
          <input
            className="adm-score"
            value={h}
            onChange={(e) => setH(e.target.value)}
            placeholder="主"
          />
          <span className="adm-colon">:</span>
          <input
            className="adm-score"
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="客"
          />

          {koTie && (
            <>
              <span className="adm-mini">晋级</span>
              {(["home", "away"] as Pick[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={"adm-pill" + (koWinner === k ? " on" : "")}
                  onClick={() => setKoWinner(k)}
                >
                  {k === "home" ? m.home : m.away}
                </button>
              ))}
            </>
          )}

          {resultLabel && (
            <span className="adm-tag">
              赛果：<b>{resultLabel}</b>
            </span>
          )}

          <button
            type="button"
            className="adm-btn"
            onClick={save}
            disabled={saving || !validScore || (koTie && !koWinner)}
          >
            保存比分
          </button>
        </div>

        <button
          type="button"
          className="adm-toggle"
          onClick={() => setShowVotes((s) => !s)}
        >
          {showVotes ? "隐藏投票" : `投票明细（${m.voteLines.length}）`}
        </button>
        {showVotes && (
          <VotesBreakdown
            votes={m.voteLines}
            home={m.home}
            away={m.away}
            allowsDraw={m.allowsDraw}
          />
        )}
      </div>
    </div>
  );
}

function PreviewSheet({
  preview,
  todoMap,
  busy,
  onConfirm,
  onCancel,
}: {
  preview: SettlementPreview;
  todoMap: Map<number, TodoMatch>;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const receivers = preview.users.filter((u) => u.recv > 0);
  const buyers = preview.users.filter((u) => u.owe > 0);

  return (
    <div className="adm-modal" onClick={onCancel}>
      <div className="adm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="top">
          <h3>结算预览</h3>
          <span className="cnt">{preview.matches.length} 场</span>
        </div>

        {preview.matches.map((pm) => {
          const tm = todoMap.get(pm.matchId);
          const r =
            pm.result === "home"
              ? tm?.home ?? "主胜"
              : pm.result === "away"
                ? tm?.away ?? "客胜"
                : "平局";
          return (
            <div key={pm.matchId} className="adm-match">
              <span className="nm">
                {tm ? `${tm.home} vs ${tm.away}` : `#${pm.matchId}`}
              </span>
              <span className="sc">
                {pm.homeScore ?? "-"}:{pm.awayScore ?? "-"} · {r}
              </span>
            </div>
          );
        })}

        {preview.skipped.length > 0 && (
          <p className="adm-skip">
            跳过 {preview.skipped.length} 场（{preview.skipped[0].reason} 等）
          </p>
        )}

        <hr className="adm-divider" />

        {preview.users.length === 0 ? (
          <p className="adm-empty">本批无人下注。</p>
        ) : (
          <>
            {receivers.length > 0 && (
              <div className="adm-grp">
                <p className="lbl">应发放（赢家收）</p>
                {receivers.map((u) => (
                  <div key={u.userId} className="adm-pay">
                    <span className="who">
                      {u.emoji ?? "🙂"} {u.nickname}
                    </span>
                    <span className="amt recv">收 {u.recv} 瓶</span>
                  </div>
                ))}
              </div>
            )}
            {buyers.length > 0 && (
              <div className="adm-grp">
                <p className="lbl">应收取（输家买）</p>
                {buyers.map((u) => (
                  <div key={u.userId} className="adm-pay">
                    <span className="who">
                      {u.emoji ?? "🙂"} {u.nickname}
                    </span>
                    <span className="amt owe">买 {u.owe} 瓶</span>
                  </div>
                ))}
              </div>
            )}
            <div className="adm-pool">
              <span className="l">🏦 平台可乐池</span>
              <span className="v">{preview.platformBottles} 瓶</span>
            </div>
          </>
        )}

        <div className="adm-actions">
          <button
            type="button"
            className="cta"
            disabled={busy}
            onClick={onConfirm}
          >
            确定结算
          </button>
          <button type="button" className="adm-btn" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordsList({ records }: { records: SettlementDetail[] }) {
  if (records.length === 0) {
    return <p className="adm-empty">还没有结算记录</p>;
  }
  return (
    <div>
      {records.map((r) => (
        <RecordCard key={r.id} rec={r} />
      ))}
    </div>
  );
}

function RecordCard({ rec }: { rec: SettlementDetail }) {
  const [open, setOpen] = useState(false);
  const bottles = rec.users.reduce((sum, u) => sum + u.recv, 0);

  return (
    <div className="adm-rec">
      <button type="button" className="head" onClick={() => setOpen((o) => !o)}>
        <span>
          <span className="id">结算 #{rec.id}</span>
          <span className="when">{fmtTime(rec.created_at)}</span>
        </span>
        <span className="meta">
          {rec.match_count} 场 · {rec.users.length} 人 · {bottles} 瓶{" "}
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="body">
          {rec.matches.map((mm) => (
            <div key={mm.matchId} className="adm-mblock">
              <div className="adm-match">
                <span className="nm">
                  {mm.homeFlag ?? ""} {mm.home} vs {mm.away} {mm.awayFlag ?? ""}
                </span>
                <span className="sc">
                  {mm.homeScore ?? "-"}:{mm.awayScore ?? "-"} ·{" "}
                  {mm.result ? PICK_LABELS[mm.result] : "—"}
                </span>
              </div>
              {mm.votes.length > 0 && (
                <VotesBreakdown
                  votes={mm.votes}
                  home={mm.home}
                  away={mm.away}
                  allowsDraw={allowsDraw(mm.stage)}
                />
              )}
            </div>
          ))}

          <hr className="adm-divider" />

          {rec.users.length === 0 ? (
            <p className="adm-empty">本批无人下注。</p>
          ) : (
            rec.users.map((u) => (
              <div key={u.userId} className="adm-pay">
                <span className="who">
                  {u.emoji ?? "🙂"} {u.nickname}
                </span>
                <span className="amt">
                  <span className="raw">{formatBottles(u.net)}</span>
                  {" → "}
                  <span
                    className={u.recv > 0 ? "recv" : u.owe > 0 ? "owe" : "zero"}
                  >
                    {u.recv > 0
                      ? `收 ${u.recv} 瓶`
                      : u.owe > 0
                        ? `买 ${u.owe} 瓶`
                        : "持平"}
                  </span>
                </span>
              </div>
            ))
          )}

          <div className="adm-pool">
            <span className="l">🏦 平台可乐池</span>
            <span className="v">{rec.platformBottles} 瓶</span>
          </div>
        </div>
      )}
    </div>
  );
}
