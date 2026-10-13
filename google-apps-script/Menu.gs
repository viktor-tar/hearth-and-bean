/**
 * Hearth & Bean: the menu.
 * The dishes live in the "Menu" tab of this Sheet and their photos in a Google Drive folder.
 * The website reads both when it is built (actions "menu" and "menuPhoto" below), so a change here goes live
 * after "Hearth & Bean > Publish menu to the website", which asks Netlify to rebuild the site.
 *
 * Menu tab, one row per dish:
 *   name, description, price (as shown, e.g. £4.50), category (one of HB_MENU_CATEGORIES), menu order (position in its
 *   category), photo (file name in the photos folder), home group and home order (fill both to show the dish on the
 *   home page), active (FALSE hides the dish).
 */

var HB_MENU_TAB = 'Menu';
var HB_MENU_COLS = ['name', 'description', 'price', 'category', 'menu order', 'photo', 'home group', 'home order', 'active'];
var HB_MENU_CATEGORIES = ['Artisanal Snacks & Boards', 'Hearty Mains & Sandwiches', 'Hearth-Baked Breads & Pastries',
  'Signature Coffee & Espresso', 'Tea & Specialty Drinks'];
var HB_MENU_HOME_GROUPS = ['Coffee and tea', 'From the oven', 'Kitchen', 'After dark'];
var HB_MENU_FOLDER = 'Hearth & Bean menu photos';
/* Where setupMenu() copies the starting photos from: the website's repository, through the GitHub API (it returns the file
   inside JSON, which Apps Script accepts; plain .avif downloads are refused by UrlFetchApp). */
var HB_MENU_PHOTO_SOURCE = 'https://api.github.com/repos/viktor-tar/hearth-and-bean/contents/public/images/dishes/';
var HB_MENU_MAX_PHOTO = 4 * 1024 * 1024;

