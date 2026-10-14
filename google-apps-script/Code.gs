/**
 * Hearth & Bean: bookings backend.
 * Lives inside one Google Sheet (Extensions > Apps Script) and is published as a web app.
 * The website's booking form and the staff page talk to it; bookings are rows in the "Bookings" tab.
 *
 * Tabs it creates on setup():  Bookings, Tables, Hours, Settings, Staff.
 * You can edit Tables, Hours, Settings and Staff by hand at any time: changes apply within a minute.
 *
 * @OnlyCurrentDoc
 */

var HB_VERSION = '1.2.0';

var HB_TABS = { bookings: 'Bookings', tables: 'Tables', hours: 'Hours', settings: 'Settings', staff: 'Staff' };

var HB_BOOKING_COLS = ['id', 'ref', 'created', 'date', 'time', 'guests', 'duration', 'name', 'email', 'phone',
  'notes', 'seat', 'table', 'status', 'source', 'updated', 'updatedBy'];

var HB_DEFAULT_SETTINGS = [
  ['restaurantName', 'Hearth & Bean', 'Name used in emails'],
  ['restaurantEmail', 'vikstarweb@gmail.com', 'New booking requests are emailed here'],
  ['portalUrl', 'https://hearth-and-bean-bath.netlify.app/staff', 'Link to the staff page, used in emails to the restaurant'],
  ['timezone', 'Europe/London', 'Time zone the restaurant runs on'],
  ['slotMinutes', '30', 'Minutes between bookable times'],
  ['durationSmall', '90', 'Minutes a table is held for 1 to 4 guests'],
  ['durationLarge', '120', 'Minutes a table is held for 5 or more guests'],
  ['maxGuests', '8', 'Largest party that can book online'],
  ['minNoticeMinutes', '60', 'How close to the time a guest can still book online'],
  ['maxDaysAhead', '60', 'How far ahead guests can book'],
  ['sendGuestEmails', 'TRUE', 'TRUE to email guests when a request is received, confirmed, declined or cancelled'],
  ['notifyRestaurant', 'TRUE', 'TRUE to email the restaurant about each new online request'],
  ['maxRequestsPerHour', '30', 'Most online requests accepted in one hour, a guard against spam']
];

var HB_DEFAULT_HOURS = [
  ['Monday', '12:00', '20:30', 'FALSE'],
  ['Tuesday', '12:00', '20:30', 'FALSE'],
  ['Wednesday', '12:00', '20:30', 'FALSE'],
  ['Thursday', '12:00', '21:00', 'FALSE'],
  ['Friday', '12:00', '21:30', 'FALSE'],
  ['Saturday', '09:00', '21:30', 'FALSE'],
  ['Sunday', '09:00', '19:30', 'FALSE']
];

/* id, zone, min guests, max guests, x, y, width, height (all four in % of the floor plan), shape, active */
var HB_DEFAULT_TABLES = [
  ['W1', 'Window', 1, 2, 14, 15, 8, 12, 'round', 'TRUE'],
  ['W2', 'Window', 1, 2, 29, 15, 8, 12, 'round', 'TRUE'],
  ['W3', 'Window', 2, 4, 46, 15, 12, 13, 'rect', 'TRUE'],
  ['W4', 'Window', 1, 2, 63, 15, 8, 12, 'round', 'TRUE'],
  ['F1', 'Fire', 1, 2, 13, 42, 8, 12, 'round', 'TRUE'],
  ['F2', 'Fire', 2, 4, 15, 66, 12, 13, 'rect', 'TRUE'],
  ['F3', 'Fire', 2, 4, 32, 82, 12, 13, 'rect', 'TRUE'],
  ['M1', 'Room', 2, 4, 36, 44, 12, 13, 'rect', 'TRUE'],
  ['M2', 'Room', 2, 4, 54, 44, 12, 13, 'rect', 'TRUE'],
  ['M3', 'Room', 4, 6, 53, 78, 17, 14, 'rect', 'TRUE'],
  ['M4', 'Room', 5, 8, 72, 62, 13, 24, 'rect', 'TRUE'],
  ['B1', 'Bar', 1, 2, 88, 22, 7, 10, 'round', 'TRUE'],
  ['B2', 'Bar', 1, 2, 88, 40, 7, 10, 'round', 'TRUE'],
  ['B3', 'Bar', 1, 2, 88, 58, 7, 10, 'round', 'TRUE']
];

var HB_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var HB_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* Statuses. A booking holds its table while it is pending, confirmed or seated. */
var HB_HOLDS = { pending: true, confirmed: true, seated: true };
var HB_MOVES = {
  pending: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['seated', 'noshow', 'cancelled', 'pending'],
  seated: ['finished', 'confirmed'],
  finished: ['seated'],
  noshow: ['confirmed'],
  declined: ['pending'],
  cancelled: ['pending']
};

/* ------------------------------------------------------------------ */
/* Sheet menu and one-time setup                                       */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Hearth & Bean')
    .addItem('Set up / repair tabs', 'setup')
    .addItem('Send a test email to the restaurant', 'sendTestEmail')
    .addSeparator()
    .addItem('Publish menu to the website', 'publishMenu')
    .addItem('Set up / repair the menu tab and photos', 'setupMenu')
    .addToUi();
}

