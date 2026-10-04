import { NextResponse } from "next/server";
import { embedText } from "@/lib/ai/embed";
import { getCurrentUser, USER_COLUMNS } from "@/lib/auth";
import { execute, query, toVectorLiteral } from "@/lib/db";
import type { User } from "@/lib/types";
import { parseProfile } from "@/lib/users";

export const dynamic = "force-dynamic";

/** Who am I? The mobile app calls this on launch and after switching user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ user });
}

/** Edit my profile. Email cannot be changed. Saving interests re-embeds them. */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const parsed = parseProfile(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { email: _ignored, ...fields } = parsed.value;
  void _ignored;

  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    sets.push(`${key} = ?`); // keys come from parseProfile's fixed list, never from the request
    params.push(value);
  }

  try {
    if (fields.interests !== undefined) {
      // The embedding powers matching (Phase 2). embedText has its own fallback.
      const { vector } = await embedText(fields.interests);
      sets.push("interests_embedding = ?");
      params.push(toVectorLiteral(vector));
    }
    if (sets.length > 0) {
      await execute(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...params, user.id]);
    }
    const updated = await query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [user.id]);
    return NextResponse.json({ user: updated[0] });
  } catch (err) {
    console.error("[api/me PATCH]", err);
    return NextResponse.json({ error: "Couldn't save your profile. Try again." }, { status: 500 });
  }
}
