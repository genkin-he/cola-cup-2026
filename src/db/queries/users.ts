import { db } from "../client";

export type User = {
  id: number;
  twitter_id: string | null;
  username: string | null;
  nickname: string;
  avatar_url: string | null;
  emoji: string | null;
  created_at: number;
};

export function getUserById(id: number): User | null {
  return (
    (db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | User
      | undefined) ?? null
  );
}

export function getUserByTwitterId(twitterId: string): User | null {
  return (
    (db.prepare("SELECT * FROM users WHERE twitter_id = ?").get(twitterId) as
      | User
      | undefined) ?? null
  );
}

export function upsertTwitterUser(input: {
  twitterId: string;
  username: string | null;
  name: string;
  avatarUrl: string | null;
}): User {
  const existing = getUserByTwitterId(input.twitterId);
  if (existing) {
    // Refresh handle/avatar from Twitter, but keep the user's edited nickname.
    db.prepare(
      `UPDATE users SET username = @username, avatar_url = @avatarUrl
       WHERE twitter_id = @twitterId`,
    ).run({
      username: input.username,
      avatarUrl: input.avatarUrl,
      twitterId: input.twitterId,
    });
    return getUserByTwitterId(input.twitterId)!;
  }

  const info = db
    .prepare(
      `INSERT INTO users (twitter_id, username, nickname, avatar_url, created_at)
       VALUES (@twitterId, @username, @nickname, @avatarUrl, @now)`,
    )
    .run({
      twitterId: input.twitterId,
      username: input.username,
      nickname: input.name,
      avatarUrl: input.avatarUrl,
      now: Date.now(),
    });
  return getUserById(Number(info.lastInsertRowid))!;
}

const MAX_NICKNAME = 16;

/** Update editable profile. emoji=null clears the override (revert to Twitter photo). */
export function updateProfile(
  userId: number,
  nickname: string,
  emoji: string | null,
): void {
  const trimmed = nickname.trim().slice(0, MAX_NICKNAME);
  if (!trimmed) return;
  db.prepare("UPDATE users SET nickname = ?, emoji = ? WHERE id = ?").run(
    trimmed,
    emoji && emoji.trim() ? emoji.trim() : null,
    userId,
  );
}

export function listUsers(): User[] {
  return db.prepare("SELECT * FROM users ORDER BY created_at").all() as User[];
}