/** Creates any missing tab with its headings and starting values. Never overwrites what is already there. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  hbEnsureTab_(ss, HB_TABS.bookings, HB_BOOKING_COLS, []);
  hbEnsureTab_(ss, HB_TABS.tables, ['id', 'zone', 'min', 'max', 'x', 'y', 'w', 'h', 'shape', 'active'], HB_DEFAULT_TABLES);
  hbEnsureTab_(ss, HB_TABS.hours, ['day', 'first', 'last', 'closed'], HB_DEFAULT_HOURS);
  hbEnsureTab_(ss, HB_TABS.settings, ['key', 'value', 'what it does'], HB_DEFAULT_SETTINGS);
  var staff = ss.getSheetByName(HB_TABS.staff);
  if (!staff) {
    hbEnsureTab_(ss, HB_TABS.staff, ['username', 'password', 'name', 'active'],
      [['staff', hbRandomWord_(10), 'Front of house', 'TRUE']]);
  }
  hbSecret_();
  CacheService.getScriptCache().remove('hb_config');
  return 'Tabs are ready.';
}

function sendTestEmail() {
  var S = hbConfig_().settings;
  MailApp.sendEmail({
    to: S.restaurantEmail, name: S.restaurantName,
    subject: 'Test email from the ' + S.restaurantName + ' booking sheet',
    body: 'If you can read this, booking emails will reach this address.'
  });
}

function hbEnsureTab_(ss, name, headers, rows) {
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  sh = ss.insertSheet(name);
  // plain text everywhere: dates, times and phone numbers must stay exactly as written
  sh.getRange(1, 1, sh.getMaxRows(), Math.max(headers.length, sh.getMaxColumns())).setNumberFormat('@');
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sh.setFrozenRows(1);
  if (rows.length) {
    var text = rows.map(function (r) { return r.map(function (v) { return String(v); }); });
    sh.getRange(2, 1, text.length, headers.length).setValues(text);
  }
  return sh;
}

function hbRandomWord_(n) {
  var abc = 'abcdefghjkmnpqrstuvwxyz23456789', out = '';
  var seed = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  for (var i = 0; i < n; i++) out += abc.charAt(parseInt(seed.substr(i * 2, 2), 16) % abc.length);
  return out;
}

/* ------------------------------------------------------------------ */
/* Web app entry points                                                */
/* ------------------------------------------------------------------ */

function doGet() {
  var ready = !!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HB_TABS.bookings);
  return hbJson_({ ok: true, service: 'Hearth & Bean bookings', version: HB_VERSION, ready: ready });
}

function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = hbRoute_(req);
    out.ok = true;
  } catch (err) {
    if (err && err.hb) out = { ok: false, error: { code: err.code, message: err.message } };
    else {
      console.error(err && err.stack ? err.stack : err);
      out = { ok: false, error: { code: 'server', message: 'Something went wrong on our side. Please try again.' } };
    }
  }
  return hbJson_(out);
}

function hbRoute_(req) {
  switch (String(req.action || '')) {
    case 'config': return hbPublicConfig_();
    case 'menu': return hbMenu_();
    case 'menuPhoto': return hbMenuPhoto_(req);
    case 'menuAdmin': return hbMenuAdmin_(req, hbAuth_(req));
    case 'menuSave': return hbMenuSave_(req, hbAuth_(req));
    case 'menuUpload': return hbMenuUpload_(req, hbAuth_(req));
    case 'menuPublish': return hbMenuPublish_(req, hbAuth_(req));
    case 'availability': return hbAvailability_(req);
    case 'book': return hbBook_(req);
    case 'login': return hbLogin_(req);
    case 'day': return hbDay_(req, hbAuth_(req));
    case 'setStatus': return hbSetStatus_(req, hbAuth_(req));
    case 'assign': return hbAssign_(req, hbAuth_(req));
    case 'create': return hbCreate_(req, hbAuth_(req));
    case 'update': return hbUpdate_(req, hbAuth_(req));
  }
  throw hbErr_('bad_request', 'Unknown request.');
}

function hbJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function hbErr_(code, message) {
  var e = new Error(message);
  e.hb = true; e.code = code;
  return e;
}

/* ------------------------------------------------------------------ */
/* Reading the sheet                                                   */
/* ------------------------------------------------------------------ */

function hbSheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw hbErr_('not_ready', 'The booking sheet is not set up yet.');
  return sh;
}

/** Rows of a tab as objects keyed by the heading row. Values are read as shown in the sheet (text). */
function hbRows_(name) {
  var values = hbSheet_(name).getDataRange().getDisplayValues();
  if (!values.length) return [];
  var head = values[0].map(function (h) { return String(h).trim(); });
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r], o = { _row: r + 1 }, any = false;
    for (var c = 0; c < head.length; c++) {
      var v = String(row[c] == null ? '' : row[c]).trim();
      if (v.charAt(0) === "'") v = v.substr(1);
      if (head[c]) o[head[c]] = v;
      if (v) any = true;
    }
    if (any) out.push(o);
  }
  return out;
}

function hbTrue_(v) { return /^(true|yes|y|1)$/i.test(String(v).trim()); }
function hbInt_(v, fallback) { var n = parseInt(v, 10); return isNaN(n) ? fallback : n; }

