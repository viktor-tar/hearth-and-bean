/** Dates are plain "YYYY-MM-DD" strings and times "HH:MM", always in the restaurant's own time (Europe/London). */

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const pad = (n: number) => (n < 10 ? '0' : '') + n;

/** Today in London, whatever the visitor's clock says. */
export function londonToday(): string {
  try {
    const p: Record<string, string> = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .forEach((x) => {
        p[x.type] = x.value;
      });
    return p.year + '-' + p.month + '-' + p.day;
  } catch {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
}

export function addDays(date: string, n: number): string {
  const p = date.split('-'),
    d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}
export function weekday(date: string): number {
  const p = date.split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
}
export function longDate(date: string): string {
  const p = date.split('-');
  return DAYS[weekday(date)] + ' ' + +p[2] + ' ' + MONTHS[+p[1] - 1];
}
export function shortDate(date: string): string {
  const p = date.split('-');
  return DAYS[weekday(date)].slice(0, 3) + ' ' + +p[2] + ' ' + MONTHS[+p[1] - 1].slice(0, 3);
}
export function toMin(t: string): number {
  const p = String(t).split(':');
  return +p[0] * 60 + +p[1];
}
export const fromMin = (m: number) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
export function dayNo(date: string): number {
  const p = date.split('-');
  return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
}
