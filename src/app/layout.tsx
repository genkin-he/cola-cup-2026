import type { Metadata, Viewport } from "next";
import { Anton, Inter, Spline_Sans_Mono, Pacifico } from "next/font/google";
import "./globals.css";
import { Nav } from "./components/Nav";
import { getCurrentUser } from "../lib/identity";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-spline-mono",
  display: "swap",
});
const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pacifico",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cup · 2026 世界杯可乐竞猜",
  description: "根据 Polymarket 赔率赌可口可乐 🥤",
};

export const viewport: Viewport = {
  themeColor: "#0b0f0c",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const navUser = user
    ? {
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        emoji: user.emoji,
      }
    : null;

  return (
    <html
      lang="zh"
      data-theme="dark"
      className={`${anton.variable} ${inter.variable} ${splineMono.variable} ${pacifico.variable}`}
    >
      <body className="min-h-dvh bg-bg-base text-text-hi antialiased">
        <Nav user={navUser} />
        <main className="mx-auto w-full max-w-[800px] px-4 pt-4 pb-28 lg:pt-6 lg:pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
