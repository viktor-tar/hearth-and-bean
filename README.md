# Hearth & Bean

A café-restaurant website with online table booking and a staff portal for managing bookings and the menu.

**Live site:** [hearth-and-bean-bath.netlify.app](https://hearth-and-bean-bath.netlify.app)

![Scrolling through the Hearth & Bean home page](docs/screenshots/home-scroll.gif)

## Highlights

- **No double bookings.** Every booking change is processed one at a time on the server and checked against table
  sizes, opening hours and existing bookings, so two guests can never end up at the same table.
- **Restaurant staff manage the menu themselves.** Dishes, prices and photos are edited in the staff portal and stored
  in Google Sheets and Drive. Saving triggers a Netlify build hook (a link that rebuilds the site), so the website
  updates without a developer.
- **Type-safe frontend.** TypeScript in strict mode, and one API client that checks every server response with Zod
  before the UI uses it.
- **Tested in a real browser.** Playwright tests cover booking, the staff portal and the menu editor against a local
  copy of the backend.

## Features

### Table booking (guests)

- Guests choose the party size, date and seating area (window, fireside, room or bar).
- Only times with a free table for that party are offered, based on opening hours, table sizes and existing bookings.
- A request is saved as **pending** with a reference number. The guest gets a confirmation email and the restaurant
  gets a notification with a link to the staff portal.
- Built-in spam protection: a hidden field that catches spam bots, an hourly request limit and a duplicate-booking
  check.

### Staff portal: bookings (`/staff`)

- Staff sign in with their own username and password.
- **Requests:** new online requests can be confirmed or declined, and the guest is emailed automatically.
- **Day view:** every booking of the day with a summary of bookings and guests (covers). Staff can add phone bookings
  and walk-ins, edit details, and mark guests as seated, finished or no-show.
- **Table plan:** an interactive floor plan with a time slider. It shows which tables are taken at any moment, and a
  booking can be moved to another table.
- The system picks a suitable table for every booking and refuses any change that would double-book a table.

![A booking from the website to the staff portal](docs/screenshots/booking-flow.gif)

The staff portal is password-protected, so the recordings show it in use. To try it yourself, run the project
locally with the mock backend (see [Running locally](#running-locally) for the sign-in details).

### Staff portal: menu editor

- Lists every dish with its photo, price and section, with search and section filters.
- Staff can add a dish, edit its name, description and price, or hide it from the website without deleting it.
- Dish photos are uploaded straight from the browser. Large images are resized before upload.
- Staff choose a dish's position in its menu section and whether it appears on the home page.
- Saving publishes the change: the website rebuilds itself with the new menu, without a developer.

![Changing a price in the menu editor and seeing it on the website](docs/screenshots/menu-update.gif)

### Website

- A scroll-driven home page with an image sequence that plays like a film as you scroll, GSAP animations, a full menu
  with sticky section tabs, and an about page.
- Accessible: everything works with the keyboard, pop-ups and dialogs close with Escape and keep keyboard focus in
  the right place, and visitors who prefer reduced motion get a still page.

![Menu page](docs/screenshots/menu.jpg)

## Architecture

```
Next.js site (Netlify)  ──POST requests──►  Google Apps Script web app  ──►  Google Sheets (all data)
                                                                       └─►  Google Drive (dish photos)
                                                                       └─►  Gmail (booking emails)
Staff saves the menu  ──►  Netlify build hook  ──►  site rebuilt with the latest menu
```

### Frontend

The website is built with Next.js and exported as static pages, so it loads fast and needs no server of its own. The
booking form and the staff portal talk to the backend through one typed API client (`src/lib/booking-api.ts`). It uses
TanStack Query for loading and saving data, and every response is validated with Zod before it reaches the UI.

### Backend: Google Apps Script

The backend is a Google Apps Script web app (`google-apps-script/`) published at a single URL. The site sends it JSON
requests, and the script reads and writes the Google Sheet, stores photos in Google Drive and sends emails. All
booking rules are enforced here, and changes are processed one at a time, so two people can never take the same table
at the same time.

| Request                                   | Used by       | What it does                                                    |
| ----------------------------------------- | ------------- | --------------------------------------------------------------- |
| `config`                                  | Booking form  | Opening hours, seating areas, party size limits                 |
| `availability`                            | Booking form  | Free times for a date and party size                            |
| `book`                                    | Booking form  | Saves a request, picks a table, emails the guest and restaurant |
| `login`                                   | Staff portal  | Checks the password and returns a signed token (valid 12 hours) |
| `day`                                     | Staff portal  | Bookings, requests and tables for one day                       |
| `setStatus`, `assign`, `create`, `update` | Staff portal  | Confirm or decline, move tables, add and edit bookings          |
| `menuAdmin`, `menuSave`, `menuUpload`     | Menu editor   | List, save and add photos to dishes                             |
| `menuPublish`                             | Menu editor   | Triggers a Netlify rebuild so the menu goes live                |
| `menu`, `menuPhoto`                       | Netlify build | Downloads the menu and photos into the site                     |

Every staff request carries the signed token and is checked on the server. Request fields, responses and error
codes are documented in [docs/API.md](docs/API.md).

### Data: Google Sheets and Drive

The Google Sheet works as the database, so the restaurant can also view and edit everything in a familiar
spreadsheet.

| Tab      | Holds                                                                      |
| -------- | -------------------------------------------------------------------------- |
| Bookings | Every booking: guest details, date, time, table, status, who changed it    |
| Tables   | Table sizes, seating areas and positions on the floor plan                 |
| Hours    | Opening hours for each day of the week                                     |
| Settings | Restaurant email, booking rules (slot length, notice, party size, emails)  |
| Staff    | Staff accounts; passwords are stored as salted hashes, never as plain text |
| Menu     | Dishes: name, description, price, section, position, photo, visibility     |

Dish photos are stored in a Google Drive folder and copied into the site when it is built.

## Tech stack

| Area       | Technology                                                            |
| ---------- | --------------------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router, static export), React 19, TypeScript (strict) |
| Data       | TanStack Query, native `fetch`                                        |
| Validation | Zod for every API response and form                                   |
| Animation  | GSAP with ScrollTrigger, Draggable and Inertia                        |
| Backend    | Google Apps Script, Google Sheets, Google Drive, Gmail                |
| Hosting    | Netlify, deployed from GitHub, with a build hook for menu updates     |
| Testing    | Playwright end-to-end tests against a local copy of the backend       |
| Tooling    | ESLint, Prettier                                                      |

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
  data/             menu data, plus a saved copy used when no backend is connected
  styles/           design system CSS and self-hosted fonts
scripts/            build step that syncs the menu from the Sheet
google-apps-script/ backend (Code.gs, Menu.gs, MenuAdmin.gs) and a local test server
tests/e2e/          Playwright tests
public/             images, film frames, fonts
```

## Running locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run mock-api   # local backend on :8792 (sign-in: staff / local-test-pass)
npm run dev        # http://localhost:3000
```

Set `NEXT_PUBLIC_BOOKING_API_URL` in `.env.local` (see `.env.example`). Left empty, online booking is switched off:
the form still shows but sends nothing, and the site uses a saved copy of the menu included in the repo. Other scripts:
`npm run build`, `npm run lint`, `npm run typecheck`.

## Testing

```bash
npx playwright install chromium   # once
npm run test:e2e
```

The tests start the mock backend, build the site against it and run in Chromium. Each test starts from fresh data.
They cover the public pages, a guest booking (including the emails sent), double-booking protection, staff sign-in,
confirming requests, adding phone bookings, and the menu editor: search and filters, price changes, hiding dishes,
validation, photo upload and positions.

## Setting up the backend

1. Create a Google Sheet and open **Extensions → Apps Script**. Add the three files from `google-apps-script/`.
2. Run `setup` once, then `setupMenu`. They create the tabs with default tables, opening hours and settings, a first
   staff account, the starter menu and a Drive folder for dish photos.
3. Choose **Deploy → New deployment → Web app**, set **Execute as: Me** and **Who has access: Anyone**, then copy the
   web app URL.
4. Put the URL in `NEXT_PUBLIC_BOOKING_API_URL`, both in `.env.local` and in the Netlify environment variables.
5. To let staff publish the menu, create a build hook in Netlify and add its URL to the Settings tab as
   `menuBuildHook`.

## License

The code is released under the [MIT License](LICENSE).

## Author

Built by **Victor Tar** · [LinkedIn](https://www.linkedin.com/in/viktor-tar/) ·
[GitHub](https://github.com/viktor-tar). Developed with AI-assisted tooling (Claude Code).
