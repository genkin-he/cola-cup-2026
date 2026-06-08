"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MatchStatus } from "../../lib/matchState";
import type { Pick } from "../../lib/stage";
import { StatusBadge } from "./StatusBadge";

export type RowVM = {
  id: number;
  kickoffAt: number;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  stageLabel: string;
  stageKey: string;
  groupKey: string | null;
  groupName: string | null;
  status: MatchStatus;
  home: { name: string; flag: string | null };
  away: { name: string; flag: string | null };
  settled: boolean;
  homeScore: number | null;
  awayScore: number | null;
  resultPick: Pick | null;
  market: { home: number | null; draw: number | null; away: number | null } | null;
  crowd: {
    homePct: number;
    drawPct: number;
    awayPct: number;
    voters: number;
    leaderPick: Pick | null;
    leaderPct: number | null;
  };
  countdown: string;
  isLive: boolean;
};

type StatusFilter = "all" | "open" | "done";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "open", label: "仅可投票" },
  { value: "done", label: "已结束" },
];

const PICK_SHORT: Record<Pick, string> = { home: "主", draw: "平", away: "客" };
const RESULT_LABEL: Record<Pick, string> = {
  home: "主胜",
  draw: "平局",
  away: "客胜",
};
const DIVERGENCE_HOT_THRESHOLD = 10;
const DIVERGENCE_TIP =
  "市场（聪明钱）与同事看法分歧大 —— 用同事赔率下注可能赢更多可乐";

function matchesStatus(status: MatchStatus, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "open") return status === "open";
  return status === "settled" || status === "locked";
}