/** Tables, hours and settings. Cached for a minute so every request does not re-read three tabs. */
function hbConfig_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('hb_config');
  if (hit) { try { return JSON.parse(hit); } catch (e) { /* fall through and rebuild */ } }
  var settings = {};
  HB_DEFAULT_SETTINGS.forEach(function (d) { settings[d[0]] = d[1]; });
  hbRows_(HB_TABS.settings).forEach(function (r) { if (r.key && r.value !== '') settings[r.key] = r.value; });
  var S = {
    restaurantName: settings.restaurantName,
    restaurantEmail: settings.restaurantEmail,
    portalUrl: settings.portalUrl,
    timezone: settings.timezone || 'Europe/London',
    slotMinutes: Math.max(5, hbInt_(settings.slotMinutes, 30)),
    durationSmall: Math.max(15, hbInt_(settings.durationSmall, 90)),
    durationLarge: Math.max(15, hbInt_(settings.durationLarge, 120)),
    maxGuests: Math.max(1, hbInt_(settings.maxGuests, 8)),
    minNoticeMinutes: Math.max(0, hbInt_(settings.minNoticeMinutes, 60)),
    maxDaysAhead: Math.max(1, hbInt_(settings.maxDaysAhead, 60)),
    sendGuestEmails: hbTrue_(settings.sendGuestEmails),
    notifyRestaurant: hbTrue_(settings.notifyRestaurant),
    maxRequestsPerHour: Math.max(1, hbInt_(settings.maxRequestsPerHour, 30))
  };
  var tables = [];
  hbRows_(HB_TABS.tables).forEach(function (r, i) {
    if (!r.id || !hbTrue_(r.active)) return;
    var max = hbInt_(r.max, 0); if (max < 1) return;
    tables.push({
      id: r.id, zone: r.zone || 'Room', min: Math.max(1, hbInt_(r.min, 1)), max: max,
      x: parseFloat(r.x) || 0, y: parseFloat(r.y) || 0, w: parseFloat(r.w) || 10, h: parseFloat(r.h) || 12,
      shape: /round/i.test(r.shape) ? 'round' : 'rect', order: i
    });
  });
  var hours = {};
  hbRows_(HB_TABS.hours).forEach(function (r) {
    var d = -1, key = String(r.day || '').toLowerCase().substr(0, 3);
    for (var i = 0; i < 7; i++) if (HB_DAYS[i].toLowerCase().substr(0, 3) === key) d = i;
    if (d < 0) return;
    var first = hbToMin_(r.first), last = hbToMin_(r.last);
    hours[d] = { closed: hbTrue_(r.closed) || first == null || last == null || last < first, first: first, last: last };
  });
  var cfg = { settings: S, tables: tables, hours: hours };
  try { cache.put('hb_config', JSON.stringify(cfg), 60); } catch (e) { /* too large to cache: fine */ }
  return cfg;
}

/* ------------------------------------------------------------------ */
/* Dates and times. Everything is handled as text in the restaurant's  */
/* own time zone: dates "2026-10-15", times "19:00".                   */
/* ------------------------------------------------------------------ */

function hbToMin_(t) {
  var m = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?/i.exec(String(t || ''));
  if (!m) return null;
  var h = +m[1], mm = +m[2];
  if (m[3]) { if (h < 1 || h > 12) return null; h = (h % 12) + (/p/i.test(m[3]) ? 12 : 0); }
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}
function hbPad_(n) { return (n < 10 ? '0' : '') + n; }
function hbFromMin_(m) { return hbPad_(Math.floor(m / 60)) + ':' + hbPad_(m % 60); }

