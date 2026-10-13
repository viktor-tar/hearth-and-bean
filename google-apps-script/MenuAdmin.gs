/**
 * Hearth & Bean: the menu, from the staff page.
 * Signed-in staff can list every dish (hidden ones too), edit or add a dish, give it a new photo and publish the menu.
 * Text is written to the "Menu" tab, photos go into the menu photos folder in Drive (see Menu.gs). Nothing here is
 * used by the booking form, so the public website and its booking flow are not affected.
 */

var HB_MENU_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };

/** Every dish in sheet order, hidden ones included, with its photo (or null) and whether the menu has unpublished changes. */
function hbMenuAdmin_(req, who) {
  var photos = hbMenuPhotos_(), items = [];
  hbRows_(HB_MENU_TAB).forEach(function (r) {
    if (!r.name) return;
    items.push(hbMenuItem_(r, photos));
  });
  var props = PropertiesService.getScriptProperties();
  return {
    categories: HB_MENU_CATEGORIES, homeGroups: HB_MENU_HOME_GROUPS, items: items,
    edited: hbInt_(props.getProperty('HB_MENU_EDITED'), 0), published: hbInt_(props.getProperty('HB_MENU_PUBLISHED'), 0),
    canPublish: !!hbMenuHook_()
  };
}

function hbMenuPhotos_() {
  var photos = {}, it = hbMenuFolder_().getFiles();
  while (it.hasNext()) {
    var f = it.next();
    photos[f.getName()] = { id: f.getId(), name: f.getName(), type: f.getMimeType(), size: f.getSize(), updated: f.getLastUpdated().getTime() };
  }
  return photos;
}

function hbMenuItem_(r, photos) {
  return {
    row: r._row, name: r.name, description: r.description || '', price: r.price || '', category: r.category || '',
    menuOrder: hbInt_(r['menu order'], 0), homeGroup: r['home group'] || '', homeOrder: hbInt_(r['home order'], 0),
    active: !r.active || hbTrue_(r.active), photoName: r.photo || '', photo: photos[r.photo] || null
  };
}

/** The checked fields of a dish, as they go into the sheet. */
function hbMenuFields_(req) {
  var name = hbClean_(req.name, 80), description = hbClean_(req.description, 300);
  var price = hbClean_(req.price, 20).replace(/\s+/g, '');
  if (!name) throw hbErr_('bad_name', 'Please give the dish a name.');
  var amount = /^£?(\d{1,4}(\.\d{1,2})?)$/.exec(price);
  if (!amount) throw hbErr_('bad_price', 'Please write the price like £4.50.');
  price = '£' + Number(amount[1]).toFixed(2);
  var category = String(req.category || '');
  if (HB_MENU_CATEGORIES.indexOf(category) < 0) throw hbErr_('bad_category', 'Please choose a menu section.');
  var homeGroup = String(req.homeGroup || ''), homeOrder = hbInt_(req.homeOrder, 0);
  if (homeGroup && HB_MENU_HOME_GROUPS.indexOf(homeGroup) < 0) throw hbErr_('bad_home', 'Please choose a home page group.');
  if (homeGroup && (homeOrder < 1 || homeOrder > 99)) throw hbErr_('bad_home', 'Please give the home page position (1 to 99).');
  if (!homeGroup) homeOrder = '';
  var menuOrder = hbInt_(req.menuOrder, 0);
  if (menuOrder < 1 || menuOrder > 999) throw hbErr_('bad_order', 'Please give the position in its section (1 to 999).');
  return { name: name, description: description, price: price, category: category, 'menu order': menuOrder,
    'home group': homeGroup, 'home order': homeOrder, active: req.active === false ? 'FALSE' : 'TRUE' };
}

/** The row a request means, checked against the name the page last saw so a reordered sheet can't edit the wrong dish. */
function hbMenuRow_(rows, req) {
  var row = hbInt_(req.row, 0), was = String(req.was || '');
  for (var i = 0; i < rows.length; i++) if (rows[i]._row === row && rows[i].name === was) return rows[i];
  throw hbErr_('changed', 'This dish was changed in the sheet meanwhile. The menu has been reloaded; please try again.');
}