function dayKeyOffset(todayKey: string, offsetDays: number): string {
  const [y, m, d] = todayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayHeading(
  dateKey: string,
  todayKey: string,
): { primary: string; isToday: boolean } {
  if (dateKey === todayKey) return { primary: "今天", isToday: true };
  if (dateKey === dayKeyOffset(todayKey, 1)) return { primary: "明天", isToday: false };
  if (dateKey === dayKeyOffset(todayKey, -1)) return { primary: "昨天", isToday: false };
  return { primary: "", isToday: false };
}

function MatchMeta({ row }: { row: RowVM }) {
  return (
    <div className="meta">
      <span className="time">{row.timeLabel}</span>
      <span>·</span>
      <span>
        {row.stageLabel}
        {row.groupKey ? ` ${row.groupKey}` : ""}
      </span>
      <StatusBadge status={row.status} className="meta-badge" />
    </div>
  );
}

function MatchTeams({ row }: { row: RowVM }) {
  const middle =
    row.settled && row.homeScore != null && row.awayScore != null
      ? `${row.homeScore}–${row.awayScore}`
      : "VS";
  return (
    <div className="teams">
      <span className="t">
        <span className="flag">{row.home.flag ?? "🏳️"}</span>
        <span className="nm">{row.home.name}</span>
      </span>
      <span className="x">{middle}</span>
      <span className="t">
        <span className="flag">{row.away.flag ?? "🏳️"}</span>
        <span className="nm">{row.away.name}</span>
      </span>
    </div>
  );
}

function pickMarketLeader(
  market: { home: number | null; draw: number | null; away: number | null },
): { pick: Pick; pct: number } | null {
  const entries: [Pick, number | null][] = [
    ["home", market.home],
    ["draw", market.draw],
    ["away", market.away],
  ];
  let best: { pick: Pick; pct: number } | null = null;
  for (const [pick, pct] of entries) {
    if (pct == null) continue;
    if (!best || pct > best.pct) best = { pick, pct };
  }
  return best;
}

function crowdPctFor(row: RowVM, pick: Pick): number | null {
  if (row.crowd.voters === 0) return null;
  return pick === "home"
    ? row.crowd.homePct
    : pick === "draw"
      ? row.crowd.drawPct
      : row.crowd.awayPct;
}

function MatchBig({ row }: { row: RowVM }) {
  if (row.settled && row.resultPick) {
    return (
      <div className="big">
        <div className="pct score">{RESULT_LABEL[row.resultPick]}</div>
        <div className="cap">已结算</div>
      </div>
    );
  }

  const marketLeader = row.market ? pickMarketLeader(row.market) : null;
  if (marketLeader) {
    const crowdPct = crowdPctFor(row, marketLeader.pick);
    const diff =
      crowdPct != null ? marketLeader.pct - crowdPct : null;
    let dv: React.ReactNode = null;
    if (diff != null) {
      const absDiff = Math.abs(diff);
      if (absDiff >= DIVERGENCE_HOT_THRESHOLD) {
        const lead = diff > 0 ? "市场更看好" : "同事更看好";
        dv = (
          <div className="dv hot">
            <span
              className="spark"
              data-tip={DIVERGENCE_TIP}
              tabIndex={0}
              role="button"
              aria-label="分歧说明"
            >
              ⚡
            </span>
            {lead} +{absDiff}
          </div>
        );
      } else {
        dv = <div className="dv aligned">同事 {crowdPct}% · 看法接近</div>;
      }
    }
    return (
      <div className="big">
        <div className="srclbl">市场·{PICK_SHORT[marketLeader.pick]}</div>
        <div className="pct">{marketLeader.pct}%</div>
        {dv}
      </div>
    );
  }

  if (row.crowd.leaderPick && row.crowd.leaderPct != null) {
    const pick = row.crowd.leaderPick;
    return (
      <div className="big">
        <div className="srclbl cr">同事·{PICK_SHORT[pick]}</div>
        <div className="pct">{row.crowd.leaderPct}%</div>
        <div className="cap">暂无市场对照</div>
      </div>
    );
  }

  return (
    <div className="big">
      <div className="cap">暂无赔率</div>
    </div>
  );
}

function MatchRow({ row }: { row: RowVM }) {
  const linkable = row.status !== "scheduled" && row.status !== "upcoming";
  const inner = (
    <>
      <MatchMeta row={row} />
      <MatchTeams row={row} />
      <MatchBig row={row} />
    </>
  );
  if (linkable) {
    return (
      <Link href={`/match/${row.id}`} className="mrow">
        {inner}
      </Link>
    );
  }
  return <div className="mrow no-link">{inner}</div>;
}

export function ScheduleTimeline({
  rows,
  todayKey,
}: {
  rows: RowVM[];
  todayKey: string;
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const visible = useMemo(
    () => rows.filter((r) => matchesStatus(r.status, filter)),
    [rows, filter],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, RowVM[]>();
    for (const row of visible) {
      const list = map.get(row.dateKey) ?? [];
      list.push(row);
      map.set(row.dateKey, list);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <>
      <hr className="rule ink" />
      <div className="subtabs">
        {FILTER_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={filter === o.value ? "on" : ""}
            onClick={() => setFilter(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {byDate.length === 0 ? (
        <p
          style={{
            padding: "40px 0",
            textAlign: "center",
            color: "var(--low)",
            fontSize: 13,
          }}
        >
          没有符合条件的比赛
        </p>
      ) : (
        byDate.map(([key, dayRows]) => {
          const heading = dayHeading(key, todayKey);
          const primary = heading.primary || dayRows[0].dateLabel;
          const secondary = heading.primary
            ? `${dayRows[0].dateLabel} · ${dayRows.length} 场`
            : `${dayRows.length} 场`;
          return (
            <section key={key}>
              <div className="daylabel">
                <span className={`big${heading.isToday ? " today" : ""}`}>
                  {primary}
                </span>
                <span className="sm">{secondary}</span>
              </div>
              {dayRows.map((row, idx) => (
                <div key={row.id}>
                  {idx === 0 && <hr className="rule" />}
                  <MatchRow row={row} />
                  <hr className="rule" />
                </div>
              ))}
            </section>
          );
        })
      )}
    </>
  );
}
