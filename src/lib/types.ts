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

export type MeetupStatus = 'proposed' | 'accepted' | 'completed' | 'declined';

export interface Quest {
  id: string;
  title: string;
  body: string;
  why_it_fits: string;
  time_estimate_min: number;
  photo_proof_instruction: string;
  status: 'pending' | 'verified';
  verdict_comment: string | null;
}

export interface MeetupEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  campus: Campus | null;
  /** "YYYY-MM-DD", or "" if the event was removed. */
  date: string;
  start_time: string;
  end_time: string;
}

export interface MeetupDetail {
  /** Present when this meetup is "go to this event together". Then there is no quest. */
  event: MeetupEvent | null;
  meetup: { id: string; day: Day; start_time: string; end_time: string; spot: string; status: MeetupStatus; minutes: number };
  role: 'requester' | 'receiver';
  other: { id: string; name: string; avatar_emoji: string; program: string };
  quest: Quest | null;
  /** True on a pair's first meetup, where the quest is mandatory. */
  quest_required: boolean;
  rerolls_left: number;
}

export interface MeetupListItem {
  id: string;
  role: 'requester' | 'receiver';
  other: { id: string; name: string; avatar_emoji: string };
  day: Day;
  start_time: string;
  end_time: string;
  spot: string;
  status: MeetupStatus;
  quest_title: string | null;
  is_event: boolean;
}

export interface EventFeedItem {
  id: string;
  title: string;
  description: string;
  location: string;
  campus: Campus | null;
  /** "YYYY-MM-DD" */
  date: string;
  day: Day;
  start_time: string;
  end_time: string;
  host: { name: string; avatar_emoji: string };
  is_mine: boolean;
  similarity: number;
  people: { id: string; name: string; avatar_emoji: string }[];
}
