import { cookies, headers } from "next/headers";
import { query } from "./db";
import type { User } from "./types";

/**
 * Hackathon auth: no passwords, no sessions. The request just says who it is.
 * - Mobile app (Expo): sends the user id in the `x-user-id` header.
 * - Web: the user id lives in a cookie.
 */
export const USER_HEADER = "x-user-id";
export const USER_COOKIE = "sq_uid";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const USER_COLUMNS = "id, name, email, campus, program, year, interests, avatar_emoji";

/** Returns the signed-in user, or null if there is no id, no such user, or no database. */
export async function getCurrentUser(): Promise<User | null> {
  const id = (await headers()).get(USER_HEADER) ?? (await cookies()).get(USER_COOKIE)?.value;
  if (!id) return null;
  try {
    const rows = await query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]);
    return rows[0] ?? null;
  } catch (err) {
    console.error("[auth] could not load current user:", err);
    return null;
  }
}
