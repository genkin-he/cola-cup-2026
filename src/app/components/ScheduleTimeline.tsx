"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MatchStatus } from "../../lib/matchState";
import type { Pick } from "../../lib/stage";
import { StatusBadge, statusBarColor } from "./StatusBadge";

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

type StatusFilter = "all" | "open" | "scheduled" | "done";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部状态" },
  { value: "open", label: "可投票" },
  { value: "scheduled", label: "未开放" },
  { value: "done", label: "已结束" },
];

const KNOCKOUT_STAGES: { key: string; label: string }[] = [
  { key: "r32", label: "32 强" },
  { key: "r16", label: "16 强" },
  { key: "qf", label: "8 强" },
  { key: "sf", label: "半决赛" },
  { key: "third", label: "季军赛" },
  { key: "final", label: "决赛" },
];

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

const PICK_SHORT: Record<Pick, string> = { home: "主", draw: "平", away: "客" };

function matchesStatus(status: MatchStatus, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "open") return status === "open";
  if (filter === "scheduled")
    return status === "scheduled" || status === "upcoming";
  return status === "locked" || status === "settled";
}

function matchesStageOrGroup(row: RowVM, value: string): boolean {
  if (value === "all") return true;
  if (value === "stage:group") return row.stageKey === "group";
  if (value.startsWith("group:")) return row.groupKey === value.slice(6);
  if (value.startsWith("stage:")) return row.stageKey === value.slice(6);
  return true;
}

function CrowdMiniBar({ crowd }: { crowd: RowVM["crowd"] }) {
  if (crowd.voters === 0) {
    return <span className="text-xs text-text-low">暂无投票</span>;
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex h-1.5 w-16 overflow-hidden rounded-pill bg-bg-elevated">
        <span className="h-full bg-crowd" style={{ width: `${crowd.homePct}%` }} />
        <span className="h-full bg-draw" style={{ width: `${crowd.drawPct}%` }} />
        <span
          className="h-full bg-text-low"
          style={{ width: `${crowd.awayPct}%` }}
        />
      </span>
      {crowd.leaderPick && (
        <span className="text-xs tabular text-crowd">
          {crowd.leaderPct}% {PICK_SHORT[crowd.leaderPick]}
        </span>
      )}
    </span>
  );
}

function MarketOdds({ market }: { market: RowVM["market"] }) {
  if (!market) return <span className="text-xs text-text-low">暂无盘口</span>;
  const fmt = (v: number | null) => (v == null ? "—" : v);
  return (
    <span className="text-xs tabular text-market">
      ⚽ {fmt(market.home)}
      {market.draw != null && <span className="text-text-low"> {market.draw}</span>}
      <span className="text-text-low"> {fmt(market.away)}</span>
    </span>
  );
}