/** "2026-10-15" or "15/10/2026" -> "2026-10-15", or null. */
function hbDate_(d) {
  var s = String(d || '').trim(), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s), y, mo, da;
  if (m) { y = +m[1]; mo = +m[2]; da = +m[3]; }
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) { y = +m[3]; mo = +m[2]; da = +m[1]; }
  else return null;
  var t = new Date(Date.UTC(y, mo - 1, da));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== da) return null;
  return y + '-' + hbPad_(mo) + '-' + hbPad_(da);
}
function hbDayNumber_(date) { var p = date.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
function hbWeekday_(date) { var p = date.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
function hbNiceDate_(date) {
  var p = date.split('-');
  return HB_DAYS[hbWeekday_(date)] + ' ' + (+p[2]) + ' ' + HB_MONTHS[+p[1] - 1] + ' ' + p[0];
}
function hbNow_(S) {
  var s = Utilities.formatDate(new Date(), S.timezone, 'yyyy-MM-dd HH:mm');
  return { date: s.substr(0, 10), min: hbToMin_(s.substr(11)), stamp: s };
}
function hbDuration_(guests, S) { return guests >= 5 ? S.durationLarge : S.durationSmall; }

/* ------------------------------------------------------------------ */
/* Bookings and table availability                                     */
/* ------------------------------------------------------------------ */

function hbBookings_() {
  var out = [];
  hbRows_(HB_TABS.bookings).forEach(function (r) {
    if (!r.id) return;
    var date = hbDate_(r.date), start = hbToMin_(r.time);
    if (!date || start == null) return;
    out.push({
      _row: r._row, id: r.id, ref: r.ref, created: r.created, date: date, time: hbFromMin_(start), start: start,
      guests: hbInt_(r.guests, 1), duration: hbInt_(r.duration, 90), name: r.name, email: r.email, phone: r.phone,
      notes: r.notes, seat: r.seat, table: r.table, status: String(r.status || 'pending').toLowerCase(),
      source: r.source || 'web', updated: r.updated, updatedBy: r.updatedBy
    });
  });
  return out;
}

function hbPublicBooking_(b) {
  return {
    id: b.id, ref: b.ref, created: b.created, date: b.date, time: b.time, guests: b.guests, duration: b.duration,
    name: b.name, email: b.email, phone: b.phone, notes: b.notes, seat: b.seat, table: b.table, status: b.status,
    source: b.source, updated: b.updated, updatedBy: b.updatedBy
  };
}

/** Tables that seat this party and are not held by another booking during [start, start + duration). */
function hbFreeTables_(tables, dayBookings, guests, start, duration, exceptId) {
  var end = start + duration, busy = {};
  dayBookings.forEach(function (b) {
    if (b.id === exceptId || !b.table || !HB_HOLDS[b.status]) return;
    if (start < b.start + b.duration && b.start < end) busy[b.table] = true;
  });
  return tables.filter(function (t) { return !busy[t.id] && guests >= t.min && guests <= t.max; });
}

/** Smallest table that fits, in the area the guest asked for when there is one. */
function hbPickTable_(free, seat) {
  var want = String(seat || '').toLowerCase();
  var sorted = free.slice().sort(function (a, b) {
    var za = want && a.zone.toLowerCase() === want ? 0 : 1, zb = want && b.zone.toLowerCase() === want ? 0 : 1;
    return za - zb || a.max - b.max || a.order - b.order;
  });
  return sorted[0] || null;
}

function hbZones_(tables) {
  var seen = {}, out = [];
  tables.forEach(function (t) { if (!seen[t.zone]) { seen[t.zone] = true; out.push(t.zone); } });
  return out;
}

function hbPublicConfig_() {
  var cfg = hbConfig_(), S = cfg.settings, now = hbNow_(S), hours = [];
  for (var d = 0; d < 7; d++) {
    var h = cfg.hours[d];
    hours.push(!h || h.closed ? { closed: true } : { closed: false, first: hbFromMin_(h.first), last: hbFromMin_(h.last) });
  }
  return {
    name: S.restaurantName, maxGuests: S.maxGuests, slotMinutes: S.slotMinutes, maxDaysAhead: S.maxDaysAhead,
    today: now.date, hours: hours, zones: hbZones_(cfg.tables)
  };
}

function hbCheckDateGuests_(req, cfg, now) {
  var S = cfg.settings, date = hbDate_(req.date), guests = hbInt_(req.guests, 0);
  if (!date) throw hbErr_('bad_date', 'Please choose a date.');
  var ahead = hbDayNumber_(date) - hbDayNumber_(now.date);
  if (ahead < 0) throw hbErr_('bad_date', 'That date has passed.');
  if (ahead > S.maxDaysAhead) throw hbErr_('bad_date', 'We take bookings up to ' + S.maxDaysAhead + ' days ahead.');
  if (guests < 1) throw hbErr_('bad_guests', 'Please say how many guests.');
  if (guests > S.maxGuests) throw hbErr_('too_many', 'For more than ' + S.maxGuests + ' guests, please email us and we will arrange it.');
  return { date: date, guests: guests };
}

/** Every bookable time on a date for a party size, each marked free, full or too late. */
function hbSlots_(cfg, now, date, guests, dayBookings) {
  var S = cfg.settings, h = cfg.hours[hbWeekday_(date)], slots = [];
  if (!h || h.closed) return null;
  var duration = hbDuration_(guests, S);
  for (var t = h.first; t <= h.last; t += S.slotMinutes) {
    var state = 'free';
    if (date === now.date && t < now.min + S.minNoticeMinutes) state = 'late';
    else if (!hbFreeTables_(cfg.tables, dayBookings, guests, t, duration, null).length) state = 'full';
    slots.push({ time: hbFromMin_(t), state: state });
  }
  return slots;
}

function hbAvailability_(req) {
  var cfg = hbConfig_(), now = hbNow_(cfg.settings), q = hbCheckDateGuests_(req, cfg, now);
  var day = hbBookings_().filter(function (b) { return b.date === q.date; });
  var slots = hbSlots_(cfg, now, q.date, q.guests, day);
  // seating: area, smallest and largest party of every table in use, so the form only offers a seating preference the party can have
  var seating = cfg.tables.map(function (t) { return [t.zone, t.min, t.max]; });
  return { date: q.date, guests: q.guests, closed: !slots, slots: slots || [], seating: seating };
}

/** Areas with at least one table that seats this party, in the order of the Tables tab. */
function hbZonesFor_(tables, guests) {
  return hbZones_(tables.filter(function (t) { return guests >= t.min && guests <= t.max; }));
}

/* ------------------------------------------------------------------ */
/* Guest: make a booking request                                       */
/* ------------------------------------------------------------------ */

function hbClean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().substr(0, max);
}
/** Text that starts like a formula would be run by the sheet: store it as plain text instead. */
function hbCell_(v) { var s = String(v == null ? '' : v); return /^[=+\-@]/.test(s) ? "'" + s : s; }

function hbContact_(req, needEmail) {
  var name = hbClean_(req.name, 80), email = hbClean_(req.email, 120).toLowerCase(), phone = hbClean_(req.phone, 30);
  if (name.length < 2) throw hbErr_('bad_name', 'Please add your name.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw hbErr_('bad_email', 'That email address does not look right.');
  if (needEmail && !email) throw hbErr_('bad_email', 'Please add your email so we can confirm.');
  if (phone && (!/^[+()\d\s.\-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7)) throw hbErr_('bad_phone', 'That phone number does not look right.');
  if (needEmail && !phone) throw hbErr_('bad_phone', 'Please add a phone number in case we need to reach you on the day.');
  return { name: name, email: email, phone: phone, notes: hbClean_(req.notes, 500) };
}

function hbBook_(req) {
  if (hbClean_(req.website, 50)) return { ref: 'HB-0000', status: 'pending' }; // filled by bots only
  var cfg = hbConfig_(), S = cfg.settings, now = hbNow_(S), q = hbCheckDateGuests_(req, cfg, now);
  var c = hbContact_(req, true), start = hbToMin_(req.time);
  // a seating preference only counts when that area has a table for this party
  var seat = hbClean_(req.seat, 20), zones = hbZonesFor_(cfg.tables, q.guests);
  if (zones.map(function (z) { return z.toLowerCase(); }).indexOf(seat.toLowerCase()) < 0) seat = '';
  if (start == null) throw hbErr_('bad_time', 'Please choose a time.');

  var cache = CacheService.getScriptCache(), key = 'hb_rate_' + c.email, count = hbInt_(cache.get(key), 0);
  if (count >= 5) throw hbErr_('slow_down', 'You have sent several requests in a short time. Please wait a little, or email us.');
  var hourKey = 'hb_hour_' + now.stamp.substr(0, 13), hour = hbInt_(cache.get(hourKey), 0);
  if (hour >= S.maxRequestsPerHour) throw hbErr_('slow_down', 'We are getting a lot of requests right now. Please try again a little later, or email us.');

  var lock = LockService.getScriptLock(), booking;
  lock.waitLock(20000);
  try {
    var all = hbBookings_(), day = all.filter(function (b) { return b.date === q.date; });
    var slots = hbSlots_(cfg, now, q.date, q.guests, day);
    if (!slots) throw hbErr_('closed', 'We are closed that day.');
    var slot = null;
    slots.forEach(function (s) { if (s.time === hbFromMin_(start)) slot = s; });
    if (!slot) throw hbErr_('bad_time', 'That time is not available. Please choose one of the times shown.');
    if (slot.state === 'late') throw hbErr_('too_late', 'That time is too soon to book online. Please choose a later one.');
    if (slot.state === 'full') throw hbErr_('slot_taken', 'That time has just been taken. Please choose another.');
    var twin = day.some(function (b) { return HB_HOLDS[b.status] && b.email === c.email && b.start === start; });
    if (twin) throw hbErr_('duplicate', 'We already have your request for that time. Check your email for it.');
    var duration = hbDuration_(q.guests, S);
    var table = hbPickTable_(hbFreeTables_(cfg.tables, day, q.guests, start, duration, null), seat);
    booking = hbAppend_(all, {
      date: q.date, time: hbFromMin_(start), guests: q.guests, duration: duration, name: c.name, email: c.email,
      phone: c.phone, notes: c.notes, seat: seat, table: table.id, status: 'pending', source: 'web'
    }, now, 'guest');
  } finally { lock.releaseLock(); }
  cache.put(key, String(count + 1), 3600);
  cache.put(hourKey, String(hour + 1), 3600);

  var mailed = hbMailRestaurant_(booking, S), emailed = hbMailGuest_(booking, 'received', S);
  return { ref: booking.ref, status: booking.status, date: booking.date, time: booking.time, guests: booking.guests, notified: mailed, emailed: emailed };
}

function hbRef_(all) {
  var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', used = {};
  all.forEach(function (b) { used[b.ref] = true; });
  for (var tries = 0; tries < 50; tries++) {
    var seed = Utilities.getUuid().replace(/-/g, ''), ref = 'HB-';
    for (var i = 0; i < 4; i++) ref += abc.charAt(parseInt(seed.substr(i * 2, 2), 16) % abc.length);
    if (!used[ref]) return ref;
  }
  return 'HB-' + Utilities.getUuid().substr(0, 6).toUpperCase();
}

function hbAppend_(all, b, now, who) {
  b.id = Utilities.getUuid();
  b.ref = hbRef_(all);
  b.created = now.stamp; b.updated = now.stamp; b.updatedBy = who;
  b.start = hbToMin_(b.time);
  var sh = hbSheet_(HB_TABS.bookings);
  b._row = sh.getLastRow() + 1;
  if (b._row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
  hbWriteRow_(sh, b);
  return b;
}

function hbSave_(b, now, who) {
  b.updated = now.stamp; b.updatedBy = who;
  hbWriteRow_(hbSheet_(HB_TABS.bookings), b);
  return b;
}

/** One booking = one row, always written as plain text so the sheet never reinterprets dates, times or phone numbers. */
function hbWriteRow_(sh, b) {
  sh.getRange(b._row, 1, 1, HB_BOOKING_COLS.length).setNumberFormat('@')
    .setValues([HB_BOOKING_COLS.map(function (k) { return hbCell_(b[k]); })]);
  SpreadsheetApp.flush();   // on the sheet before the lock is released, so the next request sees it
}

/* ------------------------------------------------------------------ */
/* Staff: sign in                                                      */
/* ------------------------------------------------------------------ */

function hbSecret_() {
  var props = PropertiesService.getScriptProperties(), s = props.getProperty('HB_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('HB_SECRET', s); }
  return s;
}
function hbSign_(payload) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload, hbSecret_()));
}

function hbLogin_(req) {
  var user = hbClean_(req.username, 60).toLowerCase(), pass = String(req.password == null ? '' : req.password);
  var cache = CacheService.getScriptCache(), key = 'hb_login_' + user, fails = hbInt_(cache.get(key), 0);
  if (fails >= 6) Utilities.sleep(3000);   // slows guessing down without letting a stranger lock staff out
  var match = null;
  hbRows_(HB_TABS.staff).forEach(function (r) {
    if (!match && pass && hbTrue_(r.active) && r.username && r.username.toLowerCase() === user && r.password && hbPasswordOk_(r.password, pass)) match = r;
  });
  if (!match || !user || !pass) {
    cache.put(key, String(fails + 1), 600);
    throw hbErr_('bad_login', 'That username or password is not right.');
  }
  cache.remove(key);
  if (!hbIsHash_(match.password)) hbStorePassword_(match._row, pass);
  var exp = Date.now() + 12 * 3600 * 1000;
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify({ u: match.username, n: match.name || match.username, exp: exp }), Utilities.Charset.UTF_8);
  return { token: payload + '.' + hbSign_(payload), name: match.name || match.username, expires: exp };
}

/*
 * Staff passwords are kept in the Staff tab as a salted, repeated HMAC-SHA256 hash ("hash$rounds$salt$hash"), never
 * as the password itself. To add a person or reset a password, the owner types the new password into the cell as
 * plain text: it is accepted once and replaced by its hash at that person's next sign-in.
 */
var HB_HASH_ROUNDS = 200;

function hbIsHash_(stored) { return String(stored).indexOf('hash$') === 0; }

function hbHash_(password, salt, rounds) {
  var h = String(password);
  for (var i = 0; i < rounds; i++) h = Utilities.base64Encode(Utilities.computeHmacSha256Signature(h, salt, Utilities.Charset.UTF_8));
  return h;
}

function hbPasswordOk_(stored, given) {
  stored = String(stored);
  if (!hbIsHash_(stored)) return stored === given;
  var p = stored.split('$'), rounds = hbInt_(p[1], 0);
  return p.length === 4 && rounds > 0 && !!p[2] && hbHash_(given, p[2], rounds) === p[3];
}

/** Replaces a plain-text password in the Staff tab with its hash. Never stops a sign-in if the sheet can't be written. */
function hbStorePassword_(row, password) {
  try {
    var sh = hbSheet_(HB_TABS.staff), head = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
    var col = head.map(function (h) { return String(h).trim(); }).indexOf('password') + 1;
    if (!col) return;
    var salt = Utilities.getUuid().replace(/-/g, '');
    sh.getRange(row, col).setNumberFormat('@').setValue('hash$' + HB_HASH_ROUNDS + '$' + salt + '$' + hbHash_(password, salt, HB_HASH_ROUNDS));
  } catch (e) { console.warn('Could not hash the password in row ' + row + ': ' + e); }
}

function hbAuth_(req) {
  var parts = String(req.token || '').split('.');
  if (parts.length !== 2 || !parts[0] || hbSign_(parts[0]) !== parts[1]) throw hbErr_('auth', 'Please sign in again.');
  var data;
  try { data = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString('UTF-8')); }
  catch (e) { throw hbErr_('auth', 'Please sign in again.'); }
  if (!data || !data.exp || data.exp < Date.now()) throw hbErr_('auth', 'Your session has ended. Please sign in again.');
  var still = hbRows_(HB_TABS.staff).some(function (r) { return hbTrue_(r.active) && r.username === data.u; });
  if (!still) throw hbErr_('auth', 'Please sign in again.');
  return { username: data.u, name: data.n };
}

