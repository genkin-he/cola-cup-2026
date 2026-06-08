import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import { upsertTwitterUser } from "./db/queries/users";

declare module "next-auth" {
  interface Session {
    uid?: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    // Minimal scope: just read the profile once at login. Drop offline.access
    // (refresh token) — we store the profile in our own session, never refresh.
    // tweet.read is required by Twitter alongside users.read even for /users/me.
    Twitter({
      authorization:
        "https://x.com/i/oauth2/authorize?scope=users.read tweet.read",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // On sign-in, upsert into our users table and remember the local id.
      if (account && profile) {
        const data = (profile as { data?: Record<string, unknown> }).data ?? {};
        const twitterId = String(
          data.id ?? account.providerAccountId ?? token.sub,
        );
        const rawAvatar = (data.profile_image_url as string | undefined) ?? null;
        const user = upsertTwitterUser({
          twitterId,
          username: (data.username as string | undefined) ?? null,
          name: (data.name as string | undefined) ?? "球迷",
          avatarUrl: rawAvatar
            ? rawAvatar.replace("_normal", "_400x400")
            : null,
        });
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.uid === "number") session.uid = token.uid;
      return session;
    },
  },
});
