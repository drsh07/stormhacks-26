import { randomUUID } from "node:crypto";
import { generateQuest, type QuestContent } from "./ai/quest";
import { execute, query } from "./db";
import { campusOfSpot } from "./spots";
import { toMinutes } from "./time";
import type { Campus, Day, MeetupStatus, QuestStatus } from "./types";

export interface MeetupRow {
  /** Set when the meetup is "go to this event together". Event meetups have no quest. */
  event_id?: string | null;
  id: string;
  requester_id: string;
  receiver_id: string;
  day: Day;
  start_time: string;
  end_time: string;
  spot: string;
  status: MeetupStatus;
}

export interface QuestRow extends QuestContent {
  id: string;
  meetup_id: string;
  status: QuestStatus;
  verdict_comment: string | null;
}

interface Person {
  id: string;
  name: string;
  avatar_emoji: string;
  program: string;
  campus: Campus;
  interests: string;
}

/**
 * A rerolled quest is kept in the table but marked with this comment, so we
 * can count rerolls without changing the schema. The current quest is the one
 * without the mark.
 */
const REROLLED = "__rerolled__";
export const MAX_REROLLS = 1;

const MEETUP_COLUMNS = "id, requester_id, receiver_id, day, start_time, end_time, spot, status, event_id";

/**
 * The event_id column was added after the first deploy. This adds it to an
 * existing database the first time it is needed, so nobody has to run a
 * migration by hand. A "column already exists" error just means it is done.
 */
let eventColumnReady: Promise<void> | null = null;
export function ensureEventColumn(): Promise<void> {
  if (!eventColumnReady) {
    eventColumnReady = execute("ALTER TABLE meetups ADD COLUMN event_id CHAR(36) NULL")
      .then(() => undefined)
      .catch((err: Error) => {
        if (!/duplicate column/i.test(err.message)) {
          eventColumnReady = null; // a real failure: try again on the next request
          throw err;
        }
      });
  }
  return eventColumnReady;
}
const QUEST_COLUMNS = "id, meetup_id, title, body, why_it_fits, time_estimate_min, photo_proof_instruction, status, verdict_comment";

export async function getMeetup(id: string): Promise<MeetupRow | null> {
  await ensureEventColumn();
  const rows = await query<MeetupRow>(`SELECT ${MEETUP_COLUMNS} FROM meetups WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function getCurrentQuest(meetupId: string): Promise<QuestRow | null> {
  const rows = await query<QuestRow>(
    `SELECT ${QUEST_COLUMNS} FROM quests
      WHERE meetup_id = ? AND (verdict_comment IS NULL OR verdict_comment <> ?) LIMIT 1`,
    [meetupId, REROLLED],
  );
  return rows[0] ?? null;
}

async function rerollsUsed(meetupId: string): Promise<number> {
  const rows = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM quests WHERE meetup_id = ? AND verdict_comment = ?",
    [meetupId, REROLLED],
  );
  return Number(rows[0]?.n ?? 0);
}

/** A quest is mandatory the first time two people meet: no completed meetup between them yet. */
export async function isFirstMeetup(meetup: MeetupRow): Promise<boolean> {
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM meetups
      WHERE status = 'completed' AND id <> ?
        AND ((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))`,
    [meetup.id, meetup.requester_id, meetup.receiver_id, meetup.receiver_id, meetup.requester_id],
  );
  return Number(rows[0]?.n ?? 0) === 0;
}

/**
 * An unfinished request of the SAME KIND between two people, if there is one.
 * Meetup requests (side quest) and event invites are independent:
 *   eventId = null    -> looks only at plain meetup requests
 *   eventId = "abc"   -> looks only at invites to that one event
 * So a pair can have a meetup request and any number of event invites open
 * at the same time, and none of them is mistaken for another.
 */
