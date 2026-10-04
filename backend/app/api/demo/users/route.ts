import { NextResponse } from "next/server";
import { DEMO_MODE, getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface DemoUserRow {
  id: string;
  name: string;
  campus: string;
  avatar_emoji: string;
}

/** Demo only: list of users for the "switch user" dropdown. Names only, no schedules. */
export async function GET() {
  if (!DEMO_MODE) return NextResponse.json({ error: "Demo mode is off." }, { status: 404 });
  try {
    const users = await query<DemoUserRow>(
      // The two demo accounts come first so they are one tap away.
      "SELECT id, name, campus, avatar_emoji FROM users ORDER BY (email IN ('demo1@sfu.ca', 'demo2@sfu.ca')) DESC, name LIMIT 200",
    );
    const current = await getCurrentUser();
    return NextResponse.json({ users, currentUserId: current?.id ?? null });
  } catch (err) {
    console.error("[api/demo/users]", err);
    return NextResponse.json(
      { error: "Can't reach the database. Check DATABASE_URL, then run db:setup and seed." },
      { status: 500 },
    );
  }
}
