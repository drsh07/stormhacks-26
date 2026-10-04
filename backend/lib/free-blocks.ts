import { DAYS, type ClassSlot, type FreeBlock } from "./types";
import { toHHMM, toMinutes } from "./time";

export const DAY_START = "09:00";
export const DAY_END = "22:00";
export const MIN_BLOCK_MINUTES = 30;

/**
 * Turns a class list into free blocks. Pure function: same input, same output.
 *
 * For each day, sort the classes by start time, then walk through them:
 *
 * 1. on_campus_gap: the time between two back-to-back classes on the SAME
 *    campus, if it is 30+ minutes. The student is stuck on campus with
 *    nothing to do, which is the gap SideQuest exists to fill.
 *
 * 2. off_campus_free: everything else between 09:00 and 22:00 that has no
 *    class and is not an on-campus gap (before the first class, after the
 *    last one, between classes on different campuses, and whole days with no
 *    classes). Also needs 30+ minutes to count.
 */
export function computeFreeBlocks(classes: ClassSlot[]): FreeBlock[] {
  const blocks: FreeBlock[] = [];
  const dayStart = toMinutes(DAY_START);
  const dayEnd = toMinutes(DAY_END);

  for (const day of DAYS) {
    const todays = classes
      .filter((c) => c.day === day)
      .map((c) => ({ ...c, start: toMinutes(c.start_time), end: toMinutes(c.end_time) }))
      .filter((c) => c.end > c.start)
      .sort((a, b) => a.start - b.start);

    // `cursor` is the end of the last thing we accounted for.
    let cursor = dayStart;
    let prev: (typeof todays)[number] | null = null;

    for (const cls of todays) {
      const gapStart = Math.max(cursor, dayStart);
      const gapEnd = Math.min(cls.start, dayEnd);
      if (gapEnd - gapStart >= MIN_BLOCK_MINUTES) {
        const stuckOnCampus = prev !== null && prev.campus === cls.campus;
        blocks.push({
          day,
          start_time: toHHMM(gapStart),
          end_time: toHHMM(gapEnd),
          kind: stuckOnCampus ? "on_campus_gap" : "off_campus_free",
          campus: stuckOnCampus ? cls.campus : null,
        });
      }
      // Overlapping classes: keep whichever one ends later as "previous".
      if (cls.end > cursor) {
        cursor = cls.end;
        prev = cls;
      }
    }

    // After the last class (or the whole day if there were none).
    const tailStart = Math.max(cursor, dayStart);
    if (dayEnd - tailStart >= MIN_BLOCK_MINUTES) {
      blocks.push({
        day,
        start_time: toHHMM(tailStart),
        end_time: DAY_END,
        kind: "off_campus_free",
        campus: null,
      });
    }
  }
  return blocks;
}