export async function openMeetupBetween(a: string, b: string, eventId: string | null): Promise<MeetupRow | null> {
  await ensureEventColumn();
  const rows = await query<MeetupRow>(
    `SELECT ${MEETUP_COLUMNS} FROM meetups
      WHERE status IN ('proposed','accepted')
        AND ${eventId ? "event_id = ?" : "event_id IS NULL"}
        AND ((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))
      ORDER BY created_at DESC LIMIT 1`,
    eventId ? [eventId, a, b, b, a] : [a, b, b, a],
  );
  return rows[0] ?? null;
}

export async function createMeetup(input: Omit<MeetupRow, "id" | "status">): Promise<string> {
  await ensureEventColumn();
  const id = randomUUID();
  await execute(
    `INSERT INTO meetups (id, requester_id, receiver_id, day, start_time, end_time, spot, status, event_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'proposed', ?)`,
    [id, input.requester_id, input.receiver_id, input.day, input.start_time, input.end_time, input.spot, input.event_id ?? null],
  );
  return id;
}

async function getPeople(ids: string[]): Promise<Map<string, Person>> {
  const rows = await query<Person>(
    "SELECT id, name, avatar_emoji, program, campus, interests FROM users WHERE id IN (?)",
    [ids as unknown as string],
  );
  return new Map(rows.map((p) => [p.id, p]));
}

/**
 * Generates a quest for a meetup and saves it. With `reroll`, the current
 * quest is retired first. Always succeeds: generateQuest falls back to a
 * canned quest if the AI is unavailable.
 */
