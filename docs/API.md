# API reference

The website talks to a Google Apps Script web app (`google-apps-script/`). This page describes every request it
accepts and what it answers. On the client, the same contract is defined as Zod schemas in
[`src/lib/booking-api.ts`](../src/lib/booking-api.ts), and every response is validated against them.

## Basics

- **One endpoint.** All requests go to the web app URL (`NEXT_PUBLIC_BOOKING_API_URL`) as `POST`.
- **Body.** A JSON object sent as plain text, so the browser makes a simple request without a CORS preflight. The
  `action` field selects the operation.
- **Formats.** Dates are `YYYY-MM-DD`, times are `HH:MM`, and timestamps are milliseconds since 1970 (UTC).
- **Staff requests** must include the `token` returned by `login`. Tokens are HMAC-signed and expire after 12 hours.
  An invalid or expired token, or a staff member who has been deactivated, gets the `auth` error.

### Response envelope

Every answer has `ok`. On success the fields described below are added; on failure there is an `error` object with a
machine-readable `code` and a message that can be shown to the user.

```json
{ "ok": true, "ref": "HB-PH4L", "status": "pending" }
```

```json
{
  "ok": false,
  "error": { "code": "slot_taken", "message": "That time has just been taken. Please choose another." }
}
```

## Public requests

### `config`

Restaurant settings for the booking form.

**Request:** `{ "action": "config" }`

**Response:**

| Field          | Type     | Description                                                |
| -------------- | -------- | ---------------------------------------------------------- |
| `name`         | string   | Restaurant name                                            |
| `maxGuests`    | number   | Largest party that can book online                         |
| `slotMinutes`  | number   | Minutes between bookable times                             |
| `maxDaysAhead` | number   | How many days ahead guests can book                        |
| `today`        | string   | Today's date in the restaurant's time zone                 |
| `hours`        | array    | Seven entries, Sunday first: `{ closed, first?, last? }`   |
| `zones`        | string[] | Seating areas, for example `Window`, `Fire`, `Room`, `Bar` |

### `availability`

Bookable times for one date and party size.

**Request:** `{ "action": "availability", "date": "2026-10-20", "guests": 4 }`

**Response:**

| Field     | Type    | Description                                                                 |
| --------- | ------- | --------------------------------------------------------------------------- |
| `date`    | string  | The requested date                                                          |
| `guests`  | number  | The party size                                                              |
| `closed`  | boolean | `true` when the restaurant is closed that day                               |
| `slots`   | array   | `{ time, state }`, where `state` is `free`, `full` or `late` (too soon)     |
| `seating` | array   | `[area, minGuests, maxGuests]` for every table, to offer only fitting areas |

**Errors:** `bad_date`, `bad_guests`, `too_many`

### `book`

Creates a booking request. A table is picked automatically, and the guest and restaurant are emailed.

**Request:**

| Field     | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `date`    | string | yes      | Booking date                                           |
| `time`    | string | yes      | One of the `free` times from `availability`            |
| `guests`  | number | yes      | Party size                                             |
| `name`    | string | yes      | Guest name                                             |
| `email`   | string | yes      | Used for confirmation emails                           |
| `phone`   | string | yes      | Contact number for the day                             |
| `seat`    | string | no       | Preferred seating area; ignored if no table there fits |
| `notes`   | string | no       | Up to 500 characters                                   |
| `website` | string | no       | Honeypot field; must stay empty (bots fill it in)      |

**Response:** `{ ref, status, date, time, guests, emailed }`. `status` is always `pending`.

**Errors:** `bad_date`, `bad_time`, `bad_guests`, `too_many`, `bad_name`, `bad_email`, `bad_phone`, `closed`,
`too_late`, `slot_taken`, `duplicate`, `slow_down`

## Staff requests: bookings

### `login`

**Request:** `{ "action": "login", "username": "...", "password": "..." }`

**Response:** `{ token, name, expires }`

**Errors:** `bad_login`. Repeated failed attempts are slowed down.

