# Hearth & Bean

The Hearth & Bean website (Walcot Street, Bath), moved off Webflow. It looks and behaves the same as the Webflow
site: the same pages, design, scroll film, animations, booking form and staff page.

- **Pages:** Home (`/`), Menu (`/menu`), About (`/about`), Staff (`/staff`) and the 404 page.
- **Bookings:** the guest booking form and the staff page talk to the existing Google Sheet through its
  Google Apps Script web app (`google-apps-script/Code.gs`). Nothing changes in the Sheet or the script.
- **Hosting:** the site is exported as plain static files, so Netlify hosts all of it. There is no server to run.

## Tech stack

| Part                                            | What it does                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| Next.js 16 (App Router) + React 19 + TypeScript | Pages and components, exported as static HTML (`output: 'export'`)                    |
| TanStack React Query                            | Loading available times, sending booking requests, the staff day view and its actions |
| Zod                                             | Checks every answer from the booking sheet, and the booking and staff forms           |
| GSAP (ScrollTrigger, Draggable, Inertia)        | The scroll animations on the home page, as on the Webflow site                        |
| native `fetch`                                  | All calls to the Apps Script web app                                                  |
| ESLint + Prettier                               | Code checks and formatting                                                            |

About styling: the design's CSS is kept as it came out of Webflow (`src/styles/webflow.css`) plus the hand-written
global styles (`src/styles/global.css`, `staff.css`, `menu-page.css`, `home-landscape.css`). Those class names are
what the animations and the original design rely on, so they stay global instead of being renamed into CSS Modules.
CSS Modules work out of the box for any new component (`Something.module.css`).

## Folders

```
src/app/                 the pages (page.tsx per route), layout, robots.txt, sitemap.xml
src/components/home/     the home page sections (Hero, Manifesto, Day, Menu, Pan, People, Reserve, Footer …)
src/components/…         About, Menu, 404 and the shared top bar / footer of the inner pages
src/data/menu.ts         ALL the dishes: name, description, price, photo, category, and which appear on the home page
src/features/booking/    the booking form (React Query + Zod)
src/features/staff/      the staff page (sign in, day view, table plan, new / edit bookings)
src/features/home/       the home page's scroll animations (motion.ts)
src/lib/booking-api.ts   the one place that talks to the Google Apps Script (Zod schemas for every answer)
src/styles/              the design's CSS
public/images, public/film, public/fonts   photos, the 120 frames of the hero film, the two typefaces
google-apps-script/      Code.gs (the booking backend) and a local stand-in for testing
```

## Settings (environment variables)

| Variable                      | What it is                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BOOKING_API_URL` | The Apps Script web app address (Apps Script → Deploy → Manage deployments → Web app URL). Empty = the form stays in preview and sends nothing.                                                   |
| `NEXT_PUBLIC_SITE_URL`        | The site's public address, e.g. `https://hearth-and-bean.netlify.app`. Used for social previews, the canonical link and the sitemap. On Netlify builds from GitHub it is filled in automatically. |

For work on your computer, put them in `.env.local` (see `.env.example`). `.env.local` is never uploaded to GitHub.

The booking address is not a secret: browsers see it whenever someone books, as on the Webflow site. Security comes
from the script itself: the staff password stays in the Sheet's Staff tab, staff actions need a signed token that
runs out after 12 hours, and every request is checked and cleaned on the Google side.

## Run it on your computer

Needs Node.js 20.9 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
```

Other commands: `npm run build` (makes the `out/` folder), `npm start` (serves `out/`), `npm run lint`,
`npm run typecheck`, `npm run format`.

To try bookings without touching the real Sheet: `npm run mock-api`, then set
`NEXT_PUBLIC_BOOKING_API_URL=http://localhost:8792` in `.env.local`. The test sign-in is `staff` / `local-test-pass`.

## Deploy on Netlify

**Option A, from GitHub (recommended).** In Netlify: Add new project → Import an existing project → GitHub →
`hearth-and-bean`. The build settings come from `netlify.toml` (`npm run build`, publish `out`). Before the first
deploy, add `NEXT_PUBLIC_BOOKING_API_URL` under Project configuration → Environment variables. Every push to `main`
then redeploys the site.

**Option B, drag and drop.** Run `npm run build` (with `.env.local` filled in) and drag the `out` folder onto
Netlify's deploy page. Netlify does not build anything in this mode, so drop the built `out` folder, not the source.

## After the move

- In the Google Sheet, Settings tab: change `portalUrl` to the new staff page address (for example
  `https://<your-site>.netlify.app/staff`). Restaurant emails link to it. It still points at the Webflow site.
- The script itself does not need a new deployment: the web app address stays the same.

## Changing things

- **A dish or a price:** edit `src/data/menu.ts`. A dish with `home` set also appears on the home page rail.
  New photos go in `public/images/dishes`.
- **Opening hours, tables, staff sign-ins, booking rules:** in the Google Sheet, exactly as before.
- **Text on a page:** the section components in `src/components`.
