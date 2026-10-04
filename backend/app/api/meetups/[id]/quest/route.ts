import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createQuestFor, getCurrentQuest, getMeetup, getMeetupDetail } from "@/lib/meetups";

export const maxDuration = 60;

/**
 * Get a quest for an accepted meetup (optional after a pair's first meetup),
 * or reroll the current one. Body: { reroll?: boolean }. One reroll per meetup.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  let reroll = false;
  try {
    reroll = (await request.json())?.reroll === true;
  } catch {
    // No body is fine: it means "give us a quest".
  }

  try {
    const meetup = await getMeetup(id);
    if (!meetup || (meetup.requester_id !== user.id && meetup.receiver_id !== user.id)) {
      return NextResponse.json({ error: "Meetup not found." }, { status: 404 });
    }
    if (meetup.event_id) {
      return NextResponse.json({ error: "You're going to an event together, so there's no side quest for this one." }, { status: 409 });
    }
    if (meetup.status !== "accepted") {
      return NextResponse.json({ error: "Quests are for accepted meetups that aren't finished yet." }, { status: 409 });
    }

    const current = await getCurrentQuest(id);
    if (reroll) {
      const detail = await getMeetupDetail(id, user.id);
      if (!current || !detail || detail.rerolls_left <= 0) {
        return NextResponse.json({ error: "You've used your one reroll. This quest is your destiny." }, { status: 409 });
      }
      await createQuestFor(meetup, true);
    } else if (!current) {
      await createQuestFor(meetup);
    }
    return NextResponse.json(await getMeetupDetail(id, user.id));
  } catch (err) {
    console.error("[api/meetups/:id/quest]", err);
    return NextResponse.json({ error: "Couldn't get a quest. Try again." }, { status: 500 });
  }
}
