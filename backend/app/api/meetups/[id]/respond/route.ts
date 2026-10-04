import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { createQuestFor, getCurrentQuest, getMeetup, getMeetupDetail, isFirstMeetup } from "@/lib/meetups";

export const maxDuration = 60; // accepting generates the quest

/**
 * Accept or decline a proposal. Body: { action: "accept" | "decline" }
 * Only the receiver can respond. Accepting a pair's FIRST meetup generates
 * their mandatory side quest right away.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  let action: unknown;
  try {
    action = (await request.json())?.action;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: 'Send { action: "accept" } or { action: "decline" }.' }, { status: 400 });
  }

  try {
    const meetup = await getMeetup(id);
    if (!meetup || (meetup.receiver_id !== user.id && meetup.requester_id !== user.id)) {
      return NextResponse.json({ error: "Meetup not found." }, { status: 404 });
    }
    if (meetup.receiver_id !== user.id) {
      return NextResponse.json({ error: "Only the person who was invited can respond." }, { status: 403 });
    }

    if (meetup.status === "proposed") {
      // The WHERE status check makes a double tap harmless.
      const newStatus = action === "accept" ? "accepted" : "declined";
      await execute("UPDATE meetups SET status = ? WHERE id = ? AND status = 'proposed'", [newStatus, id]);
      meetup.status = newStatus;
    } else if (!(action === "accept" && meetup.status === "accepted")) {
      return NextResponse.json({ error: `This meetup is already ${meetup.status}.` }, { status: 409 });
    }

    if (meetup.status === "accepted" && (await isFirstMeetup(meetup)) && !(await getCurrentQuest(id))) {
      await createQuestFor(meetup);
    }
    return NextResponse.json(await getMeetupDetail(id, user.id));
  } catch (err) {
    console.error("[api/meetups/:id/respond]", err);
    return NextResponse.json({ error: "Couldn't save your answer. Try again." }, { status: 500 });
  }
}
