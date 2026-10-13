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
/* the published site: its photos (listed in /images/menu/index.json by Drive id and version) are copied from there
   instead of asking the sheet again, so a build only downloads new or changed photos from Drive */
const LIVE = (process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || '').replace(/\/$/, '');

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
    let why;
    try {
      const res = await fetch(API, {
        method: 'POST',
        body: JSON.stringify(body),
        redirect: 'follow',
        signal: AbortSignal.timeout(90000),
      });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* not JSON: described below */
      }
      if (json && json.ok === false)
        throw Object.assign(new Error(json.error?.message || 'the booking web app returned an error'), {
          final: true,
        });
      const parsed = json && envelope.and(schema).safeParse(json);
      if (parsed?.success) return parsed.data;
      why = !res.ok
        ? `HTTP ${res.status}`
        : json
          ? `an answer without the expected fields (${Object.keys(json).join(', ')})`
          : `a ${res.headers.get('content-type') || 'non-JSON'} page: "${text
              .replace(/<[^>]*>|\s+/g, ' ')
              .trim()
              .slice(0, 80)}"`;
    } catch (e) {
      if (e.final) throw e;
      why = `no answer (${e.message})`;
    }
    if (attempt >= tries)
      throw new Error(`the booking web app did not answer "${body.action}" properly: ${why}`);
    await wait(attempt, `${body.action}: ${why}`);
  }
}
function wait(attempt, why) {
  console.log(`menu: ${why}; trying again (${attempt})…`);
  return new Promise((ok) => setTimeout(ok, attempt * 5000));
}

function fail(lines) {
  console.error(
    '\n✖ Menu not published. Fix the Menu tab and publish again:\n  ' + lines.join('\n  ') + '\n',
  );
  process.exit(1);
}

/** The live site's photo index (Drive id:version -> file), or an empty one when it cannot be read. */
async function liveIndex() {
  if (!LIVE) return {};
  try {
    const r = await fetch(`${LIVE}/images/menu/index.json`, { signal: AbortSignal.timeout(20000) });
    return r.ok ? z.record(z.string(), z.string()).parse(await r.json()) : {};
  } catch {
    return {};
  }
}
let liveFiles = {};
/** Copies a photo from the live site into the cache when that exact version is published there. */
async function fromLive(p, cached) {
  const file = liveFiles[`${p.id}:${p.updated}`];
  if (!file) return false;
  try {
    const r = await fetch(LIVE + file, { signal: AbortSignal.timeout(30000) });
    const bytes = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
    if (!bytes || bytes.length !== p.size) return false;
    fs.writeFileSync(cached, bytes);
    return true;
  } catch {
    return false;
  }
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
    reused = 0,
    fromSite = 0;
  liveFiles = await liveIndex();
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const base = slug(p.name.replace(/\.[a-z0-9]+$/i, '')) || 'dish';
      const file = `${base}-${p.updated.toString(36)}${EXT[p.type]}`;
      const cached = path.join(CACHE_DIR, `${p.id}-${p.updated}-${p.size}${EXT[p.type]}`);
      wanted.add(path.basename(cached));
      if (fs.existsSync(cached) && fs.statSync(cached).size === p.size) reused++;
      else if (await fromLive(p, cached)) fromSite++;
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
  console.log(
    `menu: ${items.length} dishes; photos: ${done} from Drive, ${fromSite} from the live site, ${reused} cached`,
  );

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
