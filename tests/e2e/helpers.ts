import { expect, type Page } from '@playwright/test';

export const API = 'http://localhost:8792';
export const STAFF = { username: 'staff', password: 'local-test-pass' };

type Mail = { to: string; subject: string };
type Row = Record<string, string>;

/** Test hooks of the mock backend: reset the sheets, change a setting, read sent emails and saved bookings. */
export async function backend(body: Record<string, unknown> = {}) {
  const res = await fetch(API + '/__test', { method: 'POST', body: JSON.stringify(body) });
  return (await res.json()) as { mails: Mail[]; bookings: Row[]; hooks: number };
}

/** A request to the backend, exactly as the site sends it. */
export async function api<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(API, { method: 'POST', body: JSON.stringify(body) });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.code + ': ' + json.error?.message);
  return json as T;
}

/** A date n days from today in the restaurant's time zone, as YYYY-MM-DD. */
export function day(n: number) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(
    new Date(Date.now() + n * 86_400_000),
  );
}

/** A guest request made straight through the API, for staff tests to work with. */
export function guestRequest(name: string, email: string, time = '19:00') {
  return api({
    action: 'book',
    date: day(1),
    time,
    guests: 2,
    name,
    email,
    phone: '07700 900123',
    seat: '',
    notes: '',
    website: '',
  });
}

export async function signIn(page: Page) {
  await page.goto('/staff');
  await page.fill('#staff-user', STAFF.username);
  await page.fill('#staff-pass', STAFF.password);
  await page.click('.staff__login-form [type=submit]');
  await expect(page.locator('.staff__views')).toBeVisible();
  await expect(page.locator('.staff__dayname')).toBeVisible(); // the day has loaded
}
