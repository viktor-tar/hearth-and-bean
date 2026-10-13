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
/* photos already downloaded by an earlier build, kept by Drive id and version (Netlify keeps node_modules between builds) */
const CACHE_DIR = path.join(root, 'node_modules/.cache/hearth-menu-photos');

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

/** One request to the web app, checked against the answer expected. Google now and then answers with a passing error
    (a 404 or 5xx page, a dropped connection, or the wrong page altogether), so those are tried again a few times; an
    error the sheet itself reports is not. */
async function call(body, schema, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(API, {
        method: 'POST',
        body: JSON.stringify(body),
        redirect: 'follow',
        signal: AbortSignal.timeout(90000),
      });
    } catch (e) {
      if (attempt < tries) {
        await wait(attempt);
        continue;
      }
      throw new Error(`could not reach the booking web app (${e.message})`);
    }
    if (!res.ok) {
      if (attempt < tries) {
        await wait(attempt);
        continue;
      }
      throw new Error(`the booking web app answered ${res.status}`);
    }
    const json = await res.json().catch(() => null);
    if (json && json.ok === false)
      throw new Error(json.error?.message || 'the booking web app returned an error');
    const parsed = envelope.and(schema).safeParse(json);
    if (parsed.success) return parsed.data;
    if (attempt < tries) {
      await wait(attempt);
      continue;
    }
    throw new Error(`the booking web app sent an unexpected answer to "${body.action}"`);
  }
}
function wait(attempt) {
  console.log(`menu: the booking web app did not answer properly, trying again (${attempt})…`);
  return new Promise((ok) => setTimeout(ok, attempt * 5000));
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
  const raw = await call({ action: 'menu' }, menuSchema);
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

  // photos: reused from the cache when the same version was downloaded before, otherwise one request each
  fs.rmSync(PHOTO_DIR, { recursive: true, force: true });
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const files = new Map(); // photo id -> public path
  const wanted = new Set();
  const queue = [...new Map(items.map((it) => [it.photo.id, it.photo])).values()];
  let done = 0,
    reused = 0;
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const base = slug(p.name.replace(/\.[a-z0-9]+$/i, '')) || 'dish';
      const file = `${base}-${p.updated.toString(36)}${EXT[p.type]}`;
      const cached = path.join(CACHE_DIR, `${p.id}-${p.updated}-${p.size}${EXT[p.type]}`);
      wanted.add(path.basename(cached));
      if (fs.existsSync(cached) && fs.statSync(cached).size === p.size) reused++;
      else {
        const r = await call({ action: 'menuPhoto', id: p.id }, photoDataSchema);
        fs.writeFileSync(cached, Buffer.from(r.data, 'base64'));
        done++;
      }
      fs.copyFileSync(cached, path.join(PHOTO_DIR, file));
      files.set(p.id, `/images/menu/${file}`);
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));
  for (const f of fs.readdirSync(CACHE_DIR)) if (!wanted.has(f)) fs.rmSync(path.join(CACHE_DIR, f));
  console.log(`menu: ${items.length} dishes, ${done} photos downloaded, ${reused} unchanged`);

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
  // the staff page shows these copies instead of downloading each photo again: Drive id and version -> file
  const index = Object.fromEntries(
    items.map((it) => [`${it.photo.id}:${it.photo.updated}`, files.get(it.photo.id)]),
  );
  fs.writeFileSync(path.join(PHOTO_DIR, 'index.json'), JSON.stringify(index) + '\n');
}

main().catch((e) => fail([e.message]));
