# Hearth & Bean

A café-restaurant website with online table booking and a staff portal for managing bookings and the menu.

**Live site:** [hearth-and-bean-bath.netlify.app](https://hearth-and-bean-bath.netlify.app)

![Hearth & Bean home page](docs/screenshots/home.jpg)

## Features

- **Table booking.** Guests choose party size, date and seating area and see only the times that are really free for
  their party.
- **Staff portal (`/staff`).** Signed-in staff answer requests, add phone bookings and walk-ins, and seat or move
  guests on a live table plan with a time slider.
- **Menu editor.** Staff edit dishes, prices, order and photos, or hide a dish. Saving publishes the change to the
  website automatically, usually within a minute.
- **Pages.** A scroll-driven home page (canvas film, GSAP animations), a full menu with sticky section tabs, and an
  about page.
- **Accessibility.** Every control works with the keyboard, pop-ups follow the ARIA dialog and listbox patterns, and
  reduced-motion visitors get a still, fully readable page.

![Staff portal: bookings and menu editor](docs/screenshots/staff-portal.jpg)

## Tech stack

| Area       | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router, static export), React 19, TypeScript (strict)      |
| Data       | TanStack Query (queries, mutations, background refresh), native `fetch`    |
| Validation | Zod for every API response and form                                        |
| Animation  | GSAP with ScrollTrigger, Draggable and Inertia                             |
| Backend    | Google Apps Script web app over Google Sheets; menu photos in Google Drive |
| Hosting    | Netlify, deployed from GitHub; menu changes trigger a build hook           |
| Tooling    | ESLint, Prettier                                                           |

## How it works

```
Browser (static Next.js pages)
  └── TanStack Query ── fetch ──► Apps Script web app ──► Google Sheet (bookings, tables, hours, staff, menu)
                                                      └─► Google Drive (dish photos)
Netlify build
  └── sync-menu: Menu tab + photos ──► Zod ──► typed menu data + static images ──► next build
```

- **Static site.** All pages are pre-rendered at build time, so the site loads fast and needs no server of its own.
  Only the booking form and the staff portal load live data.
- **Typed API layer.** `src/lib/booking-api.ts` is the single client for the backend. Every response is validated
  with Zod, so the UI only works with typed, checked data.
- **Server-side business rules.** Availability, table assignment and booking statuses are enforced in the backend,
  which prevents double bookings.
- **Secure staff access.** Staff sign in with signed tokens that expire after 12 hours, and every staff action is
  verified on the server.
- **Content managed by staff.** Dishes are stored in Google Sheets and Drive and edited in the staff portal. Saving
  triggers a Netlify rebuild, so the public menu updates without a developer.

![Menu page](docs/screenshots/menu.jpg)

## Project structure

```
src/
  app/              routes: /, /menu, /about, /staff, 404, sitemap, robots
  components/       page sections (home, menu, about) and shared header and footer
  features/
    booking/        booking form
    staff/          staff portal: sign-in, day view, table plan, booking dialog, menu editor
    home/, menu/    scroll animations and menu tabs
  lib/              API client with Zod schemas, date helpers
  data/             menu data and the snapshot used for local work
  styles/           design system CSS and self-hosted fonts
scripts/            build step that syncs the menu from the Sheet
google-apps-script/ backend (Code.gs, Menu.gs, MenuAdmin.gs) and a local test server
public/             images, film frames, fonts
```

## Running locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run mock-api   # local backend on :8792 (sign-in: staff / local-test-pass)
npm run dev        # http://localhost:3000
```

Set `NEXT_PUBLIC_BOOKING_API_URL` in `.env.local` (see `.env.example`). Left empty, the booking form runs in preview
mode and the committed menu snapshot is used. Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`.

## Author

Built by **Victor Tar** · [LinkedIn](https://www.linkedin.com/in/viktor-tar/) ·
[GitHub](https://github.com/viktor-tar). Developed with AI-assisted tooling (Claude Code).
