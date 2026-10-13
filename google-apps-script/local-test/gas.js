// Runs Code.gs outside Google: just enough of the Apps Script services, held in memory.
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path');

function makeEnv(opts) {
  opts = opts || {};
  const state = { sheets: {}, order: [], props: {}, cache: {}, mails: [], now: opts.now || null, quota: 100, mailFails: false, logs: [] };
  const clock = () => (state.now ? new Date(state.now) : new Date());

  function Sheet(name) {
    this.name = name; this.rows = []; this.maxRows = 1000; this.maxCols = 26; this.formats = {};
  }
  Sheet.prototype.getMaxRows = function () { return this.maxRows; };
  Sheet.prototype.getMaxColumns = function () { return this.maxCols; };
  Sheet.prototype.getLastRow = function () { let n = this.rows.length; while (n && this.rows[n - 1].every(v => v === '' || v == null)) n--; return n; };
  Sheet.prototype.insertRowsAfter = function (after, n) { this.maxRows += n; };
  Sheet.prototype.setFrozenRows = function () {};
  Sheet.prototype.appendRow = function (row) { const r = this.getLastRow(); this.rows[r] = row.map(store); };
  Sheet.prototype.getDataRange = function () { const n = this.getLastRow(); const w = Math.max(1, ...this.rows.slice(0, n).map(r => r.length)); return new Range(this, 1, 1, Math.max(n, 1), w); };
  Sheet.prototype.getRange = function (r, c, nr, nc) { if (r + (nr || 1) - 1 > this.maxRows) throw new Error('Range is outside the sheet'); return new Range(this, r, c, nr || 1, nc || 1); };
  // what Sheets does with a typed value: a leading apostrophe forces text and is not shown; "=..." would be a formula
  function store(v) {
    if (typeof v === 'string') { if (v.charAt(0) === "'") return v.slice(1); if (v.charAt(0) === '=') { state.logs.push('FORMULA WRITTEN: ' + v); return '#FORMULA'; } }
    return v;
  }
  function Range(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Range.prototype.setNumberFormat = function () { return this; };
  Range.prototype.setValue = function (v) { return this.setValues([[v]]); };
  Range.prototype.setFontWeight = function () { return this; };
  Range.prototype.setValues = function (vals) {
    if (vals.length !== this.nr || vals.some(v => v.length !== this.nc)) throw new Error('setValues: size mismatch');
    for (let i = 0; i < this.nr; i++) { const row = this.sh.rows[this.r - 1 + i] = this.sh.rows[this.r - 1 + i] || []; for (let j = 0; j < this.nc; j++) row[this.c - 1 + j] = store(vals[i][j]); }
    for (let i = 0; i < this.sh.rows.length; i++) if (!this.sh.rows[i]) this.sh.rows[i] = [];
    return this;
  };
  Range.prototype.getDisplayValues = function () {
    const out = [];
    for (let i = 0; i < this.nr; i++) { const row = this.sh.rows[this.r - 1 + i] || []; const o = []; for (let j = 0; j < this.nc; j++) { const v = row[this.c - 1 + j]; o.push(v == null ? '' : String(v)); } out.push(o); }
    return out;
  };
  Range.prototype.getValues = Range.prototype.getDisplayValues;

  const ss = {
    getSheetByName: n => state.sheets[n] || null,
    insertSheet: n => { state.sheets[n] = new Sheet(n); state.order.push(n); return state.sheets[n]; }
  };
  const tzFmt = (d, tz) => {
    const p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).forEach(x => p[x.type] = x.value);
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
  };
  const b64 = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  const sandbox = {
    Logger: { log: (...a) => state.logs.push(a.join(' ')) },
    console: { log: (...a) => state.logs.push(a.join(' ')), warn: (...a) => state.logs.push('WARN ' + a.join(' ')), error: (...a) => state.logs.push('ERROR ' + a.join(' ')) },
    SpreadsheetApp: { flush: () => { state.flushes = (state.flushes || 0) + 1; }, getActiveSpreadsheet: () => ss, getUi: () => ({ createMenu: () => ({ addItem() { return this; }, addSeparator() { return this; }, addToUi() {} }), alert: m => state.logs.push('ALERT ' + m) }) },
    LockService: { getScriptLock: () => ({ waitLock() { if (state.locked) throw new Error('lock held'); state.locked = true; }, releaseLock() { state.locked = false; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in state.props ? state.props[k] : null), setProperty: (k, v) => { state.props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({
      get: k => { const e = state.cache[k]; if (!e) return null; if (e.exp < clock().getTime()) { delete state.cache[k]; return null; } return e.v; },
      put: (k, v, secs) => { state.cache[k] = { v: String(v), exp: clock().getTime() + (secs || 600) * 1000 }; },
      remove: k => { delete state.cache[k]; } }) },
    Utilities: {
      formatDate: (d, tz, f) => { if (f !== 'yyyy-MM-dd HH:mm') throw new Error('mock: unsupported format ' + f); return tzFmt(d, tz); },
      getUuid: () => crypto.randomUUID(),
      Charset: { UTF_8: 'UTF-8' },
      sleep: ms => { state.slept = (state.slept || 0) + ms; },
      computeHmacSha256Signature: (value, key) => Array.from(crypto.createHmac('sha256', key).update(value).digest()).map(x => (x > 127 ? x - 256 : x)),
      base64EncodeWebSafe: (v, cs) => b64(typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(v.map(x => (x < 0 ? x + 256 : x)))),
      base64DecodeWebSafe: s => Array.from(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')).map(x => (x > 127 ? x - 256 : x)),
      base64Encode: bytes => Buffer.from(bytes.map(x => (x < 0 ? x + 256 : x))).toString('base64'),
      base64Decode: s => { if (!/^[A-Za-z0-9+/=\s]*$/.test(String(s))) throw new Error('bad base64'); return Array.from(Buffer.from(String(s), 'base64')).map(x => (x > 127 ? x - 256 : x)); },
      newBlob: (bytes, type, name) => ({ name: name || '', type: type || '', bytes: Buffer.from(bytes.map(x => (x < 0 ? x + 256 : x))),
        getDataAsString: (cs) => Buffer.from(bytes.map(x => (x < 0 ? x + 256 : x))).toString('utf8'), setName(n) { this.name = n; return this; } })
    },
    MailApp: {
      getRemainingDailyQuota: () => state.quota,
      sendEmail: m => { if (state.mailFails) throw new Error('mail service down'); if (typeof m !== 'object' || !m.to || !m.subject) throw new Error('bad mail'); state.quota--; state.mails.push(m); }
    },
    // Drive and UrlFetch, just enough for Menu.gs: photos live in memory; "downloads" read public/images/dishes
    DriveApp: (() => {
      const files = state.files = state.files || {}, folders = state.folders = state.folders || {};
      const fileObj = f => ({ getId: () => f.id, getName: () => f.name, getMimeType: () => f.type, getSize: () => f.bytes.length,
        getLastUpdated: () => new RealDate(f.updated), getBlob: () => ({ getBytes: () => Array.from(f.bytes).map(x => (x > 127 ? x - 256 : x)) }),
        getParents: () => { let done = false; return { hasNext: () => !done, next: () => { done = true; return folderObj(folders[f.parent]); } }; } });
      const folderObj = d => ({ getId: () => d.id, getFiles: () => { const l = Object.values(files).filter(f => f.parent === d.id); let i = 0; return { hasNext: () => i < l.length, next: () => fileObj(l[i++]) }; },
        createFile: b => { const id = 'file' + Object.keys(files).length; files[id] = { id, name: b.name, type: b.type, bytes: Buffer.from(b.bytes), parent: d.id, updated: clock().getTime() }; return fileObj(files[id]); } });
      return {
        createFolder: name => { const id = 'folder' + Object.keys(folders).length; folders[id] = { id, name }; return folderObj(folders[id]); },
        getFolderById: id => { if (!folders[id]) throw new Error('no folder'); return folderObj(folders[id]); },
        getFileById: id => { if (!files[id]) throw new Error('no file'); return fileObj(files[id]); }
      };
    })(),
    UrlFetchApp: { fetch: (url, o) => {
      state.fetches = (state.fetches || []).concat([url]);
      if (/^https:\/\/api\.netlify\.com\/build_hooks\//.test(url)) { state.hooks = (state.hooks || 0) + 1; return { getResponseCode: () => 200 }; }
      const m = /\/images\/dishes\/(.+)$/.exec(url), f = m && path.join(__dirname, '..', '..', 'public', 'images', 'dishes', decodeURIComponent(m[1]));
      if (!f || !fs.existsSync(f)) return { getResponseCode: () => (m ? 404 : 200), getBlob: () => null };
      const bytes = fs.readFileSync(f), type = f.endsWith('.jpg') ? 'image/jpeg' : 'image/avif';
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ content: bytes.toString('base64') }),
        getBlob: () => ({ name: '', type, bytes, setName(n) { this.name = n; return this; } }) };
    } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ text: t, setMimeType() { return this; }, getContent() { return this.text; } }) },
    JSON, Math, parseInt, parseFloat, isNaN, String, Number, Array, Object, Error, RegExp
  };
  // Date inside the script follows the test clock
  const RealDate = Date;
  function FakeDate(...a) { if (!(this instanceof FakeDate)) return clock().toString(); return a.length ? new RealDate(...a) : clock(); }
  FakeDate.now = () => clock().getTime(); FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse; FakeDate.prototype = RealDate.prototype;
  sandbox.Date = FakeDate;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), sandbox, { filename: 'Code.gs' });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Menu.gs'), 'utf8'), sandbox, { filename: 'Menu.gs' });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'MenuAdmin.gs'), 'utf8'), sandbox, { filename: 'MenuAdmin.gs' });
  const call = (action, body) => JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(Object.assign({ action }, body || {})) } }).getContent());
  const raw = contents => JSON.parse(sandbox.doPost({ postData: { contents } }).getContent());
  const rows = name => { const sh = state.sheets[name]; const v = sh.getDataRange().getDisplayValues(); const h = v[0]; return v.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
  return { state, sandbox, call, raw, rows, get: () => JSON.parse(sandbox.doGet().getContent()) };
}
module.exports = { makeEnv };
