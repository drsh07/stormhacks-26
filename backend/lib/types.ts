export const CAMPUSES = ["Burnaby", "Surrey", "Vancouver"] as const;
export type Campus = (typeof CAMPUSES)[number];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof DAYS)[number];

export type FreeBlockKind = "on_campus_gap" | "off_campus_free";
export type MeetupStatus = "proposed" | "accepted" | "completed" | "declined";
export type QuestStatus = "pending" | "verified";

export interface User {
  id: string;
  name: string;
  email: string;
  campus: Campus;
  program: string;
  year: number;
  interests: string;
  avatar_emoji: string;
}

/** Times are 24h "HH:MM", America/Vancouver. */
export interface ClassSlot {
  course_code: string;
  day: Day;
  start_time: string;
  end_time: string;
  campus: Campus;
}

export interface FreeBlock {
  day: Day;
  start_time: string;
  end_time: string;
  kind: FreeBlockKind;
  campus: Campus | null;
}