Passwords are stored in the Staff tab as salted, repeated HMAC-SHA256 hashes. A password typed into the tab as plain
text (a new account or a reset) is accepted once and replaced by its hash at that person's next sign-in.

### `day`

Everything the staff portal shows for one day.

**Request:** `{ "action": "day", "token": "...", "date": "2026-10-20" }` (`date` defaults to today)

**Response:**

| Field      | Type   | Description                                                                 |
| ---------- | ------ | --------------------------------------------------------------------------- |
| `date`     | string | The day shown                                                               |
| `today`    | string | Today's date                                                                |
| `nowMin`   | number | Current time in minutes after midnight                                      |
| `staff`    | string | Name of the signed-in staff member                                          |
| `bookings` | array  | [Booking](#booking-object) objects for the day                              |
| `requests` | array  | All pending requests from today onwards                                     |
| `summary`  | object | Counts per status, plus total `bookings` and `covers` (guests)              |
| `tables`   | array  | `{ id, zone, min, max, x, y, w, h, shape }`: floor plan position in percent |
| `hours`    | object | `{ closed, first?, last? }` for that day                                    |
| `settings` | object | `slotMinutes`, `durationSmall`, `durationLarge`, `maxGuests`, `name`        |

### `create`

Adds a booking taken by staff. A phone booking is saved as `confirmed` and the guest is emailed; a walk-in is saved
as `seated`.

**Request:** `date`, `time`, `guests` (1 to 40), `name`, plus optional `email`, `phone`, `notes`, `duration`
(minutes), `table`, `source` (`phone` or `walk-in`) and `notify` (`false` to skip the email).

**Response:** `{ booking }`

**Errors:** `bad_date`, `bad_time`, `bad_guests`, `bad_name`, `bad_email`, `bad_phone`, `bad_table`, `table_small`,
`table_taken`, `no_table`

### `update`

Edits a booking. If the time or party size changes, the booking keeps its table when it still fits, otherwise a new
one is chosen.

**Request:** `id` plus the same fields as `create`.

**Response:** `{ booking }`

**Errors:** as for `create`, plus `not_found`

### `setStatus`

Moves a booking to another status. Confirming, declining and cancelling email the guest unless `notify` is `false`.

**Request:** `{ "action": "setStatus", "token": "...", "id": "...", "status": "confirmed" }`

Allowed changes:

| From        | To                                         |
| ----------- | ------------------------------------------ |
| `pending`   | `confirmed`, `declined`, `cancelled`       |
| `confirmed` | `seated`, `noshow`, `cancelled`, `pending` |
| `seated`    | `finished`, `confirmed`                    |
| `finished`  | `seated`                                   |
| `noshow`    | `confirmed`                                |
| `declined`  | `pending`                                  |
| `cancelled` | `pending`                                  |

**Response:** `{ booking }`

**Errors:** `not_found`, `bad_move`, `no_table` (when a booking comes back but no table is free)

### `assign`

Moves a booking to another table, or lets the system pick one when `table` is empty.

**Request:** `{ "action": "assign", "token": "...", "id": "...", "table": "W3" }`

**Response:** `{ booking }`

**Errors:** `not_found`, `bad_table`, `table_small`, `table_taken`, `no_table`

### Booking object

| Field                             | Description                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `id`, `ref`                       | Internal id and the reference shown to the guest (`HB-PH4L`)                      |
| `date`, `time`                    | When the booking starts                                                           |
| `guests`, `duration`              | Party size and how long the table is held, in minutes                             |
| `name`, `email`, `phone`, `notes` | Guest details                                                                     |
| `seat`, `table`                   | Preferred seating area and assigned table                                         |
| `status`                          | `pending`, `confirmed`, `seated`, `finished`, `noshow`, `declined` or `cancelled` |
| `source`                          | `web`, `phone` or `walk-in`                                                       |
| `created`, `updated`, `updatedBy` | When it was made, last changed, and by whom                                       |

A booking holds its table while it is `pending`, `confirmed` or `seated`.

## Staff requests: menu

### `menuAdmin`

Every dish, including hidden ones, for the menu editor.

**Request:** `{ "action": "menuAdmin", "token": "..." }`

**Response:** `{ categories, homeGroups, items, edited, published, canPublish }`. `edited` and `published` are
timestamps, so the editor can show whether there are unpublished changes.

Each item:

| Field                          | Description                                                      |
| ------------------------------ | ---------------------------------------------------------------- |
| `row`                          | Row number in the Menu tab                                       |
| `name`, `description`, `price` | Dish text; price as shown, for example `£4.50`                   |
| `category`, `menuOrder`        | Menu section and position in it                                  |
| `homeGroup`, `homeOrder`       | Home page group and position, empty if not on the home page      |
| `active`                       | `false` when the dish is hidden from the website                 |
| `photo`                        | `{ id, name, type, size, updated }` from Google Drive, or `null` |

### `menuSave`

Adds a dish (no `row`) or updates one. Positions in the section and on the home page are renumbered 1, 2, 3… so no
two dishes share a place.

**Request:** `name`, `price`, `category`, `menuOrder`, plus optional `description`, `homeGroup`, `homeOrder` and
`active`. To update, also send `row` and `was` (the dish name the editor last saw), so a row that changed in the
meantime is never overwritten.

**Response:** `{ item }`

**Errors:** `bad_name`, `bad_price`, `bad_category`, `bad_order`, `bad_home`, `duplicate`, `changed`

### `menuUpload`

Uploads a new photo for a dish to Google Drive and links it in the Menu tab.

**Request:** `row`, `was`, `type` (`image/jpeg`, `image/png`, `image/webp` or `image/avif`) and `data` (the image as
base64, at most 4 MB).

**Response:** `{ item }`

**Errors:** `bad_type`, `bad_photo`, `too_big`, `changed`

### `menuPublish`

Triggers a Netlify build so the website shows the current menu. At most one build is started per minute; a request
inside that minute is answered with `queued: true` and `retryIn` (seconds), and the editor asks again after that.

**Request:** `{ "action": "menuPublish", "token": "..." }`

**Response:** `{ published, queued, retryIn }`

**Errors:** `no_hook`, `publish_failed`

## Build requests

Used by `scripts/sync-menu.mjs` during the Netlify build.

| Action      | Request fields | Response                                                           |
| ----------- | -------------- | ------------------------------------------------------------------ |
| `menu`      | none           | `{ categories, homeGroups, items }`: visible dishes only           |
| `menuPhoto` | `id`           | `{ id, name, type, data }`: one photo from the menu folder, base64 |

## Error codes

| Code                                                                       | Meaning                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `bad_request`                                                              | Unknown `action`                                     |
| `auth`                                                                     | Missing, invalid or expired staff token              |
| `bad_date`, `bad_time`, `bad_guests`, `bad_name`, `bad_email`, `bad_phone` | A field is missing or invalid                        |
| `too_many`                                                                 | Party is larger than online booking allows           |
| `closed`, `too_late`, `slot_taken`                                         | The chosen time can't be booked                      |
| `duplicate`                                                                | The same booking or dish already exists              |
| `slow_down`                                                                | Too many requests; try again later                   |
| `bad_move`                                                                 | Status change not allowed                            |
| `bad_table`, `table_small`, `table_taken`, `no_table`                      | The table doesn't exist, is too small or is taken    |
| `not_found`                                                                | The booking or photo no longer exists                |
| `changed`                                                                  | The dish was edited elsewhere; reload and try again  |
| `bad_price`, `bad_category`, `bad_order`, `bad_home`                       | Invalid dish field                                   |
| `bad_type`, `bad_photo`, `too_big`                                         | Photo format, content or size problem                |
| `no_hook`, `publish_failed`                                                | Publishing isn't set up or Netlify refused the build |
| `not_ready`                                                                | A required Sheet tab or column is missing            |
| `server`                                                                   | Unexpected error on the server                       |
