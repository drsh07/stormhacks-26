import { CAMPUSES, type Campus } from "./types";

export interface ProfileInput {
  name?: string;
  email?: string;
  campus?: Campus;
  program?: string;
  year?: number;
  interests?: string;
  avatar_emoji?: string;
}

export type ProfileResult = { ok: true; value: ProfileInput } | { ok: false; error: string };

/**
 * Validates profile fields from a request body. Only fields that are present
 * are checked, so the same function serves sign-up (pass `required`) and edits.
 */
export function parseProfile(body: unknown, required: (keyof ProfileInput)[] = []): ProfileResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a JSON object." };
  const b = body as Record<string, unknown>;
  const value: ProfileInput = {};

  if (b.name !== undefined) {
    const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < 2 || name.length > 80) return { ok: false, error: "Enter your name (2 to 80 characters)." };
    value.name = name;
  }
  if (b.email !== undefined) {
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    if (!/^[a-z0-9._-]+@sfu\.ca$/.test(email) || email.length > 120) {
      return { ok: false, error: "Use your SFU email. It must end in @sfu.ca." };
    }
    value.email = email;
  }
  if (b.campus !== undefined) {
    if (!CAMPUSES.includes(b.campus as Campus)) return { ok: false, error: "Pick Burnaby, Surrey, or Vancouver." };
    value.campus = b.campus as Campus;
  }
  if (b.program !== undefined) {
    if (typeof b.program !== "string" || b.program.trim().length > 80) {
      return { ok: false, error: "Program must be 80 characters or fewer." };
    }
    value.program = b.program.trim();
  }
  if (b.year !== undefined) {
    const year = Number(b.year);
    if (!Number.isInteger(year) || year < 1 || year > 8) return { ok: false, error: "Year must be between 1 and 8." };
    value.year = year;
  }
  if (b.interests !== undefined) {
    const interests = typeof b.interests === "string" ? b.interests.trim() : "";
    if (interests.length < 3 || interests.length > 500) {
      return { ok: false, error: "Tell us a few interests (up to 500 characters)." };
    }
    value.interests = interests;
  }
  if (b.avatar_emoji !== undefined) {
    const emoji = typeof b.avatar_emoji === "string" ? b.avatar_emoji.trim() : "";
    if (!emoji || emoji.length > 16) return { ok: false, error: "Pick an emoji." };
    value.avatar_emoji = emoji;
  }

  for (const field of required) {
    if (value[field] === undefined) return { ok: false, error: `Missing ${field}.` };
  }
  return { ok: true, value };
}