/* The menu the tab starts with: name, description, price, category, menu order, photo, home group, home order, active. */
var HB_MENU_SEED = [
  ["Rustic Tomato Soup", "Served with a sourdough grilled cheese.", "£9.95", "Artisanal Snacks & Boards", 1, "tomato-soup-with-grilled-cheese.avif", "From the oven", 6, "TRUE"],
  ["Hearth & Bean Cheese Board", "Local cheeses, nuts, and honey.", "£16.50", "Artisanal Snacks & Boards", 2, "cheese-board-with-nuts-and.avif", "From the oven", 8, "TRUE"],
  ["Smoked Salmon Toast", "Caper cream cheese, dill, pickled onion.", "£12.50", "Artisanal Snacks & Boards", 3, "smoked-salmon-toast.avif", "From the oven", 7, "TRUE"],
  ["Baked Camembert", "With rosemary and honey-drizzled toast.", "£12.95", "Artisanal Snacks & Boards", 4, "baked-camembert-with-toast.avif", "From the oven", 5, "TRUE"],
  ["Braised Lamb Shank", "Six hours in red wine and rosemary, on creamy mash.", "£22.50", "Hearty Mains & Sandwiches", 1, "braised-lamb-shank-on-mash.jpg", "Kitchen", 11, "TRUE"],
  ["Beef & Ale Pie", "Slow-cooked in dark ale, shortcrust lid, mash and peas.", "£18.50", "Hearty Mains & Sandwiches", 2, "beef-and-ale-pie-served.jpg", "Kitchen", 9, "TRUE"],
  ["Fish Pie", "Haddock, salmon and prawns under cheddar mash.", "£17.95", "Hearty Mains & Sandwiches", 3, "classic-fish-pie-with-mash.jpg", "Kitchen", 10, "TRUE"],
  ["Wood-Roasted Half Chicken", "Thyme and garlic, roast potatoes, charred lemon.", "£19.50", "Hearty Mains & Sandwiches", 4, "wood-roasted-half-chicken-served.jpg", "Kitchen", 12, "TRUE"],
  ["Sausages & Mash", "Cumberland sausages, mash and onion gravy.", "£15.50", "Hearty Mains & Sandwiches", 5, "sausages-and-mash-in-bowl.jpg", "", "", "TRUE"],
  ["Sunday Roast Sirloin", "Sundays only. Sirloin, Yorkshire pudding and all the trimmings.", "£23.50", "Hearty Mains & Sandwiches", 6, "sunday-roast-sirloin-beef-meal.jpg", "", "", "TRUE"],
  ["The Hearth Club", "Turkey, bacon, avocado on toasted sourdough.", "£12.50", "Hearty Mains & Sandwiches", 7, "hearth-club-sandwich-on-table.avif", "", "", "TRUE"],
  ["Prosciutto & Fig Panini", "With arugula and balsamic glaze.", "£10.50", "Hearty Mains & Sandwiches", 8, "prosciutto-and-fig-panini.avif", "", "", "TRUE"],
  ["Avocado & Hearth Seed Toast", "Topped with chili flakes.", "£10.50", "Hearty Mains & Sandwiches", 9, "avocado-seed-toast-with-flakes.avif", "", "", "TRUE"],
  ["Roasted Root Vegetable Salad", "Honey-balsamic dressing.", "£11.75", "Hearty Mains & Sandwiches", 10, "roasted-root-vegetable-salad.avif", "", "", "TRUE"],
  ["Warm Grain Bowl", "Quinoa, kale, roasted squash, and tahini.", "£12.25", "Hearty Mains & Sandwiches", 11, "warm-grain-bowl-with-tahini.avif", "", "", "TRUE"],
  ["Hearth-Baked Shakshuka", "Poached eggs in spiced tomato sauce.", "£12.95", "Hearty Mains & Sandwiches", 12, "hearth-baked-shakshuka-in-tomato.avif", "", "", "TRUE"],
  ["Ham & Gruyère Melt", "With Dijon mustard on brioche.", "£9.95", "Hearty Mains & Sandwiches", 13, "ham-and-gruy-re-melt.avif", "", "", "TRUE"],
  ["The Signature Sourdough", "Large slice with cultured butter.", "£4.25", "Hearth-Baked Breads & Pastries", 1, "sourdough-slice-with-cultured-bu.avif", "Coffee and tea", 4, "TRUE"],
  ["Flaky Butter Croissant", "Golden and layered.", "£3.25", "Hearth-Baked Breads & Pastries", 2, "butter-croissant-on-table.avif", "", "", "TRUE"],
  ["Pain au Chocolat", "Dark chocolate center.", "£3.60", "Hearth-Baked Breads & Pastries", 3, "pain-au-chocolat-on-table.avif", "", "", "TRUE"],
  ["Almond Frangipane Croissant", "Topped with toasted almonds.", "£4.20", "Hearth-Baked Breads & Pastries", 4, "almond-frangipane-croissant-topp.avif", "Coffee and tea", 3, "TRUE"],
  ["Hearth-Charred Bagel", "Choice of cream cheese or pesto.", "£4.50", "Hearth-Baked Breads & Pastries", 5, "hearth-charred-bagel-with-spread.avif", "", "", "TRUE"],
  ["Cinnamon Swirl Brioche", "Warm and sticky.", "£4.50", "Hearth-Baked Breads & Pastries", 6, "cinnamon-swirl-brioche-served.avif", "", "", "TRUE"],
  ["Blueberry & Rye Muffin", "Hearty and sweet.", "£3.75", "Hearth-Baked Breads & Pastries", 7, "blueberry-and-rye-muffin.avif", "", "", "TRUE"],
  ["Lemon Poppyseed Scone", "With lemon glaze.", "£3.75", "Hearth-Baked Breads & Pastries", 8, "lemon-poppyseed-scone-with-glaze.avif", "", "", "TRUE"],
  ["Seasonal Fruit Galette", "Thin, flaky crust with fresh fruit.", "£5.50", "Hearth-Baked Breads & Pastries", 9, "seasonal-fruit-galette-on-table.avif", "After dark", 15, "TRUE"],
  ["Smoked Sea Salt Brownie", "Dense and fudgy.", "£3.95", "Hearth-Baked Breads & Pastries", 10, "smoked-sea-salt-brownie.avif", "After dark", 16, "TRUE"],
  ["Granola & Greek Yogurt", "With berry compote and honey.", "£7.50", "Hearth-Baked Breads & Pastries", 11, "granola-and-yogurt-with-honey.avif", "", "", "TRUE"],
  ["Sticky Toffee Pudding", "Date sponge, toffee sauce, vanilla ice cream.", "£7.95", "Hearth-Baked Breads & Pastries", 12, "sticky-toffee-pudding-dessert.jpg", "After dark", 13, "TRUE"],
  ["Apple & Blackberry Crumble", "Baked to order, with vanilla custard.", "£7.50", "Hearth-Baked Breads & Pastries", 13, "apple-and-blackberry-crumble-des.jpg", "After dark", 14, "TRUE"],
  ["Hearth House Blend", "Our signature medium roast.", "£3.50", "Signature Coffee & Espresso", 1, "hearth-house-blend-coffee.avif", "", "", "TRUE"],
  ["Bean & Copper Latte", "Espresso with spiced copper-syrup and steamed milk.", "£4.75", "Signature Coffee & Espresso", 2, "bean-and-copper-latte-on.avif", "", "", "TRUE"],
  ["Smoked Maple Cappuccino", "Topped with smoked maple flakes.", "£4.75", "Signature Coffee & Espresso", 3, "smoked-maple-cappuccino-served.avif", "", "", "TRUE"],
  ["The Hearth Fire Mocha", "Dark chocolate with a hint of cayenne.", "£4.95", "Signature Coffee & Espresso", 4, "hearth-fire-mocha-dark-chocolate.avif", "", "", "TRUE"],
  ["Single-Origin Pour Over", "Rotating seasonal beans.", "£5.25", "Signature Coffee & Espresso", 5, "single-origin-pour-over-coffee.avif", "Coffee and tea", 2, "TRUE"],
  ["Double Espresso", "Bold and bright.", "£3.20", "Signature Coffee & Espresso", 6, "double-espresso-served.avif", "", "", "TRUE"],
  ["Macchiato", "Marked with foam.", "£3.40", "Signature Coffee & Espresso", 7, "macchiato-served-on-wooden-table.avif", "", "", "TRUE"],
  ["Cortado", "Equal parts espresso and steamed milk.", "£3.80", "Signature Coffee & Espresso", 8, "cortado-on-wooden-table.avif", "", "", "TRUE"],
  ["Flat White", "Smooth micro-foam.", "£3.95", "Signature Coffee & Espresso", 9, "flat-white-on-wooden-table.avif", "Coffee and tea", 1, "TRUE"],
  ["Cold Brew", "Steeped for 18 hours.", "£4.25", "Signature Coffee & Espresso", 10, "cold-brew-coffee-served.avif", "", "", "TRUE"],
  ["Americano", "Hot or iced.", "£3.60", "Signature Coffee & Espresso", 11, "americano-on-wooden-table.avif", "", "", "TRUE"],
  ["Affogato", "Espresso over vanilla bean gelato.", "£5.50", "Signature Coffee & Espresso", 12, "affogato-served-over-gelato.avif", "", "", "TRUE"],
  ["Vanilla Bean Latte", "House-made vanilla bean syrup.", "£4.60", "Signature Coffee & Espresso", 13, "vanilla-bean-latte-on-table.avif", "", "", "TRUE"],
  ["Hearth Chai Latte", "Spiced black tea with honey.", "£4.50", "Tea & Specialty Drinks", 1, "hearth-chai-latte-with-honey.avif", "", "", "TRUE"],
  ["Matcha Green Tea Latte", "Ceremonial grade matcha.", "£5.00", "Tea & Specialty Drinks", 2, "matcha-green-tea-latte-on.avif", "", "", "TRUE"],
  ["London Fog", "Earl Grey with vanilla and steamed milk.", "£4.50", "Tea & Specialty Drinks", 3, "london-fog-tea-with-milk.avif", "", "", "TRUE"],
  ["Golden Milk Latte", "Turmeric, ginger, and honey.", "£4.75", "Tea & Specialty Drinks", 4, "golden-milk-latte-with-ingredients.avif", "", "", "TRUE"],
  ["Peppermint Herbal Infusion", "Fresh and calming.", "£3.50", "Tea & Specialty Drinks", 5, "peppermint-herbal-infusion.avif", "", "", "TRUE"],
  ["Copper Kettle Hot Chocolate", "Melted premium dark chocolate.", "£4.50", "Tea & Specialty Drinks", 6, "copper-kettle-hot-chocolate.avif", "", "", "TRUE"],
  ["Chai Spiced Apple Cider", "Hot and comforting.", "£4.50", "Tea & Specialty Drinks", 7, "chai-spiced-apple-cider.avif", "", "", "TRUE"]
];

