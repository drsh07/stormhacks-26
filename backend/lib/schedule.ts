import { randomUUID } from "node:crypto";
import { getPool, query } from "./db";
import { computeFreeBlocks } from "./free-blocks";
import { toMinutes } from "./time";
import { CAMPUSES, DAYS, type Campus, type ClassSlot, type Day, type FreeBlock } from "./types";

export const MAX_CLASSES = 40;

const DAY_ALIASES: Record<string, Day> = {
  mon: "Mon", monday: "Mon", mo: "Mon", m: "Mon",
  tue: "Tue", tues: "Tue", tuesday: "Tue", tu: "Tue", t: "Tue",
  wed: "Wed", wednesday: "Wed", we: "Wed", w: "Wed",
  thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu", th: "Thu", r: "Thu",
  fri: "Fri", friday: "Fri", fr: "Fri", f: "Fri",
  sat: "Sat", saturday: "Sat", sa: "Sat",
  sun: "Sun", sunday: "Sun", su: "Sun",
};

/** "9:30", "09:30", "9:30 AM", "2:30pm", "1430" -> "HH:MM" (24h), or null. */
export function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim().toLowerCase();
  const match = text.match(/^(\d{1,2})[:.h]?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3]?.[0];
  if (meridiem === "p" && hours < 12) hours += 12;
  if (meridiem === "a" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeCampus(value: unknown, fallback: Campus): Campus {
  if (typeof value !== "string") return fallback;
  const text = value.trim().toLowerCase();
  return CAMPUSES.find((c) => c.toLowerCase() === text) ?? fallback;
}

export interface CleanResult {
  classes: ClassSlot[];
  /** How many rows were thrown away because they could not be understood. */
  dropped: number;
}

/**
 * Turns untrusted input (AI output or a request body) into valid class rows.
 * Bad rows are dropped rather than failing the whole list.
 */
export function cleanClasses(input: unknown, fallbackCampus: Campus): CleanResult {
  if (!Array.isArray(input)) return { classes: [], dropped: 0 };
  const classes: ClassSlot[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (const row of input.slice(0, MAX_CLASSES * 2)) {
    if (!row || typeof row !== "object") {
      dropped++;
      continue;
    }
    const r = row as Record<string, unknown>;
    const course_code = typeof r.course_code === "string" ? r.course_code.trim().replace(/\s+/g, " ").toUpperCase().slice(0, 20) : "";
    const day = typeof r.day === "string" ? DAY_ALIASES[r.day.trim().toLowerCase()] : undefined;
    const start_time = normalizeTime(r.start_time);
    const end_time = normalizeTime(r.end_time);
    if (!course_code || !day || !start_time || !end_time || toMinutes(end_time) <= toMinutes(start_time)) {
      dropped++;
      continue;
    }
    const key = `${course_code}|${day}|${start_time}|${end_time}`;
    if (seen.has(key)) continue;
    seen.add(key);
    classes.push({ course_code, day, start_time, end_time, campus: normalizeCampus(r.campus, fallbackCampus) });
  }

  classes.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start_time.localeCompare(b.start_time));
  return { classes: classes.slice(0, MAX_CLASSES), dropped };
}

export async function getSchedule(userId: string): Promise<{ classes: ClassSlot[]; free_blocks: FreeBlock[] }> {
  const dayOrder = "FIELD(day,'Mon','Tue','Wed','Thu','Fri','Sat','Sun')";
  const [classes, free_blocks] = await Promise.all([
    query<ClassSlot>(
      `SELECT course_code, day, start_time, end_time, campus FROM classes WHERE user_id = ? ORDER BY ${dayOrder}, start_time`,
      [userId],
    ),
    query<FreeBlock>(
      `SELECT day, start_time, end_time, kind, campus FROM free_blocks WHERE user_id = ? ORDER BY ${dayOrder}, start_time`,
      [userId],
    ),
  ]);
  return { classes, free_blocks };
}

/**
 * Replaces a user's classes and recomputes their free blocks in one
 * transaction, so free blocks can never be out of date with the classes.
 */
export async function saveSchedule(userId: string, classes: ClassSlot[]): Promise<FreeBlock[]> {
  const blocks = computeFreeBlocks(classes);
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM classes WHERE user_id = ?", [userId]);
    await conn.query("DELETE FROM free_blocks WHERE user_id = ?", [userId]);
    if (classes.length > 0) {
      await conn.query(
        "INSERT INTO classes (id, user_id, course_code, day, start_time, end_time, campus) VALUES ?",
        [classes.map((c) => [randomUUID(), userId, c.course_code, c.day, c.start_time, c.end_time, c.campus])],
      );
    }
    if (blocks.length > 0) {
      await conn.query(
        "INSERT INTO free_blocks (id, user_id, day, start_time, end_time, kind, campus) VALUES ?",
        [blocks.map((b) => [randomUUID(), userId, b.day, b.start_time, b.end_time, b.kind, b.campus])],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return blocks;
}
