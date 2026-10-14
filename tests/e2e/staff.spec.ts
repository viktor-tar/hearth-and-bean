import { expect, test } from '@playwright/test';
import { api, backend, guestRequest, signIn, STAFF } from './helpers';

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

test('passwords are stored as a hash after the first sign-in', async () => {
  const login = (password: string) => api({ action: 'login', username: STAFF.username, password });

  await login(STAFF.password);
  const stored = (await backend()).staff[0].password;
  expect(stored).toMatch(/^hash\$\d+\$\w+\$/);
  expect(stored).not.toContain(STAFF.password);

  await login(STAFF.password); // the hash still accepts the same password
  await expect(login('wrong-password')).rejects.toThrow(/bad_login/);

  // a reset: the owner types a new password into the Staff tab, and it is hashed at the next sign-in
  await backend({ set: [['Staff', 1, 1, 'new-pass-2026']] });
  await login('new-pass-2026');
  expect((await backend()).staff[0].password).toMatch(/^hash\$/);
  await expect(login(STAFF.password)).rejects.toThrow(/bad_login/);
});