/**
 * One-time setup (safe to run again): creates the Menu tab with the starting menu, the photos folder with the starting
 * photos, and the "menuBuildHook" setting. Never overwrites rows, photos or settings that are already there.
 */
function setupMenu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  hbEnsureTab_(ss, HB_MENU_TAB, HB_MENU_COLS, HB_MENU_SEED);
  var settings = ss.getSheetByName(HB_TABS.settings);
  if (settings) {
    var keys = settings.getRange(1, 1, Math.max(1, settings.getLastRow()), 1).getDisplayValues().map(function (r) { return r[0]; });
    if (keys.indexOf('menuBuildHook') < 0)
      settings.appendRow(['menuBuildHook', '', 'Netlify build hook address: "Publish menu to the website" calls it']);
  }
  var folder = hbMenuFolder_(), have = {}, it = folder.getFiles(), added = 0, failed = [];
  while (it.hasNext()) have[it.next().getName()] = true;
  HB_MENU_SEED.forEach(function (r) {
    var name = r[5];
    if (!name || have[name]) return;
    var blob = hbFetchPhoto_(name);
    if (!blob) { failed.push(name); return; }
    folder.createFile(blob.setName(name));
    have[name] = true; added++;
  });
  var msg = 'Menu tab ready. Photos added: ' + added + (failed.length ? '. Could not copy: ' + failed.join(', ') : '.');
  Logger.log(msg);
  return msg;
}

