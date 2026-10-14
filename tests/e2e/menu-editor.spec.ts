import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { api, backend, signIn } from './helpers';

type PublicMenu = { items: { name: string; price: string; category: string; menuOrder: number }[] };
const publicMenu = () => api<PublicMenu>({ action: 'menu' });
const PHOTO = path.join(__dirname, '../../public/images/dishes/classic-fish-pie-with-mash.jpg');

async function openMenu(page: Page) {
  await signIn(page);
  await page.click('.staff__view:has-text("Menu")');
  await expect(page.locator('.staff__dish').first()).toBeVisible();
}

test.beforeEach(async () => {
  await backend({ reset: true });
  await backend({ setting: ['menuBuildHook', 'https://api.netlify.com/build_hooks/test123'] });
});

test('search and section filters narrow the list', async ({ page }) => {
  await openMenu(page);
  const all = await page.locator('.staff__dish').count();
  await page.click('.staff__chip:has-text("Tea & Specialty Drinks")');
  await expect(page.locator('.staff__menu-section')).toHaveCount(1);
  await expect(page.locator('.staff__menu-section')).toHaveAttribute('aria-label', 'Tea & Specialty Drinks');

  await page.click('.staff__chip:has-text("All")');
  await page.fill('.staff__search', 'latte');
  await expect(page.locator('.staff__dish')).not.toHaveCount(all);
  for (const name of await page.locator('.staff__dish-name').allInnerTexts()) expect(name).toMatch(/latte/i);
});

test('changing a price saves it and publishes the menu', async ({ page }) => {
  await openMenu(page);
  const card = page.locator('.staff__dish').first();
  const name = (await card.locator('.staff__dish-name').innerText()).trim();
  await card.click();
  await page.locator('dialog[open]').getByLabel('Price').fill('12.5');
  await page.click('dialog [type=submit]');
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  const dish = (await publicMenu()).items.find((i) => i.name === name);
  expect(dish?.price).toBe('£12.50');
  await expect.poll(async () => (await backend()).hooks).toBeGreaterThan(0);
});

test('hiding a dish removes it from the public menu', async ({ page }) => {
  await openMenu(page);
  const card = page.locator('.staff__dish').first();
  const name = (await card.locator('.staff__dish-name').innerText()).trim();
  await card.click();
  await page.uncheck('dialog input[type=checkbox]');
  await page.click('dialog [type=submit]');
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  expect((await publicMenu()).items.some((i) => i.name === name)).toBe(false);
  await page.fill('.staff__search', name);
  await expect(page.locator('.staff__dish', { hasText: name }).locator('.staff__tag--off')).toContainText(
    'Hidden',
  );
});

test('a new dish needs a valid price and a photo', async ({ page }) => {
  await openMenu(page);
  await page.getByRole('button', { name: 'Add dish' }).click();
  const dialog = page.locator('dialog[open]');

  const error = dialog.locator('.staff__error');

  await dialog.locator('[type=submit]').click();
  await expect(error).toContainText(/name/i);

  await dialog.getByLabel('Name').fill('Winter Toastie');
  await dialog.getByLabel('Price').fill('cheap');
  await dialog.locator('[type=submit]').click();
  await expect(error).toContainText(/price/i);

  await dialog.getByLabel('Price').fill('7.5');
  await dialog.locator('[type=submit]').click();
  await expect(error).toContainText(/photo/i);

  await dialog.getByLabel('Menu section').selectOption('Hearty Mains & Sandwiches');
  await dialog.getByLabel('Description').fill('Cheddar, leeks and mustard on sourdough.');
  await dialog.locator('input[type=file]').setInputFiles(PHOTO);
  await dialog.locator('[type=submit]').click();
  await expect(dialog).toHaveCount(0, { timeout: 20_000 });

  const dish = (await publicMenu()).items.find((i) => i.name === 'Winter Toastie');
  expect(dish).toMatchObject({ price: '£7.50', category: 'Hearty Mains & Sandwiches' });
});

test('positions in a section stay unique after a move', async ({ page }) => {
  await openMenu(page);
  const section = page.locator('.staff__menu-section').first();
  const title = (await section.getAttribute('aria-label'))!;
  await section.locator('.staff__dish').last().click();
  await page.locator('dialog[open]').getByLabel('Position in section').selectOption({ index: 0 }); // move it to first place
  await page.click('dialog [type=submit]');
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  const orders = (await publicMenu()).items.filter((i) => i.category === title).map((i) => i.menuOrder);
  expect(new Set(orders).size).toBe(orders.length);
  expect([...orders].sort((a, b) => a - b)).toEqual(orders.map((_, i) => i + 1));
});