/* ------------------------------------------------------------------ */
/* Staff: the day view                                                 */
/* ------------------------------------------------------------------ */

function hbSortBookings_(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start || (a.created < b.created ? -1 : 1); }

function hbDay_(req, who) {
  var cfg = hbConfig_(), S = cfg.settings, now = hbNow_(S), date = hbDate_(req.date) || now.date;
  var all = hbBookings_();
  var day = all.filter(function (b) { return b.date === date; }).sort(hbSortBookings_);
  var requests = all.filter(function (b) { return b.status === 'pending' && b.date >= now.date; }).sort(hbSortBookings_);
  var sum = { bookings: 0, covers: 0, pending: 0, confirmed: 0, seated: 0, finished: 0, noshow: 0, cancelled: 0, declined: 0 };
  day.forEach(function (b) {
    if (sum[b.status] != null) sum[b.status]++;
    if (HB_HOLDS[b.status] || b.status === 'finished') { sum.bookings++; sum.covers += b.guests; }
  });
  var h = cfg.hours[hbWeekday_(date)];
  return {
    date: date, today: now.date, nowMin: now.min, staff: who.name,
    bookings: day.map(hbPublicBooking_), requests: requests.map(hbPublicBooking_), summary: sum,
    tables: cfg.tables, zones: hbZones_(cfg.tables),
    hours: !h || h.closed ? { closed: true } : { closed: false, first: hbFromMin_(h.first), last: hbFromMin_(h.last) },
    settings: { slotMinutes: S.slotMinutes, durationSmall: S.durationSmall, durationLarge: S.durationLarge, maxGuests: S.maxGuests, name: S.restaurantName }
  };
}

