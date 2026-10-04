import { NextResponse } from "next/server";
import { SPOTS } from "@/lib/spots";

/** Meetup spots per campus. Edit lib/spots.ts to change them. */
export async function GET() {
  return NextResponse.json({ spots: SPOTS });
}