/** Downloads a starter photo; null (and a log line saying why) if it can't. */
function hbFetchPhoto_(name) {
  try {
    var res = UrlFetchApp.fetch(HB_MENU_PHOTO_SOURCE + encodeURIComponent(name), {
      muteHttpExceptions: true, headers: { Accept: 'application/vnd.github+json' }
    });
    if (res.getResponseCode() !== 200) { Logger.log(name + ': HTTP ' + res.getResponseCode()); return null; }
    var file = JSON.parse(res.getContentText());
    var type = /\.avif$/i.test(name) ? 'image/avif' : /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : 'image/jpeg';
    return Utilities.newBlob(Utilities.base64Decode(file.content.replace(/\s/g, '')), type, name);
  } catch (e) {
    Logger.log(name + ': ' + e.message);
    return null;
  }
}

/** The photos folder: remembered by id, so it can be renamed or moved in Drive. */
function hbMenuFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('HB_MENU_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* deleted: make a new one */ } }
  var folder = DriveApp.createFolder(HB_MENU_FOLDER);
  props.setProperty('HB_MENU_FOLDER_ID', folder.getId());
  return folder;
}

/** Website build: every active dish, with the photo's id so the build can download it. */
function hbMenu_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HB_MENU_TAB);
  if (!sh) throw hbErr_('not_ready', 'The Menu tab is not set up yet.');
  var photos = {}, it = hbMenuFolder_().getFiles();
  while (it.hasNext()) {
    var f = it.next();
    photos[f.getName()] = { id: f.getId(), name: f.getName(), type: f.getMimeType(), size: f.getSize(), updated: f.getLastUpdated().getTime() };
  }
  var items = [];
  hbRows_(HB_MENU_TAB).forEach(function (r) {
    if (!r.name || (r.active && !hbTrue_(r.active))) return;
    items.push({
      row: r._row, name: r.name, description: r.description || '', price: r.price || '', category: r.category || '',
      menuOrder: hbInt_(r['menu order'], 0), photo: photos[r.photo] || null, photoName: r.photo || '',
      homeGroup: r['home group'] || '', homeOrder: hbInt_(r['home order'], 0)
    });
  });
  return { categories: HB_MENU_CATEGORIES, homeGroups: HB_MENU_HOME_GROUPS, items: items };
}

/** Website build: one photo from the photos folder (and only from that folder), as base64. */
function hbMenuPhoto_(req) {
  var id = String(req.id || ''), file;
  try { file = DriveApp.getFileById(id); } catch (e) { throw hbErr_('not_found', 'No such photo.'); }
  var folderId = hbMenuFolder_().getId(), inFolder = false, parents = file.getParents();
  while (parents.hasNext()) if (parents.next().getId() === folderId) inFolder = true;
  if (!inFolder) throw hbErr_('not_found', 'No such photo.');
  if (file.getSize() > HB_MENU_MAX_PHOTO) throw hbErr_('too_big', 'Photo "' + file.getName() + '" is larger than 4 MB.');
  return { id: id, name: file.getName(), type: file.getMimeType(), data: Utilities.base64Encode(file.getBlob().getBytes()) };
}

/** Sheet menu: asks Netlify to rebuild the website with the menu as it is now. */
function publishMenu() {
  var ui = SpreadsheetApp.getUi(), hook = '';
  hbRows_(HB_TABS.settings).forEach(function (r) { if (r.key === 'menuBuildHook') hook = r.value; });
  if (!/^https:\/\/api\.netlify\.com\/build_hooks\//.test(hook)) {
    ui.alert('The Netlify build hook is missing. Add it to the Settings tab as "menuBuildHook".');
    return;
  }
  var res = UrlFetchApp.fetch(hook, { method: 'post', muteHttpExceptions: true });
  if (res.getResponseCode() >= 300) { ui.alert('Netlify did not accept the request (' + res.getResponseCode() + '). Try again in a minute.'); return; }
  SpreadsheetApp.getActiveSpreadsheet().toast('The website is being rebuilt with the new menu. It is live in about a minute.', 'Menu published', 8);
}
