"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn } from "next-auth/react";
import { Avatar } from "./Avatar";

const TABS = [
  { href: "/", icon: "⚽", label: "赛程" },
  { href: "/leaderboard", icon: "🏆", label: "排行" },
  { href: "/me", icon: "👤", label: "我的" },
] as const;

export type NavUser = {
  nickname: string;
  avatarUrl: string | null;
  emoji: string | null;
} | null;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/match");
  return pathname.startsWith(href);
}

function IdentityLink({ user, compact }: { user: NavUser; compact?: boolean }) {
  if (user) {
    return (
      <Link
        href="/identity"
        className={`flex items-center gap-2 rounded-pill border border-border-hi transition hover:border-coke-red ${
          compact ? "py-0.5 pl-0.5 pr-2.5" : "py-1 pl-1 pr-3"
        }`}
      >
        <Avatar
          avatarUrl={user.avatarUrl}
          emoji={user.emoji}
          nickname={user.nickname}
          size="sm"
        />
        <span className="max-w-[6rem] truncate text-xs text-text-hi">
          {user.nickname}
        </span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => signIn("twitter", { callbackUrl: "/" })}
      className={`rounded-pill bg-coke-red font-medium text-white transition hover:bg-coke-red-700 ${
        compact ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
      }`}
    >
      𝕏 登录
    </button>
  );
}

export function Nav({ user }: { user: NavUser }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top bar */}
      <header className="sticky top-0 z-30 hidden border-b border-border bg-bg-base/80 backdrop-blur lg:block">
        <div className="mx-auto flex max-w-[800px] items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-brand text-2xl text-coke-red">Cup</span>
            <span className="font-display text-lg tracking-wide text-text-hi">
              世界杯可乐竞猜
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-coke-red text-white"
                      : "text-text-mid hover:bg-bg-elevated hover:text-text-hi"
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.label}
                </Link>
              );
            })}
            <span className="ml-2">
              <IdentityLink user={user} />
            </span>
          </nav>
        </div>
      </header>

      {/* Mobile top brand bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-brand text-xl text-coke-red">Cup</span>
          <span className="font-display text-base tracking-wide">可乐竞猜</span>
        </Link>
        <IdentityLink user={user} compact />
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex flex-1 flex-col items-center gap-0.5 py-2"
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-amber" />
                )}
                <span
                  className={`text-xl transition ${active ? "scale-110" : "opacity-60"}`}
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-[11px] ${active ? "text-coke-red" : "text-text-mid"}`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
