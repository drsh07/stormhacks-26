import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cleanClasses, getSchedule, MAX_CLASSES, saveSchedule } from "@/lib/schedule";

export const dynamic = "force-dynamic";

/** My classes and my free blocks. Only ever returns the caller's own schedule. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  try {
    return NextResponse.json(await getSchedule(user.id));
  } catch (err) {
    console.error("[api/schedule GET]", err);
    return NextResponse.json({ error: "Couldn't load your schedule. Try again." }, { status: 500 });
  }
}

/** Replace my classes. Free blocks are recomputed every time classes change. */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { classes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  if (!Array.isArray(body?.classes)) {
    return NextResponse.json({ error: "Send { classes: [...] }." }, { status: 400 });
  }
  if (body.classes.length > MAX_CLASSES) {
    return NextResponse.json({ error: `That's more than ${MAX_CLASSES} classes. Remove a few.` }, { status: 400 });
  }

  const { classes, dropped } = cleanClasses(body.classes, user.campus);
  if (dropped > 0) {
    return NextResponse.json(
      { error: "Some classes have a missing course code or a time that doesn't make sense. Fix them and save again." },
      { status: 400 },
    );
  }

  try {
    const free_blocks = await saveSchedule(user.id, classes);
    return NextResponse.json({ classes, free_blocks });
  } catch (err) {
    console.error("[api/schedule PUT]", err);
    return NextResponse.json({ error: "Couldn't save your schedule. Try again." }, { status: 500 });
  }
}
