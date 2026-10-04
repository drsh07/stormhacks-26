import { embedTexts } from "./ai/embed";
import type { QuestContent } from "./ai/quest";
import { execute, query, toVectorLiteral } from "./db";
import { saveSchedule } from "./schedule";
import type { Campus, ClassSlot, Day } from "./types";

/**
 * The two accounts for live demos. They are ordinary users with fixed ids,
 * recognised by their email. Nothing here changes how regular accounts behave.
 */
interface DemoAccount {
  id: string;
  name: string;
  email: string;
  campus: Campus;
  program: string;
  year: number;
  avatar_emoji: string;
  interests: string;
  /** [course, days, start, end] */
  classes: [string, Day[], string, string][];
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "demo0001-0000-4000-8000-000000000001",
    name: "Demo Alex",
    email: "demo1@sfu.ca",
    campus: "Burnaby",
    program: "Computing Science",
    year: 2,
    avatar_emoji: "🦊",
    interests: "bouldering, bubble tea, indie games, karaoke, hackathons",
    // Tue/Thu: free on campus 12:20 to 14:30, between two Burnaby classes.
    classes: [
      ["CMPT 225", ["Tue", "Thu"], "10:30", "12:20"],
      ["MATH 152", ["Tue", "Thu"], "14:30", "15:20"],
      ["CMPT 210", ["Mon", "Wed", "Fri"], "11:30", "12:20"],
    ],
  },
  {
    id: "demo0002-0000-4000-8000-000000000002",
    name: "Demo Sam",
    email: "demo2@sfu.ca",
    campus: "Burnaby",
    program: "Interactive Arts and Technology",
    year: 2,
    avatar_emoji: "🎧",
    interests: "bubble tea, karaoke, film photography, indie games, thrifting",
    // Same Tue/Thu gap as Demo Alex, and the same CMPT 225 class.
    classes: [
      ["CMPT 225", ["Tue", "Thu"], "10:30", "12:20"],
      ["IAT 235", ["Tue", "Thu"], "14:30", "16:20"],
      ["IAT 202", ["Wed"], "09:30", "12:20"],
    ],
  },
];

export const DEMO_EMAILS = DEMO_ACCOUNTS.map((a) => a.email);
const DEMO_IDS = DEMO_ACCOUNTS.map((a) => a.id);

export function isDemoEmail(email: string): boolean {
  return DEMO_EMAILS.includes(email.toLowerCase());
}

/** Names are reserved so no regular account can look like a demo account. */
export function isReservedDemoName(name: string): boolean {
  return /^demo\b/i.test(name.trim());
}

/** "Maya Chen" -> "Maya"; demo accounts keep their whole name. */
export function shortName(name: string): string {
  return isReservedDemoName(name) ? name : name.split(" ")[0];
}

/** The quest the two demo accounts always get with each other. Never generated, never random. */
export const DEMO_QUEST: QuestContent = {
  title: "Peace Out",
  body: "Find each other and take a photo together, both throwing a peace sign.",
  why_it_fits: "The simplest quest there is: show up, say hi, peace out.",
  time_estimate_min: 5,
  photo_proof_instruction: "Both of you in frame, peace signs up.",
};

/**
 * Puts both demo accounts back to their starting state, creating them if
 * they do not exist yet: fresh profile, fresh schedule, and no requests,
 * invites, or quests involving either of them. Safe to run any number of times.
 */
export async function resetDemoAccounts(): Promise<void> {
  const idList = DEMO_IDS as unknown as string;

  // 1. Remove everything the demo accounts took part in.
  await execute(
    "DELETE FROM quests WHERE meetup_id IN (SELECT id FROM (SELECT id FROM meetups WHERE requester_id IN (?) OR receiver_id IN (?)) AS m)",
    [idList, idList],
  );
  await execute("DELETE FROM meetups WHERE requester_id IN (?) OR receiver_id IN (?)", [idList, idList]);
  await execute("DELETE FROM events WHERE host_user_id IN (?)", [idList]);

  // 2. Recreate the two profiles from scratch (also clears any edits made during a demo).
  //    Matching on email too covers an older copy of the account with a different id.
  await execute("DELETE FROM users WHERE id IN (?) OR email IN (?)", [idList, DEMO_EMAILS as unknown as string]);
  const { vectors } = await embedTexts(DEMO_ACCOUNTS.map((a) => a.interests));
  for (const [i, a] of DEMO_ACCOUNTS.entries()) {
    await execute(
      `INSERT INTO users (id, name, email, campus, program, year, interests, interests_embedding, avatar_emoji)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.name, a.email, a.campus, a.program, a.year, a.interests, toVectorLiteral(vectors[i]), a.avatar_emoji],
    );
    // 3. Schedule and free blocks (saveSchedule replaces whatever was there).
    const classes: ClassSlot[] = a.classes.flatMap(([course_code, days, start_time, end_time]) =>
      days.map((day) => ({ course_code, day, start_time, end_time, campus: a.campus })),
    );
    await saveSchedule(a.id, classes);
  }
}

/** True when a meetup is between the two demo accounts. */
export async function isDemoPair(userA: string, userB: string): Promise<boolean> {
  if (userA === userB) return false;
  const rows = await query<{ email: string }>("SELECT email FROM users WHERE id IN (?)", [[userA, userB] as unknown as string]);
  return rows.length === 2 && rows.every((r) => isDemoEmail(r.email));
}
