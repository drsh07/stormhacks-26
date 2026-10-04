import { NextResponse } from "next/server";
import { COOKIE_OPTIONS, DEMO_MODE, USER_COOKIE } from "@/lib/auth";
import { query } from "@/lib/db";

/** Demo only: become another user by setting the id cookie. */
export async function POST(request: Request) {
  if (!DEMO_MODE) return NextResponse.json({ error: "Demo mode is off." }, { status: 404 });

  let userId: unknown;
  try {
    userId = (await request.json())?.userId;
  } catch {
    return NextResponse.json({ error: "Send JSON: { userId }." }, { status: 400 });
  }
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  try {
    const rows = await query<{ id: string }>("SELECT id FROM users WHERE id = ? LIMIT 1", [userId]);
    if (rows.length === 0) return NextResponse.json({ error: "No such user." }, { status: 404 });
  } catch (err) {
    console.error("[api/demo/switch]", err);
    return NextResponse.json({ error: "Can't reach the database." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(USER_COOKIE, userId, COOKIE_OPTIONS);
  return res;
}