function hbFind_(all, id) {
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  throw hbErr_('not_found', 'That booking no longer exists. Refresh the page.');
}

function hbTableById_(cfg, id) {
  for (var i = 0; i < cfg.tables.length; i++) if (cfg.tables[i].id === id) return cfg.tables[i];
  return null;
}

/** Makes sure booking b can sit at tableId; picks a table when tableId is empty. Returns the table id. */
function hbResolveTable_(cfg, all, b, tableId) {
  var day = all.filter(function (x) { return x.date === b.date; });
  var biggest = 0; cfg.tables.forEach(function (x) { if (x.max > biggest) biggest = x.max; });
  // a party larger than every table (taken by staff over the phone) is seated wherever staff decide
  var oversize = b.guests > biggest;
  var free = hbFreeTables_(cfg.tables, day, oversize ? biggest : b.guests, b.start, b.duration, b.id);
  if (tableId) {
    var t = hbTableById_(cfg, tableId);
    if (!t) throw hbErr_('bad_table', 'There is no table ' + tableId + '.');
    if (b.guests > t.max && !oversize) throw hbErr_('table_small', 'Table ' + t.id + ' seats ' + t.max + ' at most.');
    var ok = free.some(function (f) { return f.id === t.id; });
    if (!ok) {
      // a smaller party may be put on a bigger table by staff, as long as nobody else holds it
      var clash = day.some(function (x) {
        return x.id !== b.id && x.table === t.id && HB_HOLDS[x.status] && b.start < x.start + x.duration && x.start < b.start + b.duration;
      });
      if (clash) throw hbErr_('table_taken', 'Table ' + t.id + ' is taken at that time.');
    }
    return t.id;
  }
  var pick = hbPickTable_(free, b.seat);
  if (!pick) throw hbErr_('no_table', 'No table is free for ' + b.guests + ' at ' + b.time + '.');
  return pick.id;
}

