# Hearth & Bean

Website and table-booking system for Hearth & Bean, a neighbourhood restaurant, roastery and bakery on Walcot Street
in Bath.

**Live site:** https://hearth-and-bean-bath.netlify.app

## What it does

- **Home page:** a scroll-driven story of the restaurant. A 120-frame film drawn to a canvas opens up as you scroll,
  then a pinned "one day at the hearth" sequence with a sky that moves from dawn to night. After that come a horizontal
  menu rail, an interactive dish with hotspots, a draggable staff row and the booking form.
- **Menu (`/menu`):** the full menu in five categories, with sticky section tabs that follow the scroll.
- **About (`/about`):** the restaurant's story, opening hours, how to find it and contact details.
- **Table booking:** guests choose party size, date, part of the day and seating area, and see the times that are
  really free for their party. The sentence above the form rewrites itself as they choose.
- **Staff portal (`/staff`):** a signed-in tool for running the day. Staff can answer requests, approve, seat,
  finish or cancel bookings, add phone bookings and walk-ins, edit bookings, and move a party to another table on a
  live floor plan with a time slider.
- **Accessibility and motion:** every control works with the keyboard, the pop-ups follow the ARIA listbox and dialog
  patterns, and visitors who prefer reduced motion get a still, fully readable page.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Data fetching | TanStack React Query (queries, mutations, background refresh) with native `fetch` |
| Validation | Zod: every API response, the booking form and the staff forms |
| Animation | GSAP with ScrollTrigger, Draggable and Inertia |
| Backend | Google Apps Script web app over a Google Sheet (`google-apps-script/Code.gs`) |
| Hosting | Static export (`output: 'export'`) deployed on Netlify from GitHub |
| Code quality | ESLint (Next.js core web vitals and TypeScript rules), Prettier |

## How it works

```
Browser (Next.js static pages)
  ├── React Query ── fetch (POST, JSON) ──► Google Apps Script web app ──► Google Sheet
  │                                          (Bookings, Tables, Hours, Settings, Staff tabs)
  └── Zod checks every answer before the UI uses it
```

- **Static first.** Every page is pre-rendered to HTML at build time, so the site is fast and needs no server. Only
  the booking form and the staff portal are client components.
- **Booking API.** One module, `src/lib/booking-api.ts`, talks to the backend. Each request is a single POST sent as
  plain text, so the browser makes a simple request with no CORS preflight. Zod schemas describe every response.
- **Availability.** The form asks for free times only when the visitor scrolls near it. Answers are cached for 30
  seconds per date and party size, and quick changes are debounced into one request.
- **Business rules live in the backend.** A booking holds the smallest free table that fits for 90 minutes (5 or more
  guests: 120). It has statuses with allowed transitions (waiting, confirmed, seated, finished, no-show, declined,
  cancelled) and email notifications to the guest and the restaurant. All of these are enforced in `Code.gs` under a
  script lock, so two guests can never take the same table.
- **Staff authentication.** Passwords stay in the Sheet. A successful sign-in returns an HMAC-signed token that expires
  after 12 hours. Every staff action is verified on the server, and repeated failed sign-ins are slowed down.
- **Content as data.** All 50 dishes (name, description, price, photo, category, home-page placement) live in one typed
  file, `src/data/menu.ts`, which feeds both the home page rail and the full menu.
- **Times are the restaurant's.** Dates and times are handled in Europe/London whatever the visitor's own time zone.

## Project structure

```
src/
  app/                    routes (App Router): /, /menu, /about, /staff, 404, robots.txt, sitemap.xml
    layout.tsx            root layout, fonts, global styles
    providers.tsx         React Query client
  components/
    home/                 home page sections: Hero, Manifesto, Day, Marquee, Menu, Pan, People, Reserve, Footer
    menu/, about/, site/  inner pages and their shared header and footer
  features/
    booking/              booking form: React Query, custom dropdown and calendar, Zod contact checks
    staff/                staff portal: sign-in, day view, table plan, booking dialog
    home/                 scroll animations (GSAP)
    menu/                 menu page section tabs
  lib/
    booking-api.ts        API client and Zod schemas
    dates.ts              date and time helpers (Europe/London)
  data/menu.ts            the menu
  styles/                 design system CSS (base, global, page styles, self-hosted fonts)
public/                   photos, film frames, fonts, Netlify headers
google-apps-script/
  Code.gs                 backend: availability, bookings, staff sign-in and actions, emails
  local-test/             runs Code.gs locally against in-memory sheets, for development and tests
```

## Running locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run mock-api     # local booking backend on :8792 (test sign-in: staff / local-test-pass)
npm run dev          # http://localhost:3000
```

Environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_BOOKING_API_URL` | Booking backend address. When empty, the form runs in preview mode and sends nothing. |
| `NEXT_PUBLIC_SITE_URL` | Public site address for canonical links, social previews and the sitemap (set automatically on Netlify). |

Scripts: `npm run build` (static export to `out/`), `npm run lint`, `npm run typecheck`, `npm run format`.
