import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { COOKIE_OPTIONS, USER_COLUMNS, USER_COOKIE } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import type { User } from "@/lib/types";
import { isReservedDemoName } from "@/lib/demo";
import { parseProfile } from "@/lib/users";

/**
 * Sign up. Creates a new account. If the SFU email is already registered we
 * refuse with code "exists" so the app can point the person to Sign in.
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
  if (isReservedDemoName(p.name!)) {
    return NextResponse.json({ error: 'Names starting with "Demo" are reserved for the demo accounts.' }, { status: 400 });
  }

  try {
    const existing = await query<{ id: string }>("SELECT id FROM users WHERE email = ? LIMIT 1", [p.email!]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "You already have an account.", code: "exists" }, { status: 409 });
    }

    const id = randomUUID();
    await execute(
      `INSERT INTO users (id, name, email, campus, program, year, interests, avatar_emoji)
       VALUES (?, ?, ?, ?, ?, ?, '', ?)`,
      [id, p.name!, p.email!, p.campus!, p.program ?? "", p.year ?? 1, p.avatar_emoji ?? "🙂"],
    );
    const user = (await query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]))[0];

    const res = NextResponse.json({ user });
    res.cookies.set(USER_COOKIE, user.id, COOKIE_OPTIONS); // web only; the app uses x-user-id
    return res;
  } catch (err) {
    console.error("[api/users]", err);
    return NextResponse.json({ error: "Couldn't save your account. Try again." }, { status: 500 });
  }
}