function hbMenuTouched_() {
  PropertiesService.getScriptProperties().setProperty('HB_MENU_EDITED', String(Date.now()));
}

/** Saves a dish: an existing row when "row" is given, otherwise a new row at the end. Answers with the saved dish. */
function hbMenuSave_(req, who) {
  var f = hbMenuFields_(req), sh = hbSheet_(HB_MENU_TAB), lock = LockService.getScriptLock(), saved;
  lock.waitLock(20000);
  try {
    var rows = hbRows_(HB_MENU_TAB);
    var head = sh.getRange(1, 1, 1, HB_MENU_COLS.length).getDisplayValues()[0].map(function (h) { return String(h).trim(); });
    var target = req.row ? hbMenuRow_(rows, req) : null;
    rows.forEach(function (r) {
      if (r !== target && r.name && r.name.toLowerCase() === f.name.toLowerCase())
        throw hbErr_('duplicate', 'There is already a dish called "' + r.name + '".');
    });
    var rowNo = target ? target._row : Math.max(1, sh.getLastRow()) + 1;
    // the dish takes the asked place in its section and the section is numbered 1, 2, 3... again, so no two dishes
    // share a number (a dish that moved to another section also closes the gap it left)
    var order = hbMenuPlace_(rows, target, rowNo, 'category', f.category, 'menu order', f['menu order']);
    f['menu order'] = order[rowNo];
    // the same for the home page: places inside the chosen group are numbered 1, 2, 3... again
    var home = hbMenuPlace_(rows, target, rowNo, 'home group', f['home group'], 'home order', f['home order'] || 999);
    if (f['home group']) f['home order'] = home[rowNo];
    else delete home[rowNo];
    var values = head.map(function (h) {
      if (h in f) return hbCell_(f[h]);
      if (h === 'photo') return target ? hbCell_(target.photo || '') : '';
      return target && h in target ? hbCell_(target[h]) : '';
    });
    sh.getRange(rowNo, 1, 1, head.length).setNumberFormat('@').setValues([values]);
    hbMenuColumn_(sh, head, 'menu order', order);
    hbMenuColumn_(sh, head, 'home order', home);
    hbMenuTouched_();
    saved = hbMenuItem_(hbRows_(HB_MENU_TAB).filter(function (r) { return r._row === rowNo; })[0], hbMenuPhotos_());
  } finally { lock.releaseLock(); }
  return { item: saved };
}

/**
 * New places (row -> number) after putting the dish at place "wanted" in its group (a menu section, or a home page
 * group): the group is numbered 1, 2, 3... again, and so is the group the dish left. An empty group places nothing.
 */
function hbMenuPlace_(rows, target, rowNo, groupKey, group, orderKey, wanted) {
  var byOrder = function (a, b) { return hbInt_(a[orderKey], 0) - hbInt_(b[orderKey], 0) || a._row - b._row; };
  var members = function (g) { return rows.filter(function (r) { return r !== target && r.name && r[groupKey] === g; }).sort(byOrder); };
  var order = {};
  if (group) {
    var list = members(group);
    list.splice(Math.max(0, Math.min(list.length, wanted - 1)), 0, { _row: rowNo });
    list.forEach(function (r, i) { order[r._row] = i + 1; });
  }
  if (target && target[groupKey] && target[groupKey] !== group)
    members(target[groupKey]).forEach(function (r, i) { order[r._row] = i + 1; });
  return order;
}

/** Writes new numbers (row -> number) into one column of the Menu tab, in a single write. */
function hbMenuColumn_(sh, head, name, numbers) {
  var col = head.indexOf(name) + 1, last = sh.getLastRow();
  if (!col || last < 2 || !Object.keys(numbers).length) return;
  var cells = sh.getRange(2, col, last - 1, 1).getDisplayValues();
  Object.keys(numbers).forEach(function (r) { if (r - 2 < cells.length) cells[r - 2][0] = String(numbers[r]); });
  sh.getRange(2, col, last - 1, 1).setNumberFormat('@').setValues(cells);
}

