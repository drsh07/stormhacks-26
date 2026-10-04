import { NextResponse } from "next/server";
import { COOKIE_OPTIONS, USER_COLUMNS, USER_COOKIE } from "@/lib/auth";
import { query } from "@/lib/db";
import type { User } from "@/lib/types";

/**
 * Sign in. Passwordless: the SFU email is the whole login (hackathon auth).
 * Body: { email }. Unknown emails get code "not_found" so the app can point
 * the person to Sign up.
 */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  if (!/^[a-z0-9._-]+@sfu\.ca$/.test(email)) {
    return NextResponse.json({ error: "Use your SFU email. It must end in @sfu.ca." }, { status: 400 });
  }

  try {
    const rows = await query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE email = ? LIMIT 1`, [email]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No account with that email.", code: "not_found" }, { status: 404 });
    }
    const res = NextResponse.json({ user: rows[0] });
    res.cookies.set(USER_COOKIE, rows[0].id, COOKIE_OPTIONS); // web only; the app uses x-user-id
    return res;
  } catch (err) {
    console.error("[api/sign-in]", err);
    return NextResponse.json({ error: "Couldn't sign you in. Try again." }, { status: 500 });
  }
}
