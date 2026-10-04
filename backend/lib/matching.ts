import { query } from "./db";
import { toHHMM, toMinutes } from "./time";
import { DAYS, type Campus, type Day, type FreeBlockKind, type User } from "./types";
import { interestSimilarities } from "./vector";

export const MIN_OVERLAP_MINUTES = 30;
const MAX_OVERLAPS_PER_MATCH = 6;

/** A stretch of time when both people are free and can be on the same campus. */
export interface Overlap {
  day: Day;
  start_time: string;
  end_time: string;
  minutes: number;
  campus: Campus;
  /** True when at least one of the two is stuck on campus between classes. */
  on_campus: boolean;
}

export interface Match {
  user: { id: string; name: string; avatar_emoji: string; program: string; year: number; campus: Campus };
  /** 0 to 1. See scoreMatch below. */
  score: number;
  /** The best overlap, shown on the card. */
  overlap: Overlap;
  /** Every overlap, longest first, so a meetup can be proposed in any of them. */
  overlaps: Overlap[];
  shared_interests: string[];
  shared_courses: string[];
  why: string;
}

export interface TimeWindow {
  day: Day;
  start_time: string;
  end_time: string;
}

/**
 * THE MATCHING SCORE (0 to 1). Three ingredients:
 *
 *   50%  interest_similarity: cosine similarity of the two interest
 *        embeddings, so "bouldering" and "rock climbing" count as close even
 *        though the words differ.
 *   30%  time together: minutes of the best overlap, capped at 2 hours.
 *        A 2-hour gap scores full marks; a 30-minute one scores a quarter.
 *   20%  shares_a_course: a flat bonus for an instant conversation starter.
 */
export function scoreMatch(interestSimilarity: number, overlapMinutes: number, sharesACourse: boolean): number {
  return 0.5 * interestSimilarity + 0.3 * Math.min(overlapMinutes / 120, 1) + 0.2 * (sharesACourse ? 1 : 0);
}

interface OverlapRow {
  other_id: string;
  other_home: Campus;
  day: Day;
  my_start: string;
  my_end: string;
  my_kind: FreeBlockKind;
  my_campus: Campus | null;
  their_start: string;
  their_end: string;
  their_kind: FreeBlockKind;
  their_campus: Campus | null;
}

/**
 * Where could these two actually meet during an overlapping block?
 * - If someone is in an on-campus gap, the meetup has to be on that campus,
 *   so the other person must be there too: either in their own gap on the
 *   same campus, or free with that campus as their home campus.
 * - If both are simply free, they need the same home campus.
 * Returns null when there is no campus that works.
 */
function meetingCampus(row: OverlapRow, myHome: Campus): Campus | null {
  const myGap = row.my_kind === "on_campus_gap" ? row.my_campus : null;
  const theirGap = row.their_kind === "on_campus_gap" ? row.their_campus : null;
  if (myGap && theirGap) return myGap === theirGap ? myGap : null;
  if (myGap) return row.other_home === myGap ? myGap : null;
  if (theirGap) return myHome === theirGap ? theirGap : null;
  return myHome === row.other_home ? myHome : null;
}

/** "bouldering, Indie Games" -> ["bouldering", "indie games"] */
function interestPhrases(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[,;\n]+/)
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter((p) => p.length >= 3);
}

/** Interests both people literally wrote down. Used for the "both into X" line. */
function sharedInterests(mine: string, theirs: string): string[] {
  const theirSet = new Set(interestPhrases(theirs));
  return [...new Set(interestPhrases(mine))].filter((p) => theirSet.has(p));
}

function whyLine(overlap: Overlap, interests: string[], courses: string[]): string {
  const parts = [`Both free ${overlap.day} ${overlap.start_time}-${overlap.end_time} at ${overlap.campus}`];
  if (interests.length > 0) parts.push(`both into ${interests[0]}`);
  if (courses.length > 0) parts.push(`both in ${courses[0]}`);
  return parts.join(" · ");
}

/**
 * Ranked matches for a user. Pass a window to only consider that slice of the
 * week (used when the user taps one free block).
 *
 * PRIVACY: this only ever returns the overlapping time, never another
 * person's classes or the rest of their schedule.
 */
