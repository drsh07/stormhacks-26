import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/auth";
import { DEMO_ACCOUNTS, resetDemoAccounts } from "@/lib/demo";
import { ensureEventColumn } from "@/lib/meetups";

export const maxDuration = 60;

/**
 * Demo only: reset the two demo accounts to their starting state (creating
 * them if needed) so the demo can be run again. Touches nothing else.
 */
export async function POST() {
  if (!DEMO_MODE) return NextResponse.json({ error: "Demo mode is off." }, { status: 404 });
  try {
    await ensureEventColumn();
    await resetDemoAccounts();
    return NextResponse.json({ ok: true, accounts: DEMO_ACCOUNTS.map((a) => ({ id: a.id, name: a.name, email: a.email })) });
  } catch (err) {
    console.error("[api/demo/reset]", err);
    return NextResponse.json({ error: "Couldn't reset the demo accounts. Try again." }, { status: 500 });
  }
}
