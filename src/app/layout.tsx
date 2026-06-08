import type { Metadata, Viewport } from "next";
import {
  Big_Shoulders,
  Space_Grotesk,
  Spline_Sans_Mono,
  Pacifico,
} from "next/font/google";
import "./globals.css";
import { Nav } from "./components/Nav";
import { getCurrentUser } from "../lib/identity";
import { isSettler } from "../lib/settler";

const bigShoulders = Big_Shoulders({
  weight: ["500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-big-shoulders",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const splineMono = Spline_Sans_Mono({
  weight: ["400", "500", "600"],
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
  title: "CUP · 2026 世界杯可乐竞猜",
  description: "赛前投票预测，赛后按群众投票赔率结算。猜错了，按净瓶数给同事买饮料 🥤",
};

export const viewport: Viewport = {
  themeColor: "#0b0f0c",
  viewportFit: "cover",
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('cup-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const navUser = user
    ? {
        nickname: user.nickname,
        emoji: user.emoji,
        isSettler: isSettler(user),
      }
    : null;

  return (
    <html
      lang="zh"
      data-theme="dark"
      className={`${bigShoulders.variable} ${spaceGrotesk.variable} ${splineMono.variable} ${pacifico.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Nav user={navUser} />
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
