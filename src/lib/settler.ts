import { getCurrentUser } from "./identity";
import type { User } from "../db/queries/users";

function settlerHandles(): Set<string> {
  return new Set(
    (process.env.SETTLER_USERNAMES ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean),
  );
}

/** A settler is any logged-in user whose X username or twitter_id is configured. */
export function isSettler(user: User | null): boolean {
  if (!user) return false;
  const handles = settlerHandles();
  if (handles.size === 0) return false;
  return (
    (!!user.username && handles.has(user.username.toLowerCase())) ||
    (!!user.twitter_id && handles.has(user.twitter_id.toLowerCase()))
  );
}

export async function getCurrentSettler(): Promise<User | null> {
  const user = await getCurrentUser();
  return isSettler(user) ? user : null;
}
