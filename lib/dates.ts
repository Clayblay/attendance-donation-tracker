const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Dates are stored as local "YYYY-MM-DD" text so time zones never shift them. */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayStr(): string {
  return toDateStr(new Date());
}
export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number): string {
  const d = fromDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && toDateStr(fromDateStr(s)) === s;
}
/** Accepts 10/5/2026, 10-05-2026 or 10.5.2026. */
export function parseUsDate(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return null;
  const s = `${m[3]}-${pad(Number(m[1]))}-${pad(Number(m[2]))}`;
  return isValidDateStr(s) ? s : null;
}
export function formatUs(s: string): string {
  const [y, m, d] = s.split('-');
  return `${m}/${d}/${y}`;
}
/** "Sun, Oct 18, 2026" */
export function formatLong(s: string): string {
  const d = fromDateStr(s);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}
export function monthKey(s: string): string {
  return s.slice(0, 7);
}
export function currentMonthKey(): string {
  return monthKey(todayStr());
}
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "October 18, 2026" */
export function formatFull(s: string): string {
  const d = fromDateStr(s);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** First and last day of a "YYYY-MM" month. */
export function monthStart(key: string): string {
  return `${key}-01`;
}
export function monthEnd(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return toDateStr(new Date(y, m, 0));
}
