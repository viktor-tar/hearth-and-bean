import { expect, test } from '@playwright/test';
import { backend, guestRequest, signIn, STAFF } from './helpers';

test.beforeEach(async () => {
  await backend({ reset: true });
});

test('a wrong password is refused', async ({ page }) => {
  await page.goto('/staff');
  await page.fill('#staff-user', STAFF.username);
  await page.fill('#staff-pass', 'wrong-password');
  await page.click('.staff__login-form [type=submit]');
  await expect(page.locator('.staff__error')).toContainText(/not right/);
  await expect(page.locator('.staff__views')).toHaveCount(0);
});

test('staff confirm a guest request and the guest is emailed', async ({ page }) => {
  await guestRequest('Anna Smith', 'anna@example.com');
  await signIn(page);

  const row = page.locator('.staff__row', { hasText: 'Anna Smith' }).first();
  await expect(row).toBeVisible();
  await row.click();
  await page.click('[data-move=confirmed]');

  await expect.poll(async () => (await backend()).bookings[0].status).toBe('confirmed');
  const { mails } = await backend();
  expect(mails.some((m) => m.to === 'anna@example.com' && /confirmed/i.test(m.subject))).toBe(true);
});

test('staff add a phone booking and the system gives it a table', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'New booking' }).click();
  const dialog = page.locator('dialog[open]');
  await dialog.getByLabel('Name').fill('Cara Lee');
  await dialog.locator('[type=submit]').click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(async () => (await backend()).bookings.length).toBe(1);
  const [booking] = (await backend()).bookings;
  expect(booking).toMatchObject({ name: 'Cara Lee', status: 'confirmed', source: 'phone' });
  expect(booking.table).not.toBe('');
});

test('signing out returns to the sign-in form', async ({ page }) => {
  await signIn(page);
  await page.click('.staff__who .staff__btn');
  await expect(page.locator('#staff-pass')).toBeVisible();
});