export async function getMatches(me: User, window?: TimeWindow, limit = 20): Promise<Match[]> {
  // 1. Every pair of (my free block, someone else's free block) that overlaps in time.
  const rows = await query<OverlapRow>(
    `SELECT theirs.user_id AS other_id, other.campus AS other_home, mine.day AS day,
            mine.start_time AS my_start, mine.end_time AS my_end, mine.kind AS my_kind, mine.campus AS my_campus,
            theirs.start_time AS their_start, theirs.end_time AS their_end, theirs.kind AS their_kind, theirs.campus AS their_campus
       FROM free_blocks mine
       JOIN free_blocks theirs
         ON theirs.day = mine.day
        AND theirs.user_id <> mine.user_id
        AND theirs.start_time < mine.end_time
        AND theirs.end_time > mine.start_time
       JOIN users other ON other.id = theirs.user_id
      WHERE mine.user_id = ?${window ? " AND mine.day = ?" : ""}`,
    window ? [me.id, window.day] : [me.id],
  );

  // 2. Trim each pair to the shared minutes and keep the ones worth meeting for.
  const byUser = new Map<string, Overlap[]>();
  for (const row of rows) {
    const campus = meetingCampus(row, me.campus);
    if (!campus) continue;
    let start = Math.max(toMinutes(row.my_start), toMinutes(row.their_start));
    let end = Math.min(toMinutes(row.my_end), toMinutes(row.their_end));
    if (window) {
      start = Math.max(start, toMinutes(window.start_time));
      end = Math.min(end, toMinutes(window.end_time));
    }
    const minutes = end - start;
    if (minutes < MIN_OVERLAP_MINUTES) continue;
    const list = byUser.get(row.other_id) ?? [];
    list.push({
      day: row.day,
      start_time: toHHMM(start),
      end_time: toHHMM(end),
      minutes,
      campus,
      on_campus: row.my_kind === "on_campus_gap" || row.their_kind === "on_campus_gap",
    });
    byUser.set(row.other_id, list);
  }
  const ids = [...byUser.keys()];
  if (ids.length === 0) return [];
  const idList = ids as unknown as string; // mysql2 expands an array into (?, ?, ...)

  // 3. Everything else we need about the candidates, in parallel.
  const [people, similarities, courseRows] = await Promise.all([
    query<Match["user"] & { interests: string }>(
      "SELECT id, name, avatar_emoji, program, year, campus, interests FROM users WHERE id IN (?)",
      [idList],
    ),
    interestSimilarities(me.id, ids),
    query<{ other_id: string; course_code: string }>(
      `SELECT DISTINCT theirs.user_id AS other_id, theirs.course_code AS course_code
         FROM classes mine
         JOIN classes theirs ON theirs.course_code = mine.course_code
        WHERE mine.user_id = ? AND theirs.user_id IN (?)
        ORDER BY theirs.course_code`,
      [me.id, idList],
    ),
  ]);
  const coursesByUser = new Map<string, string[]>();
  for (const row of courseRows) {
    coursesByUser.set(row.other_id, [...(coursesByUser.get(row.other_id) ?? []), row.course_code]);
  }

  // 4. Score, explain, rank.
  const matches: Match[] = people.map(({ interests, ...person }) => {
    // Best overlap first: on-campus gaps beat plain free time, then longest, then earliest in the week.
    const overlaps = byUser
      .get(person.id)!
      .sort(
        (a, b) =>
          Number(b.on_campus) - Number(a.on_campus) ||
          b.minutes - a.minutes ||
          DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
          a.start_time.localeCompare(b.start_time),
      );
    const best = overlaps[0];
    const shared_courses = coursesByUser.get(person.id) ?? [];
    const shared_interests = sharedInterests(me.interests, interests);
    const score = scoreMatch(similarities.get(person.id) ?? 0, best.minutes, shared_courses.length > 0);
    return {
      user: person,
      score: Number(score.toFixed(4)),
      overlap: best,
      overlaps: overlaps.slice(0, MAX_OVERLAPS_PER_MATCH),
      shared_interests,
      shared_courses,
      why: whyLine(best, shared_interests, shared_courses),
    };
  });

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}