export async function createQuestFor(meetup: MeetupRow, reroll = false): Promise<QuestRow> {
  const current = await getCurrentQuest(meetup.id);
  const people = await getPeople([meetup.requester_id, meetup.receiver_id]);
  const a = people.get(meetup.requester_id);
  const b = people.get(meetup.receiver_id);
  if (!a || !b) throw new Error("Meetup participants not found.");

  const { quest } = await generateQuest({
    nameA: a.name.split(" ")[0],
    interestsA: a.interests,
    nameB: b.name.split(" ")[0],
    interestsB: b.interests,
    minutesAvailable: toMinutes(meetup.end_time) - toMinutes(meetup.start_time),
    campus: campusOfSpot(meetup.spot) ?? a.campus,
    spot: meetup.spot,
    avoidTitle: reroll ? current?.title : undefined,
  });

  if (current) {
    await execute("UPDATE quests SET verdict_comment = ? WHERE id = ?", [REROLLED, current.id]);
  }
  const id = randomUUID();
  await execute(
    `INSERT INTO quests (id, meetup_id, title, body, why_it_fits, time_estimate_min, photo_proof_instruction, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, meetup.id, quest.title, quest.body, quest.why_it_fits, quest.time_estimate_min, quest.photo_proof_instruction],
  );
  return { id, meetup_id: meetup.id, ...quest, status: "pending", verdict_comment: null };
}

export interface MeetupEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  campus: Campus | null;
  /** "YYYY-MM-DD" */
  date: string;
  start_time: string;
  end_time: string;
}

export interface MeetupDetail {
  meetup: Omit<MeetupRow, "requester_id" | "receiver_id" | "event_id"> & { minutes: number };
  /** Present when this meetup is "go to this event together". Then there is no quest. */
  event: MeetupEvent | null;
  role: "requester" | "receiver";
  other: { id: string; name: string; avatar_emoji: string; program: string };
  quest: Omit<QuestRow, "meetup_id"> | null;
  /** True on a pair's first meetup, where the quest is mandatory. */
  quest_required: boolean;
  rerolls_left: number;
}

/** Everything the meetup screen needs, or null if this user is not part of the meetup. */
export async function getMeetupDetail(meetupId: string, userId: string): Promise<MeetupDetail | null> {
  const meetup = await getMeetup(meetupId);
  if (!meetup || (meetup.requester_id !== userId && meetup.receiver_id !== userId)) return null;
  const role = meetup.requester_id === userId ? "requester" : "receiver";
  const otherId = role === "requester" ? meetup.receiver_id : meetup.requester_id;

  const isEvent = !!meetup.event_id;
  const [people, quest, used, first, eventRows] = await Promise.all([
    getPeople([otherId]),
    isEvent ? Promise.resolve(null) : getCurrentQuest(meetup.id), // event meetups never show a quest
    rerollsUsed(meetup.id),
    isFirstMeetup(meetup),
    isEvent
      ? query<{ id: string; title: string; description: string; location: string; campus: Campus | null; starts_at: string; ends_at: string }>(
          "SELECT id, title, description, location, campus, starts_at, ends_at FROM events WHERE id = ? LIMIT 1",
          [meetup.event_id!],
        )
      : Promise.resolve([]),
  ]);
  const other = people.get(otherId);
  if (!other) return null;

  const { requester_id: _a, receiver_id: _b, event_id: _e, ...rest } = meetup;
  void _a;
  void _b;
  void _e;
  const ev = eventRows[0];
  const event: MeetupEvent | null = isEvent
    ? ev
      ? {
          id: ev.id,
          title: ev.title,
          description: ev.description,
          location: ev.location,
          campus: ev.campus,
          date: ev.starts_at.slice(0, 10),
          start_time: ev.starts_at.slice(11, 16),
          end_time: ev.ends_at.slice(0, 10) === ev.starts_at.slice(0, 10) ? ev.ends_at.slice(11, 16) : "23:59",
        }
      : // The event row is gone, but this is still an event meetup: keep the quest hidden.
        { id: meetup.event_id!, title: meetup.spot, description: "", location: meetup.spot, campus: null, date: "", start_time: meetup.start_time, end_time: meetup.end_time }
    : null;
  let questOut: MeetupDetail["quest"] = null;
  if (quest) {
    const { meetup_id: _m, ...q } = quest;
    void _m;
    questOut = q;
  }
  return {
    meetup: { ...rest, minutes: toMinutes(meetup.end_time) - toMinutes(meetup.start_time) },
    event,
    role,
    other: { id: other.id, name: other.name, avatar_emoji: other.avatar_emoji, program: other.program },
    quest: questOut,
    quest_required: first && !isEvent,
    rerolls_left: quest && quest.status === "pending" ? Math.max(0, MAX_REROLLS - used) : 0,
  };
}

export interface MeetupListItem {
  id: string;
  role: "requester" | "receiver";
  other: { id: string; name: string; avatar_emoji: string };
  day: Day;
  start_time: string;
  end_time: string;
  spot: string;
  status: MeetupStatus;
  quest_title: string | null;
  is_event: boolean;
}

/** Every meetup this user sent or received, newest first. */
export async function listMeetups(userId: string): Promise<MeetupListItem[]> {
  await ensureEventColumn();
  const rows = await query<MeetupRow & { other_name: string; other_emoji: string; quest_title: string | null }>(
    `SELECT m.id, m.requester_id, m.receiver_id, m.day, m.start_time, m.end_time, m.spot, m.status, m.event_id,
            u.name AS other_name, u.avatar_emoji AS other_emoji, q.title AS quest_title
       FROM meetups m
       JOIN users u ON u.id = IF(m.requester_id = ?, m.receiver_id, m.requester_id)
       LEFT JOIN quests q ON q.meetup_id = m.id AND (q.verdict_comment IS NULL OR q.verdict_comment <> ?)
      WHERE m.requester_id = ? OR m.receiver_id = ?
      ORDER BY m.created_at DESC
      LIMIT 100`,
    [userId, REROLLED, userId, userId],
  );
  return rows.map((r) => ({
    id: r.id,
    role: r.requester_id === userId ? "requester" : "receiver",
    other: { id: r.requester_id === userId ? r.receiver_id : r.requester_id, name: r.other_name, avatar_emoji: r.other_emoji },
    day: r.day,
    start_time: r.start_time,
    end_time: r.end_time,
    spot: r.spot,
    status: r.status,
    quest_title: r.status === "proposed" || r.event_id ? null : r.quest_title,
    is_event: !!r.event_id,
  }));
}
