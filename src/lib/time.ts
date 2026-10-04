import { DAYS, type Day } from './types';

/** Accepts "9:30" or "09:30". */
export const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** "13:05" -> 785 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 130 -> "2 h 10 min", 45 -> "45 min", 120 -> "2 h" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Today's weekday on campus (Vancouver time), whatever the phone's timezone is. */
export function todayInVancouver(): Day {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Vancouver', weekday: 'short' }).format(new Date());
    if ((DAYS as readonly string[]).includes(name)) return name as Day;
  } catch {
    // Older JS engines without timezone data: fall back to the phone's own day.
  }
  return DAYS[(new Date().getDay() + 6) % 7];
}
