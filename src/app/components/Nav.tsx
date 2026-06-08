"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; icon: string; label: string };

const TABS: Tab[] = [
  { href: "/", icon: "⚽", label: "赛程" },
  { href: "/leaderboard", icon: "🏆", label: "排行" },
  { href: "/me", icon: "👤", label: "我的" },
  { href: "/about", icon: "📖", label: "说明" },
];

export type NavUser = {
  nickname: string;
  emoji: string | null;
  isSettler?: boolean;
} | null;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/match");
  return pathname.startsWith(href);
}

function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("cup-theme", next);
    } catch {}
  }
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="切换深浅模式"
      title="切换深浅模式"
      onClick={toggle}
    >
      <span className="moon">☾</span>
      <span className="sun">☀</span>
    </button>
  );
}

export function Nav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const tabs: Tab[] = user?.isSettler
    ? [...TABS, { href: "/admin", icon: "⚙️", label: "结算" }]
    : TABS;

  return (
    <>
      <header className="site-head">
        <div className="shell">
          <div className="bar">
            <Link className="wm" href="/">
              CUP<span className="dot">.</span>
            </Link>
            <nav className="nav">
              {tabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={isActive(pathname, tab.href) ? "on" : ""}
                >
                  <span className="ic">{tab.icon}</span>
                  {tab.label}
                </Link>
              ))}
            </nav>
            <div className="head-right">
              {user ? (
                <Link className="identity" href="/identity">
                  {user.emoji ?? "👤"} {user.nickname}
                </Link>
              ) : (
                <Link className="identity" href="/identity">
                  登录
                </Link>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <nav className="tabbar">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={isActive(pathname, tab.href) ? "on" : ""}
          >
            <span className="ic">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
