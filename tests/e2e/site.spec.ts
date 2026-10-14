import { expect, test } from '@playwright/test';

test('home page loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/Hearth & Bean/);
  await expect(page.locator('#reserve')).toBeAttached();
  expect(errors).toEqual([]);
});

test('menu page lists every section with prices and photos', async ({ page }) => {
  await page.goto('/menu');
  for (const section of [
    'Signature Coffee & Espresso',
    'Hearty Mains & Sandwiches',
    'Hearth-Baked Breads & Pastries',
  ]) {
    await expect(page.getByText(section).first()).toBeVisible();
  }
  await expect(page.getByText(/£\d+\.\d\d/).first()).toBeVisible();
  const broken = await page.evaluate(async () => {
    const imgs = [...document.images].filter((i) => i.src.includes('/images/menu/'));
    const results = await Promise.all(imgs.map((i) => fetch(i.src).then((r) => r.ok)));
    return { total: imgs.length, broken: results.filter((ok) => !ok).length };
  });
  expect(broken.total).toBeGreaterThan(0);
  expect(broken.broken).toBe(0);
});

test('unknown pages show the 404 page', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page).toHaveTitle(/Page not found/);
});
