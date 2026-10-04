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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-06" -> "Oct 6" */
export function formatDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** Today's date in Vancouver as "YYYY-MM-DD". */
function vancouverToday(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver' }).format(new Date());
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

/** The next `count` dates starting today (Vancouver), for a date picker. */
export function nextDays(count: number): { date: string; day: Day; label: string }[] {
  const [y, m, d] = vancouverToday().split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    const date = dt.toISOString().slice(0, 10);
    const day = DAYS[(dt.getUTCDay() + 6) % 7];
    return { date, day, label: `${day} ${dt.getUTCDate()}` };
  });
}
