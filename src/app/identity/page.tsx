import { getCurrentUser } from "../../lib/identity";
import { signIn, signOut } from "../../auth";
import { ProfileForm } from "../components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function IdentityPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-5 pt-10 text-center">
        <h1 className="font-display text-2xl tracking-wide">登录参与竞猜</h1>
        <p className="text-sm text-text-mid">
          用 X（Twitter）账号登录，自动带入头像和昵称，登录后可改昵称。
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("twitter", { redirectTo: "/identity" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-pill bg-coke-red px-4 py-3 font-semibold text-white shadow-[0_0_24px_rgba(244,0,9,0.35)] transition hover:bg-coke-red-700"
          >
            𝕏 用 Twitter 登录
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 pt-6">
      <h1 className="font-display text-2xl tracking-wide">你的身份</h1>
      <div className="rounded-card border border-border bg-bg-surface p-6">
        {user.username && (
          <p className="mb-4 text-sm text-text-low">
            已用 𝕏 登录 · @{user.username}
          </p>
        )}
        <ProfileForm
          initialNickname={user.nickname}
          initialEmoji={user.emoji}
          avatarUrl={user.avatar_url}
        />
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/identity" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-pill border border-border px-4 py-2.5 text-sm text-text-mid transition hover:border-loss hover:text-loss"
        >
          退出登录
        </button>
      </form>
    </div>
  );
}