function TeamSide({
  flag,
  name,
  reverse,
}: {
  flag: string | null;
  name: string;
  reverse?: boolean;
}) {
  return (
    <span
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        reverse ? "flex-row-reverse justify-start text-right" : "justify-end"
      }`}
    >
      <span className="shrink-0 text-xl leading-none">{flag ?? "🏳️"}</span>
      <span className="truncate font-display text-base tracking-wide">{name}</span>
    </span>
  );
}

function MatchRow({ row }: { row: RowVM }) {
  const score =
    row.settled && row.homeScore != null
      ? `${row.homeScore}–${row.awayScore}`
      : null;

  return (
    <Link
      href={`/match/${row.id}`}
      className="group relative block overflow-hidden rounded-card border border-border bg-bg-surface px-3 py-3 transition hover:border-border-hi sm:grid sm:grid-cols-[12rem_minmax(0,1fr)_12rem] sm:items-center sm:gap-3"
    >
      <span
        className={`absolute inset-y-0 left-0 w-[3px] ${statusBarColor(row.status)}`}
      />

      {/* Col 1: time + stage/group */}
      <div className="flex items-center justify-between sm:block">
        <div className="flex items-center gap-1.5">
          {row.isLive && (
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-loss" />
          )}
          <span className="font-mono tabular text-sm text-text-hi">
            {row.timeLabel}
          </span>
        </div>
        <span className="text-xs text-text-mid sm:mt-0.5 sm:block">
          {row.stageLabel}
          {row.groupKey && ` ${row.groupKey}`}
        </span>
        <span className="sm:hidden">
          <StatusBadge status={row.status} />
        </span>
      </div>

      {/* Col 2: matchup */}
      <div className="mt-2 flex items-center gap-2 sm:mt-0">
        <TeamSide flag={row.home.flag} name={row.home.name} />
        <span className="shrink-0 px-1 text-center">
          {score ? (
            <span className="font-display tabular text-amber">{score}</span>
          ) : (
            <span className="text-xs text-text-low">VS</span>
          )}
        </span>
        <TeamSide flag={row.away.flag} name={row.away.name} reverse />
      </div>

      {/* Col 3: odds + crowd + status/countdown */}
      <div className="mt-2 flex items-center justify-between gap-2 sm:mt-0 sm:flex-col sm:items-end sm:gap-1">
        <div className="flex items-center gap-2">
          <MarketOdds market={row.market} />
          <span className="hidden sm:flex">
            <CrowdMiniBar crowd={row.crowd} />
          </span>
          <span className="sm:hidden">
            {row.crowd.voters > 0 && row.crowd.leaderPick ? (
              <span className="text-xs tabular text-crowd">
                🥤 {row.crowd.leaderPct}% {PICK_SHORT[row.crowd.leaderPick]}
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <StatusBadge status={row.status} />
          </span>
          <span className="text-xs text-text-mid">
            {row.isLive ? "进行中" : row.countdown}
          </span>
        </div>
      </div>
    </Link>
  );
}

function selectClass(active: boolean): string {
  return `appearance-none rounded-pill border bg-bg-surface py-1.5 pl-3 pr-8 text-sm transition hover:border-border-hi focus:outline-none focus:ring-1 focus:ring-amber/40 ${
    active ? "border-amber text-amber" : "border-border text-text-hi"
  }`;
}

export function ScheduleTimeline({
  rows,
  todayKey,
}: {
  rows: RowVM[];
  todayKey: string;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stageOrGroup, setStageOrGroup] = useState<string>("all");

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesStatus(r.status, statusFilter) &&
          matchesStageOrGroup(r, stageOrGroup),
      ),
    [rows, statusFilter, stageOrGroup],
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

  const upcoming = useMemo(
    () => rows.find((r) => r.status === "open") ?? null,
    [rows],
  );

  useEffect(() => {
    const target =
      document.getElementById(`day-${todayKey}`) ??
      (upcoming ? document.getElementById(`row-${upcoming.id}`) : null);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtersActive = statusFilter !== "all" || stageOrGroup !== "all";

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-mid">{rows.length} 场赛程</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="relative inline-flex items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={selectClass(statusFilter !== "all")}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 text-text-mid">
              ▾
            </span>
          </label>

          <label className="relative inline-flex items-center">
            <select
              value={stageOrGroup}
              onChange={(e) => setStageOrGroup(e.target.value)}
              className={selectClass(stageOrGroup !== "all")}
            >
              <option value="all">全部阶段</option>
              <optgroup label="小组赛">
                <option value="stage:group">全部小组赛</option>
                {GROUP_LETTERS.map((g) => (
                  <option key={g} value={`group:${g}`}>
                    {g} 组
                  </option>
                ))}
              </optgroup>
              <optgroup label="淘汰赛">
                {KNOCKOUT_STAGES.map((s) => (
                  <option key={s.key} value={`stage:${s.key}`}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <span className="pointer-events-none absolute right-3 text-text-mid">
              ▾
            </span>
          </label>

          {filtersActive && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setStageOrGroup("all");
              }}
              className="text-xs text-text-low transition hover:text-text-hi"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* Upcoming anchor */}
      {upcoming && statusFilter === "all" && (
        <a
          href={`/match/${upcoming.id}`}
          className="flex items-center justify-between rounded-card border border-win/40 bg-win/10 px-4 py-2.5 text-sm transition hover:bg-win/15"
        >
          <span className="text-win">
            🥤 最近可投票：{upcoming.home.name} vs {upcoming.away.name}
          </span>
          <span className="text-text-mid">{upcoming.countdown} →</span>
        </a>
      )}

      {/* Timeline */}
      {byDate.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-low">
          没有符合条件的比赛
        </p>
      ) : (
        <div className="space-y-4">
          {byDate.map(([key, dayRows]) => {
            const isToday = key === todayKey;
            const isPast = key < todayKey;
            return (
              <section key={key} id={`day-${key}`} className="scroll-mt-20">
                <div className="sticky top-14 z-10 -mx-1 mb-2 flex items-center gap-2 bg-bg-base/90 px-1 py-1.5 backdrop-blur lg:top-16">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isToday ? "bg-amber" : "border border-border-hi"
                    }`}
                  />
                  <span
                    className={`text-sm font-display tracking-wide ${
                      isToday
                        ? "text-amber"
                        : isPast
                          ? "text-text-low"
                          : "text-text-mid"
                    }`}
                  >
                    {dayRows[0].dateLabel}
                    {isToday && " · 今天"}
                  </span>
                  <span className="text-xs text-text-low">{dayRows.length} 场</span>
                </div>
                <div className="space-y-2">
                  {dayRows.map((row) => (
                    <div key={row.id} id={`row-${row.id}`}>
                      <MatchRow row={row} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
