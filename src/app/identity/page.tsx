import { getCurrentUser } from "../../lib/identity";
import { signIn, signOut } from "../../auth";
import { ProfileForm } from "../components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function IdentityPage() {
  const user = await getCurrentUser();

  const signInAction = async () => {
    "use server";
    await signIn("twitter", { redirectTo: "/identity" });
  };

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/identity" });
  };

  if (!user) {
    return (
      <section className="id-page">
        <h1 className="disp">登录<br/><em>参与竞猜</em> 🥤</h1>
        <p className="lead">用 X（Twitter）账号登录，自动带入头像和昵称，登录后可改昵称。</p>
        <form action={signInAction} style={{ paddingTop: 32 }}>
          <button type="submit" className="cta">𝕏 用 Twitter 登录</button>
        </form>
      </section>
    );
  }

  return (
    <section className="id-page">
      <h1 className="disp">你的<br/><em>身份</em> 🎭</h1>
      {user.username && <p className="lead">已用 𝕏 登录 · @{user.username}</p>}
      <ProfileForm initialNickname={user.nickname} initialEmoji={user.emoji} avatarUrl={user.avatar_url} />
      <form action={signOutAction} className="signout">
        <button type="submit">退出登录</button>
      </form>
    </section>
  );
}
