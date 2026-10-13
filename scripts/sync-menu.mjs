/**
 * Fetches the menu before every build: the dishes from the "Menu" tab of the Google Sheet and their photos from
 * its Drive folder, both through the booking web app (actions "menu" and "menuPhoto").
 *
 * Writes src/data/menu.json and public/images/menu/*. Every answer is checked with Zod; if anything is wrong
 * (the sheet cannot be reached, a row is incomplete, a photo is missing) the build stops, so a broken menu is never
 * published. Without NEXT_PUBLIC_BOOKING_API_URL (local work without the sheet), the committed snapshot
 * src/data/menu.snapshot.json is used instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_JSON = path.join(root, 'src/data/menu.json');
const SNAPSHOT = path.join(root, 'src/data/menu.snapshot.json');
const PHOTO_DIR = path.join(root, 'public/images/menu');

/* .env.local is not loaded by Node itself: read the one variable we need from it */
function env(name) {
  if (process.env[name]) return process.env[name];
  for (const f of ['.env.local', '.env']) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (m && m[1].trim()) return m[1].trim();
  }
  return '';
}
const API = env('NEXT_PUBLIC_BOOKING_API_URL');

const CATEGORIES = [
  'Artisanal Snacks & Boards',
  'Hearty Mains & Sandwiches',
  'Hearth-Baked Breads & Pastries',
  'Signature Coffee & Espresso',
  'Tea & Specialty Drinks',
];
const HOME_GROUPS = ['Coffee and tea', 'From the oven', 'Kitchen', 'After dark'];
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const EXT = { 'image/avif': '.avif', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const envelope = z.object({ ok: z.literal(true) }).passthrough();
const photoSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: z.enum(Object.keys(EXT)),
  size: z.number().max(4 * 1024 * 1024),
  updated: z.number(),
});
const itemSchema = z
  .object({
    row: z.number(),
    name: z.string().trim().min(1),
    description: z.string().trim(),
    price: z.string().trim().min(1, 'price is empty'),
    category: z.enum(CATEGORIES, { message: `category must be one of: ${CATEGORIES.join(', ')}` }),
    menuOrder: z.number().int(),
    photo: photoSchema.nullable(),
    photoName: z.string(),
    homeGroup: z.union([z.literal(''), z.enum(HOME_GROUPS)]),
    homeOrder: z.number().int(),
  })
  .superRefine((it, ctx) => {
    if (!it.photo)
      ctx.addIssue({
        code: 'custom',
        message: it.photoName ? `photo "${it.photoName}" is not in the photos folder` : 'photo is empty',
      });
    if (it.homeGroup && it.homeOrder < 1)
      ctx.addIssue({ code: 'custom', message: 'home order is needed when home group is set' });
  });
const menuSchema = z.object({ items: z.array(z.unknown()) });
const photoDataSchema = z.object({ id: z.string(), type: z.string(), data: z.string().min(1) });

async function call(body) {
  const res = await fetch(API, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' });
  if (!res.ok) throw new Error(`the booking web app answered ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || 'the booking web app returned an error');
  return envelope.parse(json);
}

function fail(lines) {
  console.error(
    '\n✖ Menu not published. Fix the Menu tab and publish again:\n  ' + lines.join('\n  ') + '\n',
  );
  process.exit(1);
}

async function main() {
  if (!API) {
    fs.copyFileSync(SNAPSHOT, OUT_JSON);
    console.log('menu: NEXT_PUBLIC_BOOKING_API_URL is not set, using the committed snapshot');
    return;
  }
  console.log('menu: reading the Menu tab…');
  const raw = menuSchema.parse(await call({ action: 'menu' }));
  const problems = [],
    items = [];
  raw.items.forEach((x) => {
    const r = itemSchema.safeParse(x);
    if (r.success) items.push(r.data);
    else {
      const row = typeof x === 'object' && x && 'row' in x ? x.row : '?';
      const name = typeof x === 'object' && x && 'name' in x ? x.name : '';
      problems.push(`row ${row} (${name || 'no name'}): ${r.error.issues.map((i) => i.message).join('; ')}`);
    }
  });
  if (!items.length) problems.push('the Menu tab has no active dishes');
  const names = new Set();
  items.forEach((it) => {
    if (names.has(it.name)) problems.push(`row ${it.row}: "${it.name}" appears twice`);
    names.add(it.name);
  });
  if (problems.length) fail(problems);

  // photos: one request each, a few at a time
  fs.rmSync(PHOTO_DIR, { recursive: true, force: true });
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const files = new Map(); // photo id -> public path
  const queue = [...new Map(items.map((it) => [it.photo.id, it.photo])).values()];
  let done = 0;
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const r = photoDataSchema.parse(await call({ action: 'menuPhoto', id: p.id }));
      const base = slug(p.name.replace(/\.[a-z0-9]+$/i, '')) || 'dish';
      const file = `${base}-${p.updated.toString(36)}${EXT[p.type]}`;
      fs.writeFileSync(path.join(PHOTO_DIR, file), Buffer.from(r.data, 'base64'));
      files.set(p.id, `/images/menu/${file}`);
      done++;
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`menu: ${items.length} dishes, ${done} photos`);

  const dishes = items.map((it) => ({
    name: it.name,
    description: it.description,
    price: it.price,
    image: files.get(it.photo.id),
    category: slug(it.category),
    menuOrder: it.menuOrder,
    ...(it.homeGroup ? { home: { group: it.homeGroup, order: it.homeOrder } } : {}),
  }));
  fs.writeFileSync(OUT_JSON, JSON.stringify({ source: 'sheet', dishes }, null, 2) + '\n');
}

main().catch((e) => fail([e.message]));
