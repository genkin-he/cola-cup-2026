import { auth } from "../auth";
import { getUserById, type User } from "../db/queries/users";

export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  if (typeof session?.uid !== "number") return null;
  return getUserById(session.uid);
}
