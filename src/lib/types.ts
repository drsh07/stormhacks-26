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
