import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { COOKIE_OPTIONS, USER_COLUMNS, USER_COOKIE } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import type { User } from "@/lib/types";
import { parseProfile } from "@/lib/users";

/**
 * Sign up, or sign back in. Hackathon auth: if the SFU email already exists we
 * return that user instead of an error, so nobody gets locked out of the demo.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const parsed = parseProfile(body, ["name", "email", "campus"]);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const p = parsed.value;

  try {
    const existing = await query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE email = ? LIMIT 1`, [p.email!]);
    let user = existing[0];
    let created = false;

    if (!user) {
      const id = randomUUID();
      await execute(
        `INSERT INTO users (id, name, email, campus, program, year, interests, avatar_emoji)
         VALUES (?, ?, ?, ?, ?, ?, '', ?)`,
        [id, p.name!, p.email!, p.campus!, p.program ?? "", p.year ?? 1, p.avatar_emoji ?? "🙂"],
      );
      user = (await query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]))[0];
      created = true;
    }

    const res = NextResponse.json({ user, created });
    res.cookies.set(USER_COOKIE, user.id, COOKIE_OPTIONS); // web only; the app uses x-user-id
    return res;
  } catch (err) {
    console.error("[api/users]", err);
    return NextResponse.json({ error: "Couldn't save your account. Try again." }, { status: 500 });
  }
}
