import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { eventWindow, getEvent } from "@/lib/events";
import { getMatches } from "@/lib/matching";
import { createMeetup, listMeetups, openMeetupBetween } from "@/lib/meetups";
import { normalizeTime } from "@/lib/schedule";
import { SPOTS } from "@/lib/spots";
import { toMinutes } from "@/lib/time";
import { DAYS, type Day } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Meetups I sent and received. The app polls this every 5 seconds. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  try {
    return NextResponse.json({ meetups: await listMeetups(user.id) });
  } catch (err) {
    console.error("[api/meetups GET]", err);
    return NextResponse.json({ error: "Couldn't load your meetups. Try again." }, { status: 500 });
  }
}

/**
 * Propose a meetup. Two shapes:
 *   { receiver_id, day, start_time, end_time, spot }   pick a block and a campus spot
 *   { receiver_id, event_id }                          "Go with someone" to an event
 * Either way the time must sit inside a block where both people are really
 * free: we re-check against the matcher instead of trusting the app.
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
  const receiver_id = typeof body.receiver_id === "string" ? body.receiver_id : "";
  if (!receiver_id || receiver_id === user.id) {
    return NextResponse.json({ error: "Pick someone to meet." }, { status: 400 });
  }

  try {
    const existing = await openMeetupBetween(user.id, receiver_id);
    if (existing) {
      // One open meetup per pair keeps the demo tidy. Send them to it.
      return NextResponse.json({ meetup_id: existing.id, existing: true });
    }

    // "Go with someone": the time and place come from the event.
    if (typeof body.event_id === "string" && body.event_id) {
      const event = await getEvent(body.event_id);
      if (!event) return NextResponse.json({ error: "That event no longer exists." }, { status: 404 });
      const { window } = eventWindow(event);
      const matches = await getMatches(user, window, 500);
      const overlap = matches.find((m) => m.user.id === receiver_id)?.overlaps[0];
      if (!overlap) {
        return NextResponse.json({ error: "You two aren't both free during that event any more." }, { status: 409 });
      }
      const meetup_id = await createMeetup({
        requester_id: user.id,
        receiver_id,
        day: overlap.day,
        start_time: overlap.start_time,
        end_time: overlap.end_time,
        spot: `${event.title} at ${event.location}`.slice(0, 160),
      });
      return NextResponse.json({ meetup_id, existing: false });
    }

    const day = body.day as Day;
    const start_time = normalizeTime(body.start_time);
    const end_time = normalizeTime(body.end_time);
    const spot = typeof body.spot === "string" ? body.spot : "";
    if (!DAYS.includes(day) || !start_time || !end_time || toMinutes(end_time) <= toMinutes(start_time)) {
      return NextResponse.json({ error: "Pick a time block." }, { status: 400 });
    }

    const matches = await getMatches(user, { day, start_time, end_time }, 500);
    const match = matches.find((m) => m.user.id === receiver_id);
    const overlap = match?.overlaps.find((o) => o.day === day && o.start_time === start_time && o.end_time === end_time);
    if (!match || !overlap) {
      return NextResponse.json(
        { error: "You two aren't both free for that whole block any more. Pick another time." },
        { status: 409 },
      );
    }
    if (!SPOTS[overlap.campus].includes(spot)) {
      return NextResponse.json({ error: `Pick a spot on the ${overlap.campus} campus.` }, { status: 400 });
    }

    const meetup_id = await createMeetup({ requester_id: user.id, receiver_id, day, start_time, end_time, spot });
    return NextResponse.json({ meetup_id, existing: false });
  } catch (err) {
    console.error("[api/meetups POST]", err);
    return NextResponse.json({ error: "Couldn't send that proposal. Try again." }, { status: 500 });
  }
}