/** A new photo for a dish: saved into the photos folder under a fresh name, then written into the dish's row. */
function hbMenuUpload_(req, who) {
  var type = String(req.type || ''), ext = HB_MENU_TYPES[type];
  if (!ext) throw hbErr_('bad_type', 'Please use a JPG, PNG, WebP or AVIF photo.');
  var bytes;
  try { bytes = Utilities.base64Decode(String(req.data || '')); } catch (e) { throw hbErr_('bad_photo', 'That photo could not be read.'); }
  if (!bytes.length) throw hbErr_('bad_photo', 'That photo could not be read.');
  if (bytes.length > HB_MENU_MAX_PHOTO) throw hbErr_('too_big', 'That photo is larger than 4 MB. Please use a smaller one.');
  var sh = hbSheet_(HB_MENU_TAB), lock = LockService.getScriptLock(), saved;
  lock.waitLock(20000);
  try {
    var target = hbMenuRow_(hbRows_(HB_MENU_TAB), req);
    var col = sh.getRange(1, 1, 1, HB_MENU_COLS.length).getDisplayValues()[0].indexOf('photo') + 1;
    if (!col) throw hbErr_('not_ready', 'The Menu tab has no "photo" column.');
    var base = target.name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'dish';
    var fileName = base + '-' + Date.now().toString(36) + ext;
    hbMenuFolder_().createFile(Utilities.newBlob(bytes, type, fileName));
    sh.getRange(target._row, col).setNumberFormat('@').setValue(fileName);
    hbMenuTouched_();
    saved = hbMenuItem_(hbRows_(HB_MENU_TAB).filter(function (r) { return r._row === target._row; })[0], hbMenuPhotos_());
  } finally { lock.releaseLock(); }
  return { item: saved };
}

function hbMenuHook_() {
  var hook = '';
  hbRows_(HB_TABS.settings).forEach(function (r) { if (r.key === 'menuBuildHook') hook = r.value; });
  return /^https:\/\/api\.netlify\.com\/build_hooks\/[A-Za-z0-9]+$/.test(hook) ? hook : '';
}

/**
 * Asks Netlify to rebuild the website with the menu as it is now. At most once a minute: a request inside that minute
 * is answered with "queued" and the number of seconds after which the page should ask again, so a change saved while
 * the site is being rebuilt still goes live in the next build.
 */
function hbMenuPublish_(req, who) {
  var hook = hbMenuHook_();
  if (!hook) throw hbErr_('no_hook', 'Publishing is not set up yet: the Settings tab needs "menuBuildHook".');
  var cache = CacheService.getScriptCache(), props = PropertiesService.getScriptProperties();
  var last = hbInt_(cache.get('hb_menu_publish'), 0), wait = 60000 - (Date.now() - last);
  if (last && wait > 0)
    return { published: hbInt_(props.getProperty('HB_MENU_PUBLISHED'), 0), queued: true, retryIn: Math.ceil(wait / 1000) };
  var res = UrlFetchApp.fetch(hook, { method: 'post', muteHttpExceptions: true });
  if (res.getResponseCode() >= 300) throw hbErr_('publish_failed', 'Netlify did not accept the request. Please try again in a minute.');
  var now = Date.now();
  cache.put('hb_menu_publish', String(now), 60);
  props.setProperty('HB_MENU_PUBLISHED', String(now));
  return { published: now, queued: false, retryIn: 0 };
}

/** Hand edits to the Menu tab also count as changes waiting to be published. */
function onEdit(e) {
  try {
    if (e && e.range && e.range.getSheet().getName() === HB_MENU_TAB) hbMenuTouched_();
  } catch (err) { /* never get in the way of typing */ }
}