function hbSetStatus_(req, who) {
  var cfg = hbConfig_(), S = cfg.settings, now = hbNow_(S), to = String(req.status || '').toLowerCase();
  var lock = LockService.getScriptLock(), b, from;
  lock.waitLock(20000);
  try {
    var all = hbBookings_();
    b = hbFind_(all, String(req.id || ''));
    from = b.status;
    if (from === to) return { booking: hbPublicBooking_(b) };
    if (!HB_MOVES[from] || HB_MOVES[from].indexOf(to) < 0) throw hbErr_('bad_move', 'A ' + from + ' booking cannot be marked ' + to + '.');
    if (HB_HOLDS[to] && !HB_HOLDS[from]) {
      // coming back to life: it needs a table again
      b.status = to;
      try { b.table = hbResolveTable_(cfg, all, b, b.table); }
      catch (e) { b.table = hbResolveTable_(cfg, all, b, ''); }
    }
    b.status = to;
    hbSave_(b, now, who.name);
  } finally { lock.releaseLock(); }
  if (req.notify !== false) {
    if (to === 'confirmed' && from === 'pending') hbMailGuest_(b, 'confirmed', S);
    if (to === 'declined') hbMailGuest_(b, 'declined', S);
    if (to === 'cancelled') hbMailGuest_(b, 'cancelled', S);
  }
  return { booking: hbPublicBooking_(b) };
}

function hbAssign_(req, who) {
  var cfg = hbConfig_(), now = hbNow_(cfg.settings), lock = LockService.getScriptLock(), b;
  lock.waitLock(20000);
  try {
    var all = hbBookings_();
    b = hbFind_(all, String(req.id || ''));
    b.table = hbResolveTable_(cfg, all, b, hbClean_(req.table, 20));
    hbSave_(b, now, who.name);
  } finally { lock.releaseLock(); }
  return { booking: hbPublicBooking_(b) };
}

function hbStaffFields_(req, cfg) {
  var S = cfg.settings, date = hbDate_(req.date), start = hbToMin_(req.time), guests = hbInt_(req.guests, 0);
  if (!date) throw hbErr_('bad_date', 'Please choose a date.');
  if (start == null) throw hbErr_('bad_time', 'Please choose a time.');
  if (guests < 1 || guests > 40) throw hbErr_('bad_guests', 'Please say how many guests.');
  var c = hbContact_(req, false);
  var duration = hbInt_(req.duration, 0);
  if (duration < 15 || duration > 480) duration = hbDuration_(guests, S);
  return { date: date, time: hbFromMin_(start), start: start, guests: guests, duration: duration,
    name: c.name, email: c.email, phone: c.phone, notes: c.notes };
}

/** A booking taken by staff: over the phone (confirmed) or a walk-in (seated straight away). */
function hbCreate_(req, who) {
  var cfg = hbConfig_(), S = cfg.settings, now = hbNow_(S), f = hbStaffFields_(req, cfg);
  var source = req.source === 'walk-in' ? 'walk-in' : 'phone';
  var lock = LockService.getScriptLock(), b;
  lock.waitLock(20000);
  try {
    var all = hbBookings_();
    f.id = ''; f.seat = ''; f.status = source === 'walk-in' ? 'seated' : 'confirmed'; f.source = source;
    f.table = hbResolveTable_(cfg, all, f, hbClean_(req.table, 20));
    b = hbAppend_(all, f, now, who.name);
  } finally { lock.releaseLock(); }
  if (source === 'phone' && req.notify !== false) hbMailGuest_(b, 'confirmed', S);
  return { booking: hbPublicBooking_(b) };
}

