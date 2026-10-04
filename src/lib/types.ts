// Mirrors lib/types.ts in the backend. Keep the two in sync.
export const CAMPUSES = ['Burnaby', 'Surrey', 'Vancouver'] as const;
export type Campus = (typeof CAMPUSES)[number];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Day = (typeof DAYS)[number];

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

export interface DemoUser {
  id: string;
  name: string;
  campus: Campus;
  avatar_emoji: string;
}

export type FreeBlockKind = 'on_campus_gap' | 'off_campus_free';

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

export interface Schedule {
  classes: ClassSlot[];
  free_blocks: FreeBlock[];
}

/** A stretch of time when both people are free and can be on the same campus. */
export interface Overlap {
  day: Day;
  start_time: string;
  end_time: string;
  minutes: number;
  campus: Campus;
  on_campus: boolean;
}

export interface Match {
  user: { id: string; name: string; avatar_emoji: string; program: string; year: number; campus: Campus };
  score: number;
  overlap: Overlap;
  overlaps: Overlap[];
  shared_interests: string[];
  shared_courses: string[];
  why: string;
}
