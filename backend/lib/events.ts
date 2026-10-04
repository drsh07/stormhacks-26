import { randomUUID } from "node:crypto";
import { embedText } from "./ai/embed";
import { execute, query, toVectorLiteral } from "./db";
import { getMatches, type TimeWindow } from "./matching";
import { toHHMM, toMinutes } from "./time";
import { DAYS, type Campus, type Day, type FreeBlock, type User } from "./types";
import { eventSimilarities } from "./vector";

const FEED_SIZE = 15;
const PEOPLE_PER_EVENT = 3;
/** You need to be free for at least this much of an event for it to show up. */
const MIN_FREE_MINUTES = 30;

export interface EventRow {
  id: string;
  host_user_id: string;
  title: string;
  description: string;
  location: string;
  campus: Campus | null;
  /** "YYYY-MM-DD HH:MM:SS", Vancouver wall-clock time. */
  starts_at: string;
  ends_at: string;
}

export interface EventFeedItem {
  id: string;
  title: string;
  description: string;
  location: string;
  campus: Campus | null;
  date: string;
  day: Day;
  start_time: string;
  end_time: string;
  host: { name: string; avatar_emoji: string };
  is_mine: boolean;
  /** 0 to 1: how close the event is to my interests. */
  similarity: number;
  /** The part of the event I am free for. */
  my_window: TimeWindow;
  /** Matches who are also free then, best first. */
  people: { id: string; name: string; avatar_emoji: string }[];
}

/** Current Vancouver wall-clock time as "YYYY-MM-DD HH:MM:SS" (sorts correctly as text). */
export function vancouverNow(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Vancouver",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date());
}

/** "2026-10-06" -> "Tue" */
export function dayOfDate(date: string): Day {
  const [y, m, d] = date.split("-").map(Number);
  return DAYS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
}

/** Splits an event into the weekday and HH:MM times the matcher understands. */
export function eventWindow(e: Pick<EventRow, "starts_at" | "ends_at">): { date: string; window: TimeWindow } {
  const date = e.starts_at.slice(0, 10);
  const start_time = e.starts_at.slice(11, 16);
  // An event that runs past midnight is treated as ending at the end of its first day.
  const end_time = e.ends_at.slice(0, 10) === date ? e.ends_at.slice(11, 16) : "23:59";
  return { date, window: { day: dayOfDate(date), start_time, end_time } };
}

/**
 * The slice of an event that falls inside my free time, or null if I am busy.
 * If I am in an on-campus gap I can only go to events on that campus.
 */
function freeSliceFor(window: TimeWindow, campus: Campus | null, blocks: FreeBlock[]): TimeWindow | null {
  const eventStart = toMinutes(window.start_time);
  const eventEnd = toMinutes(window.end_time);
  const needed = Math.min(MIN_FREE_MINUTES, eventEnd - eventStart);
  let best: { start: number; end: number } | null = null;
  for (const block of blocks) {
    if (block.day !== window.day) continue;
    if (block.kind === "on_campus_gap" && block.campus !== campus) continue;
    const start = Math.max(eventStart, toMinutes(block.start_time));
    const end = Math.min(eventEnd, toMinutes(block.end_time));
    if (end - start >= needed && (!best || end - start > best.end - best.start)) best = { start, end };
  }
  return best ? { day: window.day, start_time: toHHMM(best.start), end_time: toHHMM(best.end) } : null;
}

/**
 * My event feed: only upcoming events that fall in my free time, ranked by
 * how close they are to my interests. Pass `filter` to keep only events that
 * overlap one block of the week (used when a free block is tapped).
 */
export async function getEventFeed(me: User, filter?: TimeWindow): Promise<EventFeedItem[]> {
  const [events, blocks] = await Promise.all([
    query<EventRow & { host_name: string; host_emoji: string }>(
      `SELECT e.id, e.host_user_id, e.title, e.description, e.location, e.campus, e.starts_at, e.ends_at,
              u.name AS host_name, u.avatar_emoji AS host_emoji
         FROM events e JOIN users u ON u.id = e.host_user_id
        WHERE e.ends_at >= ?
        ORDER BY e.starts_at
        LIMIT 80`,
      [vancouverNow()],
    ),
    query<FreeBlock>("SELECT day, start_time, end_time, kind, campus FROM free_blocks WHERE user_id = ?", [me.id]),
  ]);

  const candidates = events.flatMap((event) => {
    const { date, window } = eventWindow(event);
    if (toMinutes(window.end_time) <= toMinutes(window.start_time)) return [];
    if (filter) {
      const overlaps =
        filter.day === window.day &&
        toMinutes(window.start_time) < toMinutes(filter.end_time) &&
        toMinutes(window.end_time) > toMinutes(filter.start_time);
      if (!overlaps) return [];
    }
    const my_window = freeSliceFor(window, event.campus, blocks);
    return my_window ? [{ event, date, window, my_window }] : [];
  });
  if (candidates.length === 0) return [];

  const similarities = await eventSimilarities(me.id, candidates.map((c) => c.event.id));
  const ranked = candidates
    .map((c) => ({ ...c, similarity: similarities.get(c.event.id) ?? 0 }))
    .sort((a, b) => b.similarity - a.similarity || a.event.starts_at.localeCompare(b.event.starts_at))
    .slice(0, FEED_SIZE);

  // For each event, who among my matches is also free then.
  const peopleLists = await Promise.all(
    ranked.map((c) => getMatches(me, c.my_window, PEOPLE_PER_EVENT).catch(() => [])),
  );

  return ranked.map((c, i) => ({
    id: c.event.id,
    title: c.event.title,
    description: c.event.description,
    location: c.event.location,
    campus: c.event.campus,
    date: c.date,
    day: c.window.day,
    start_time: c.window.start_time,
    end_time: c.window.end_time,
    host: { name: c.event.host_name, avatar_emoji: c.event.host_emoji },
    is_mine: c.event.host_user_id === me.id,
    similarity: Number(c.similarity.toFixed(4)),
    my_window: c.my_window,
    people: peopleLists[i].map((m) => ({ id: m.user.id, name: m.user.name, avatar_emoji: m.user.avatar_emoji })),
  }));
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const rows = await query<EventRow>(
    "SELECT id, host_user_id, title, description, location, campus, starts_at, ends_at FROM events WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

export interface NewEvent {
  title: string;
  description: string;
  location: string;
  campus: Campus | null;
  date: string;
  start_time: string;
  end_time: string;
}

/** Saves an event with an embedding of its title and description for interest ranking. */
export async function createEvent(hostId: string, e: NewEvent): Promise<string> {
  const { vector } = await embedText(`${e.title}. ${e.description}`);
  const id = randomUUID();
  await execute(
    `INSERT INTO events (id, host_user_id, title, description, location, campus, starts_at, ends_at, embedding)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, hostId, e.title, e.description, e.location, e.campus, `${e.date} ${e.start_time}:00`, `${e.date} ${e.end_time}:00`, toVectorLiteral(vector)],
  );
  return id;
}
