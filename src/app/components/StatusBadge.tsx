import type { MatchStatus } from "../../lib/matchState";
import { STATUS_META } from "../../lib/matchState";

const TONE_BG: Record<MatchStatus, string> = {
  scheduled: "bg-bg-elevated text-text-low",
  upcoming: "bg-border text-text-mid",
  open: "bg-win/15 text-win",
  locked: "bg-amber/15 text-amber",
  settled: "bg-bg-elevated text-text-mid",
};

const BAR_COLOR: Record<MatchStatus, string> = {
  scheduled: "bg-border",
  upcoming: "bg-pitch-line",
  open: "bg-win",
  locked: "bg-amber",
  settled: "bg-text-low",
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold ${TONE_BG[status]}`}
    >
      {status === "locked" && <span aria-hidden>🔒</span>}
      {STATUS_META[status].label}
    </span>
  );
}

export function statusBarColor(status: MatchStatus): string {
  return BAR_COLOR[status];
}
