import { NextResponse } from "next/server";
import { extractSchedule, isSupportedImage } from "@/lib/ai/schedule";
import { getCurrentUser } from "@/lib/auth";

export const maxDuration = 60; // vision calls can be slow; give Vercel room

// Vercel rejects request bodies over 4.5 MB. Base64 adds a third, so cap a bit under.
const MAX_BASE64_CHARS = 5_500_000;

const MESSAGES = {
  no_key: "Schedule reading isn't set up on the server (missing GEMINI_API_KEY). Add your classes by hand below.",
  ai_error: "Couldn't read that screenshot right now. Try again, or add your classes by hand below.",
  bad_json: "Couldn't make sense of that screenshot. Try a clearer one, or add your classes by hand below.",
  no_classes: "No classes found in that image. Try a screenshot of your weekly schedule, or add them by hand below.",
} as const;

/**
 * Screenshot -> classes. Does NOT save anything: the app shows the result in
 * an editable list and the user confirms with PUT /api/schedule.
 * Body: { imageBase64: string, mimeType: string }
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { imageBase64?: unknown; mimeType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "image/jpeg";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.replace(/^data:[^,]+,/, "") : "";

  if (!imageBase64) return NextResponse.json({ error: "No image received. Pick a screenshot and try again." }, { status: 400 });
  if (!isSupportedImage(mimeType)) {
    return NextResponse.json({ error: "Use a PNG or JPEG screenshot." }, { status: 400 });
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ error: "That image is too large. Crop it to just the schedule and try again." }, { status: 413 });
  }

  const result = await extractSchedule(imageBase64, mimeType, user.campus);
  if (!result.ok) {
    // 200 with ok:false: this is an expected outcome, and manual entry still works.
    return NextResponse.json({ ok: false, classes: [], message: MESSAGES[result.reason] });
  }
  return NextResponse.json({ ok: true, classes: result.classes });
}