function hbUpdate_(req, who) {
  var cfg = hbConfig_(), now = hbNow_(cfg.settings), f = hbStaffFields_(req, cfg);
  var lock = LockService.getScriptLock(), b;
  lock.waitLock(20000);
  try {
    var all = hbBookings_();
    b = hbFind_(all, String(req.id || ''));
    if (req.duration == null && b.guests === f.guests) f.duration = b.duration;
    var moved = b.date !== f.date || b.start !== f.start || b.guests !== f.guests || b.duration !== f.duration;
    var wanted = req.table == null ? b.table : hbClean_(req.table, 20);
    ['date', 'time', 'start', 'guests', 'duration', 'name', 'email', 'phone', 'notes'].forEach(function (k) { b[k] = f[k]; });
    if (HB_HOLDS[b.status]) {
      if (moved && req.table == null) {
        // keep the same table when it still works, otherwise find another
        try { b.table = hbResolveTable_(cfg, all, b, b.table); }
        catch (e) { b.table = hbResolveTable_(cfg, all, b, ''); }
      } else b.table = hbResolveTable_(cfg, all, b, wanted);
    }
    hbSave_(b, now, who.name);
  } finally { lock.releaseLock(); }
  return { booking: hbPublicBooking_(b) };
}

/* ------------------------------------------------------------------ */
/* Emails                                                              */
/* ------------------------------------------------------------------ */

function hbEsc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hbWhen_(b) { return hbNiceDate_(b.date) + ' at ' + b.time; }
function hbParty_(b) { return b.guests + (b.guests === 1 ? ' guest' : ' guests'); }

function hbHtml_(S, title, lines, rows) {
  var table = rows.map(function (r) {
    return '<tr><td style="padding:6px 18px 6px 0;color:#6A4E40;white-space:nowrap;vertical-align:top">' + hbEsc_(r[0]) +
      '</td><td style="padding:6px 0;color:#36261A">' + hbEsc_(r[1]) + '</td></tr>';
  }).join('');
  return '<div style="background:#F3EBDD;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#36261A">' +
    '<div style="max-width:520px;margin:0 auto;background:#FBF7EF;border-radius:6px;padding:32px 30px">' +
    '<div style="font-family:Georgia,serif;font-size:14px;letter-spacing:.04em;color:#6A4E40">' + hbEsc_(S.restaurantName) + '</div>' +
    '<h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:1.15;margin:14px 0 16px;color:#2A1A11">' + hbEsc_(title) + '</h1>' +
    lines.map(function (l) { return '<p style="margin:0 0 14px">' + l + '</p>'; }).join('') +
    (table ? '<table style="border-collapse:collapse;margin:8px 0 6px;font-size:15px">' + table + '</table>' : '') +
    '</div></div>';
}

function hbSend_(to, subject, text, html, S) {
  try {
    if (!to) return false;
    if (MailApp.getRemainingDailyQuota() < 1) { console.warn('Daily email limit reached: ' + subject); return false; }
    MailApp.sendEmail({ to: to, subject: subject, body: text, htmlBody: html, name: S.restaurantName, replyTo: S.restaurantEmail });
    return true;
  } catch (e) { console.error('Email failed: ' + (e && e.message)); return false; }
}

function hbMailRestaurant_(b, S) {
  if (!S.notifyRestaurant) return false;
  var rows = [['When', hbWhen_(b)], ['Party', hbParty_(b)], ['Name', b.name], ['Phone', b.phone], ['Email', b.email],
    ['Asked for', b.seat || 'No preference'], ['Held table', b.table], ['Notes', b.notes || 'None'], ['Reference', b.ref]];
  var subject = 'New booking request: ' + hbWhen_(b) + ', ' + hbParty_(b) + ' (' + b.name + ')';
  var text = subject + '\n\n' + rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
    '\n\nApprove or decline it on the staff page: ' + S.portalUrl;
  var html = hbHtml_(S, 'New booking request', ['A guest has asked for a table. It is held until you approve or decline it.',
    '<a href="' + hbEsc_(S.portalUrl) + '" style="color:#6C5822">Open the staff page</a>'], rows);
  return hbSend_(S.restaurantEmail, subject, text, html, S);
}

function hbMailGuest_(b, kind, S) {
  if (!S.sendGuestEmails || !b.email) return false;
  // only letters go into the greeting: a name field must not be able to put a link into our email
  var first = hbEsc_(String(b.name).split(' ')[0].replace(/[^A-Za-z\u00C0-\u024F'\-]/g, '').substr(0, 30) || 'there'), when = hbWhen_(b), rows = [['When', when], ['Party', hbParty_(b)], ['Reference', b.ref]];
  var subject, title, lines;
  if (kind === 'received') {
    subject = 'We have your request for ' + when;
    title = 'We have your request';
    lines = ['Hello ' + first + ',', 'Thank you. Your table is not confirmed yet: we are holding it while we check the book, and we will email you again shortly.'];
  } else if (kind === 'confirmed') {
    subject = 'Your table is confirmed: ' + when;
    title = 'Your table is confirmed';
    lines = ['Hello ' + first + ',', 'We look forward to seeing you. If your plans change, reply to this email and we will release the table.'];
  } else if (kind === 'declined') {
    subject = 'About your request for ' + when;
    title = 'We could not fit you in';
    lines = ['Hello ' + first + ',', 'We are sorry: we cannot offer you a table at that time. Please try another time on our website, or reply to this email and we will help.'];
  } else {
    subject = 'Your booking for ' + when + ' has been cancelled';
    title = 'Your booking has been cancelled';
    lines = ['Hello ' + first + ',', 'This booking has been cancelled. If that is not what you expected, reply to this email.'];
  }
  var text = lines.join('\n\n').replace(/<[^>]+>/g, '') + '\n\n' + rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') + '\n\n' + S.restaurantName;
  return hbSend_(b.email, subject, text, hbHtml_(S, title, lines, rows), S);
}
