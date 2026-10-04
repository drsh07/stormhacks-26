import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMeetupDetail } from "@/lib/meetups";

export const dynamic = "force-dynamic";

/** One meetup: status, the other person, and the quest. Polled every 5 seconds. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  try {
    const detail = await getMeetupDetail(id, user.id);
    if (!detail) return NextResponse.json({ error: "Meetup not found." }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err) {
    console.error("[api/meetups/:id GET]", err);
    return NextResponse.json({ error: "Couldn't load this meetup. Try again." }, { status: 500 });
  }
}
