export function isAdminToken(token: string | null | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN;
  return !!expected && token === expected;
}

export const ADMIN_COOKIE = "cup_admin";
