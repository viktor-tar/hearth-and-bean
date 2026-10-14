import { expect, test } from '@playwright/test';
import { api, backend, day } from './helpers';

test.beforeEach(async () => {
  await backend({ reset: true });
});

test('a guest books a table and both sides are emailed', async ({ page }) => {
  await page.goto('/');
  await page.locator('#reserve').scrollIntoViewIfNeeded();

  // two days ahead, so every time of day is still bookable
  await page.click('#reserve-date');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');

  const slot = page.locator('.reserve__slot:not([disabled])').first();
  await expect(slot).toBeVisible();
  await slot.click();

  // the form refuses to send without contact details
  await page.click('.reserve__form [type=submit]');
  await expect(page.locator('.reserve__done')).toBeHidden();

  await page.fill('#reserve-name', 'Anna Smith');
  await page.fill('#reserve-email', 'anna@example.com');
  await page.fill('#reserve-phone', '07700 900123');
  await page.click('.reserve__form [type=submit]');

  await expect(page.locator('.reserve__done')).toBeVisible();
  await expect(page.locator('.reserve__done')).toContainText(/Your reference is HB-[A-Z0-9]+/);

  const { bookings, mails } = await backend();
  expect(bookings).toHaveLength(1);
  expect(bookings[0]).toMatchObject({ name: 'Anna Smith', status: 'pending', source: 'web' });
  expect(bookings[0].table).not.toBe('');
  expect(mails.map((m) => m.to)).toContain('anna@example.com');
  expect(mails.some((m) => m.subject.startsWith('New booking request'))).toBe(true);
});

test('a table can never be double-booked', async () => {
  // keep booking 19:00 two days ahead until every table that fits two is taken
  const date = day(2);
  const book = (i: number) =>
    api({
      action: 'book',
      date,
      time: '19:00',
      guests: 2,
      name: 'Guest ' + i,
      email: `g${i}@example.com`,
      phone: '07700 900123',
      website: '',
    });
  let taken = 0;
  for (; taken < 30; taken++) {
    try {
      await book(taken);
    } catch (e) {
      expect(String(e)).toMatch(/slot_taken/);
      break;
    }
  }
  expect(taken).toBeGreaterThan(0);

  const { bookings } = await backend();
  const tables = bookings.map((b) => b.table);
  expect(new Set(tables).size).toBe(tables.length); // every guest got a different table

  const answer = await api<{ slots: { time: string; state: string }[] }>({
    action: 'availability',
    date,
    guests: 2,
  });
  expect(answer.slots.find((s) => s.time === '19:00')?.state).toBe('full');
});
