/**
 * The menu: one list feeds both the full menu page (/menu) and the "On the counter" rail on the home page.
 *
 * The dishes come from the "Menu" tab of the Google Sheet and their photos from its Drive folder. Before every build,
 * scripts/sync-menu.mjs downloads both and writes src/data/menu.json (photos go to public/images/menu). Without the
 * sheet (local work), the committed snapshot src/data/menu.snapshot.json is used.
 */
import { z } from 'zod';
import menuJson from './menu.json';
export type CategoryId =
  | 'artisanal-snacks-and-boards'
  | 'hearty-mains-and-sandwiches'
  | 'hearth-baked-breads-and-pastries'
  | 'signature-coffee-and-espresso'
  | 'tea-and-specialty-drinks';

export type HomeGroup = 'Coffee and tea' | 'From the oven' | 'Kitchen' | 'After dark';

export interface Dish {
  name: string;
  description: string;
  /** Shown as written, e.g. "£4.50". */
  price: string;
  image: string;
  category: CategoryId;
  /** Position on /menu inside its category. */
  menuOrder: number;
  /** Set to feature the dish on the home page. */
  home?: { group: HomeGroup; order: number };
}

/** Sections of /menu, in page order. */
export const categories: { id: CategoryId; title: string }[] = [
  {
    id: 'artisanal-snacks-and-boards',
    title: 'Artisanal Snacks & Boards',
  },
  {
    id: 'hearty-mains-and-sandwiches',
    title: 'Hearty Mains & Sandwiches',
  },
  {
    id: 'hearth-baked-breads-and-pastries',
    title: 'Hearth-Baked Breads & Pastries',
  },
  {
    id: 'signature-coffee-and-espresso',
    title: 'Signature Coffee & Espresso',
  },
  {
    id: 'tea-and-specialty-drinks',
    title: 'Tea & Specialty Drinks',
  },
];

/** The four group cards on the home page rail, in order. */
export const homeGroups: { group: HomeGroup; title: string; text: string }[] = [
  {
    group: 'Coffee and tea',
    title: 'Morning',
    text: 'Coffee roasted here, bread from the oven.',
  },
  {
    group: 'From the oven',
    title: 'To start',
    text: 'Small plates to share.',
  },
  {
    group: 'Kitchen',
    title: 'Mains',
    text: 'Cooked over the fire.',
  },
  {
    group: 'After dark',
    title: 'Puddings',
    text: 'Warm, by the fire.',
  },
];

const CATEGORY_IDS = categories.map((c) => c.id) as [CategoryId, ...CategoryId[]];
const HOME_GROUPS = homeGroups.map((g) => g.group) as [HomeGroup, ...HomeGroup[]];

const dishSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.string().min(1),
  image: z.string().startsWith('/images/'),
  category: z.enum(CATEGORY_IDS),
  menuOrder: z.number().int(),
  home: z.object({ group: z.enum(HOME_GROUPS), order: z.number().int() }).optional(),
});

/** Every dish, checked once when the site is built. */
export const dishes: Dish[] = z.object({ dishes: z.array(dishSchema) }).parse(menuJson).dishes;

export const dishesIn = (category: CategoryId): Dish[] =>
  dishes.filter((d) => d.category === category).sort((a, b) => a.menuOrder - b.menuOrder);

export const featuredDishes = (): Dish[] =>
  dishes.filter((d) => d.home).sort((a, b) => (a.home?.order ?? 0) - (b.home?.order ?? 0));
