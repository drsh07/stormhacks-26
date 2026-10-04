import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMatches, type TimeWindow } from "@/lib/matching";
import { normalizeTime } from "@/lib/schedule";
import { toMinutes } from "@/lib/time";
import { DAYS, type Day } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * People free when I am, ranked.
 * Optional ?day=Tue&start=12:20&end=14:30 narrows it to one block.
 * PRIVACY: returns only overlapping times, never anyone's classes.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  let window: TimeWindow | undefined;
  if (params.has("day")) {
    const day = params.get("day") as Day;
    const start_time = normalizeTime(params.get("start"));
    const end_time = normalizeTime(params.get("end"));
    if (!DAYS.includes(day) || !start_time || !end_time || toMinutes(end_time) <= toMinutes(start_time)) {
      return NextResponse.json({ error: "That time block isn't valid." }, { status: 400 });
    }
    window = { day, start_time, end_time };
  }

  try {
    const matches = await getMatches(user, window);
    return NextResponse.json({ matches, window: window ?? null });
  } catch (err) {
    console.error("[api/matches]", err);
    return NextResponse.json({ error: "Couldn't load your matches. Try again." }, { status: 500 });
  }
}
