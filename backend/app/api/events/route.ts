import { NextResponse } from "next/server";
import { moderateEvent } from "@/lib/ai/moderate";
import { getCurrentUser } from "@/lib/auth";
import { createEvent, getEventFeed, vancouverNow } from "@/lib/events";
import type { TimeWindow } from "@/lib/matching";
import { normalizeTime } from "@/lib/schedule";
import { toMinutes } from "@/lib/time";
import { CAMPUSES, DAYS, type Campus, type Day } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // posting runs moderation and an embedding

/**
 * My event feed: events that fall in my free time, ranked by my interests,
 * each with matches who are also free then.
 * Optional ?day=Tue&start=12:20&end=14:30 keeps only events in that block.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  let filter: TimeWindow | undefined;
  if (params.has("day")) {
    const day = params.get("day") as Day;
    const start_time = normalizeTime(params.get("start"));
    const end_time = normalizeTime(params.get("end"));
    if (!DAYS.includes(day) || !start_time || !end_time || toMinutes(end_time) <= toMinutes(start_time)) {
      return NextResponse.json({ error: "That time block isn't valid." }, { status: 400 });
    }
    filter = { day, start_time, end_time };
  }

  try {
    return NextResponse.json({ events: await getEventFeed(user, filter) });
  } catch (err) {
    console.error("[api/events GET]", err);
    return NextResponse.json({ error: "Couldn't load events. Try again." }, { status: 500 });
  }
}

/**
 * Post an event. Body: { title, description, location, campus, date, start_time, end_time }
 * campus is Burnaby | Surrey | Vancouver, or null for off campus.
 * The post is checked by AI moderation before it is saved.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const text = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
  const title = text(body.title);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const location = text(body.location);
  const campus = CAMPUSES.includes(body.campus as Campus) ? (body.campus as Campus) : null;
  const date = text(body.date);
  const start_time = normalizeTime(body.start_time);
  const end_time = normalizeTime(body.end_time);

  const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
  if (title.length < 3 || title.length > 120) return bad("Give the event a title (3 to 120 characters).");
  if (description.length < 10 || description.length > 1000) return bad("Describe the event in a sentence or two (10 to 1000 characters).");
  if (location.length < 2 || location.length > 160) return bad("Say where it is.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return bad("Pick a date.");
  if (!start_time || !end_time) return bad("Use 24-hour times, like 18:00 and 20:30.");
  if (toMinutes(end_time) <= toMinutes(start_time)) return bad("The end time must be after the start time.");
  if (`${date} ${end_time}:00` < vancouverNow()) return bad("That time has already passed. Pick a later one.");

  try {
    const verdict = await moderateEvent(title, description, location);
    if (!verdict.ok) {
      // 422: the request was understood but the content was refused.
      return NextResponse.json({ error: verdict.reason, moderated: true }, { status: 422 });
    }
    const id = await createEvent(user.id, { title, description, location, campus, date, start_time, end_time });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[api/events POST]", err);
    return NextResponse.json({ error: "Couldn't post that event. Try again." }, { status: 500 });
  }
}
