import { NextResponse } from "next/server";
import { isSupportedImage } from "@/lib/ai/schedule";
import { verifyQuestPhoto } from "@/lib/ai/verify";
import { getCurrentUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { getCurrentQuest, getMeetup, getMeetupDetail } from "@/lib/meetups";

export const maxDuration = 60;
const MAX_BASE64_CHARS = 5_500_000;

/**
 * Photo proof. Body: { imageBase64, mimeType }. Either person can submit.
 * The photo goes to Gemini and is then discarded: we store only the verdict
 * and its one-line comment.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  let body: { imageBase64?: unknown; mimeType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "image/jpeg";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.replace(/^data:[^,]+,/, "") : "";
  if (!imageBase64) return NextResponse.json({ error: "No photo received. Pick one and try again." }, { status: 400 });
  if (!isSupportedImage(mimeType)) return NextResponse.json({ error: "Use a JPEG or PNG photo." }, { status: 400 });
  if (imageBase64.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ error: "That photo is too large. Try a smaller one." }, { status: 413 });
  }

  try {
    const meetup = await getMeetup(id);
    if (!meetup || (meetup.requester_id !== user.id && meetup.receiver_id !== user.id)) {
      return NextResponse.json({ error: "Meetup not found." }, { status: 404 });
    }
    const quest = meetup.event_id ? null : await getCurrentQuest(id);
    if (!quest) return NextResponse.json({ error: "This meetup has no quest to prove yet." }, { status: 409 });
    if (quest.status === "verified") {
      // The other person got there first. Nothing to do.
      return NextResponse.json({ verified: true, comment: quest.verdict_comment ?? "", detail: await getMeetupDetail(id, user.id) });
    }

    const verdict = await verifyQuestPhoto(quest, imageBase64, mimeType);
    if (verdict.verified) {
      await execute("UPDATE quests SET status = 'verified', verdict_comment = ? WHERE id = ?", [verdict.comment, quest.id]);
      await execute("UPDATE meetups SET status = 'completed' WHERE id = ?", [id]);
    }
    return NextResponse.json({ ...verdict, detail: await getMeetupDetail(id, user.id) });
  } catch (err) {
    console.error("[api/meetups/:id/verify]", err);
    return NextResponse.json({ error: "Couldn't check that photo. Try again." }, { status: 500 });
  }
}
