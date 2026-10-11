// Runs the actual exported application. DOM/event checks, not browser layout tests.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { window, document } = parseHTML(fs.readFileSync(require('node:path').resolve(__dirname, '../dist/torobai.html'), 'utf8'));
let hash = '#api', nativeHashWrites = 0, reduced = false, active = document.body;
const history = [], scrolls = [], intoView = [], pauses = [], behaviors = [];
let headerPosition = "sticky";
const location = { get hash() { return hash; }, set hash(v) { hash = v; nativeHashWrites++; }, href: 'file:///torobai.html' };
const push = (_s, _t, url) => { hash = url; history.push(url); };
window.history = { pushState: push, replaceState: (_s, _t, url) => { hash = url; } };
window.localStorage = { getItem: () => null, setItem: () => {} };
window.scrollX = 0; window.scrollY = 0; window.innerHeight = 700;
window.scrollTo = ({ left = 0, top = 0, behavior }) => { behaviors.push(behavior); window.scrollX = left; window.scrollY = top; scrolls.push({ left, top }); };
window.HTMLElement.prototype.scrollIntoView = function () { intoView.push(this.id); };
window.HTMLElement.prototype.focus = function (options) { active = this; if (!options?.preventScroll) throw Error('Unrequested focus scroll'); };
window.getComputedStyle = () => ({ position: headerPosition });
window.HTMLElement.prototype.getBoundingClientRect = function () {
  return this.classList.contains('product-card') ? { top: 700 - window.scrollY, height: 300 } :
    this.classList.contains('site-header') ? { top: 0, height: 100 } : { top: 0, height: 1200 };
};
Object.defineProperty(document, 'activeElement', { get: () => active });
Object.defineProperty(document.documentElement, 'scrollHeight', { value: 3500, writable: true });
const dialog = document.getElementById('infoDialog');
dialog.showModal = () => { dialog.open = true; }; dialog.close = () => { dialog.open = false; };
const context = vm.createContext({ window, document, location, URL, URLSearchParams, console,
  fetch: () => { throw Error('Offline file must not fetch'); }, navigator: {},
  matchMedia: () => ({ matches: reduced }),
  setTimeout: (fn, ms) => { pauses.push(ms); if (ms <= 1000) setImmediate(fn); return pauses.length; }, clearTimeout: () => {} });
const run = code => vm.runInContext(code, context);
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve)); };
const click = (node, props = {}) => {
  assert.ok(node, 'Control exists');
  const e = new window.Event('click', { bubbles: true, cancelable: true });
  Object.assign(e, { button: 0, ...props }); active = node; node.dispatchEvent(e); return e;
};
const $ = id => document.getElementById(id);
const busy = value => {
  assert.equal($('navigationStatus').hidden, !value);
  assert.equal($('main').getAttribute('aria-busy'), String(value));
};
(async () => {
  for (const script of document.querySelectorAll('script')) run(script.textContent);
  await flush();
  assert.equal(window.history.scrollRestoration, 'manual');
  const loadingStarts = [];
  const originalBusy = run('setNavigationBusy');
  context.observeBusy = busy => { if (busy) loadingStarts.push(true); };
  run('globalThis.originalBusy=setNavigationBusy;setNavigationBusy=busy=>{observeBusy(busy);originalBusy(busy)}');

  // 1. Ready page data displays immediately, then scrolls smoothly to its first card below the header.
  window.scrollY = 1250; scrolls.length = 0; intoView.length = 0;
  document.querySelector('.category-tabs').scrollLeft = -185;
  assert.equal(click(document.querySelector('[data-page="2"]')).defaultPrevented, true);
  assert.equal(run('state.page'), 2); busy(false); assert.ok(hash.includes('page=2'));
  assert.equal(window.scrollY, 584); assert.equal(document.querySelector('.category-tabs').scrollLeft, -185);
  assert.equal(active, document.querySelector('.product-grid > .product-card h2 a'));
  assert.equal(behaviors.at(-1), 'smooth'); assert.equal(intoView.length, 0);
  assert.deepEqual(scrolls, [{ left: 0, top: 584 }]);

  // 2. Back to page one and quick page choices are immediate.
  click(document.querySelector('[data-page="1"]'));
  assert.equal(run('state.page'), 1);
  click(document.querySelector('[data-page="3"]'));
  assert.equal(run('state.page'), 3); busy(false);

  // 3. A duplicate choice does not add duplicate history entries.
  const pageTwo = document.querySelector('[data-page="2"]');
  click(pageTwo); const writes = history.length, scrollCount = scrolls.length;
  click(document.querySelector('[data-page="2"]'));
  assert.equal(history.length, writes);
  assert.equal(scrolls.length, scrollCount, 'Re-selecting the current page cannot interrupt its scroll');

  // 4. Page-size changes reset results while retaining scroll.
  const size = $('pageSize'); size.querySelector('[value="40"]').selected = true;
  size.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(run('state.size'), 40); assert.equal(run('state.page'), 1);
  assert.equal(behaviors.at(-1), "instant", "Page-size reset is not a pagination click");
  assert.equal(window.scrollY, 584);

  // 5. Shorter GPU results keep the viewport and show matching controls immediately.
  document.documentElement.scrollHeight = 600;
  click($('gpuNav')); assert.equal(run('state.kind'), 'gpu'); assert.equal($('catalogUsageForm'), null);
  assert.equal(window.scrollY, 584); assert.ok(parseInt($('main').style.minHeight) > 0);
  document.documentElement.scrollHeight = 3500;

  // 6. Filtering and clearing are local operations, including the first selection.
  click($('apiNav'));
  click(document.querySelector('[data-toggle-filter="open"]'));
  assert.equal(run('state.open'), true); assert.equal(window.scrollY, 584);
  click(document.querySelector('[data-action="reset"]'));
  assert.equal(run('state.open'), false); assert.equal(window.scrollY, 584);

  // 7. Browser history restores ready fragment data without adding another entry.
  const beforeBack = history.length;
  hash = '#api?page=2'; window.dispatchEvent(new window.Event('hashchange'));
  assert.equal(run('state.page'), 2); assert.equal(history.length, beforeBack); assert.equal(window.scrollY, 584);
  hash = '#api'; window.dispatchEvent(new window.Event('hashchange'));
  assert.equal(run('state.page'), 1); assert.equal(history.length, beforeBack);

  // 8. Render failure still rolls back, releases controls and permits retry.
  const oldGrid = document.querySelector('.product-grid');
  run('globalThis.originalRender=renderCatalog;renderCatalog=()=>{throw Error("render")}');
  click(document.querySelector('[data-toggle-filter="open"]')); busy(false);
  assert.equal(run('state.open'), false); assert.equal(document.querySelector('.product-grid'), oldGrid);
  assert.equal(oldGrid.hasAttribute('inert'), false); assert.ok($('toast').textContent.includes('دوباره'));
  run('renderCatalog=originalRender');
  click(document.querySelector('[data-toggle-filter="open"]')); assert.equal(run('state.open'), true);

  // 9. Restricted file origins never trigger native fragment navigation.
  window.history.pushState = () => { throw Error('file origin'); };
  click($('gpuNav')); assert.equal(run('state.kind'), 'gpu');
  assert.equal(nativeHashWrites, 0); assert.equal(window.scrollY, 584);
  window.history.pushState = push;

  // 10. Product presets and weight offers are ready on the very first visit.
  window.scrollY = 740; scrolls.length = 0;
  run('navigate("#api/avanvis-fa")');
  assert.equal(window.scrollY, 0); assert.ok($('featuredOffer').dataset.offerId);
  window.scrollY = 710;
  click(document.querySelector('.purchase-tabs a[href*="access=weights"]'));
  assert.equal(run('purchaseMode'), 'weights'); assert.equal(window.scrollY, 710);
  assert.ok($('featuredOffer').dataset.weightOfferId);
  click(document.querySelector('.purchase-tabs a:not([href*="access=weights"])'));
  assert.equal(run('purchaseMode'), 'api'); assert.equal(window.scrollY, 710);
  assert.ok($('featuredOffer').dataset.offerId);
  await flush(); assert.equal(window.scrollY, 710);

  // 11. Modified clicks preserve browser new-tab behavior.
  const modified = click($('gpuNav'), { ctrlKey: true });
  assert.equal(modified.defaultPrevented, false); busy(false);

  // 12. Ready paths never start a spinner or add an intentional pause, even for an instant.
  reduced = true; click($('apiNav')); window.scrollY = 375; click($('gpuNav'));
  assert.equal(window.scrollY, 375); busy(false);
  assert.equal(loadingStarts.length, 0);
  assert.ok(pauses.every(ms => ms > 1000), 'Only toast dismissal timers may run');
  assert.equal(nativeHashWrites, 0); assert.equal(intoView.length, 0);
  // 13. Numbered navigation respects reduced motion; mobile has no sticky-header offset.
  click($('apiNav')); reduced = true; window.scrollY = 1500;
  click(document.querySelector('[data-page="2"]'));
  assert.equal(window.scrollY, 584); assert.equal(behaviors.at(-1), 'instant');
  reduced = false; headerPosition = 'static'; window.scrollY = 1200;
  click(document.querySelector('[data-page="1"]'));
  assert.equal(window.scrollY, 684); assert.equal(behaviors.at(-1), 'smooth');

  // 14. A filter resetting page two to one must retain the user's viewport.
  click(document.querySelector('[data-page="2"]')); window.scrollY = 930;
  click(document.querySelector('[data-toggle-filter="open"]'));
  assert.equal(run('state.page'), 1); assert.equal(window.scrollY, 930);
  assert.equal(behaviors.at(-1), 'instant');
  // 15. Product section tabs show exactly one existing panel without route/scroll/loading.
  run('navigate("#api/avanvis-fa")');
  const tab = key => document.querySelector(`[data-detail-tab="${key}"]`);
  const visible = () => [...document.querySelectorAll('.detail-panel')].filter(p => !p.hidden).map(p => p.id);
  const expectTab = key => {
    assert.deepEqual(visible(), ['detail-panel-' + key]);
    assert.equal(tab(key).getAttribute('aria-selected'), 'true');
    assert.equal(tab(key).getAttribute('tabindex'), '0');
    assert.equal(document.querySelectorAll('.detail-tabs [aria-selected="true"]').length, 1);
  };
  expectTab('prices');
  const form = $('budgetForm'), field = form.querySelector('input');
  field.value = '۱۲۳';
  const previousHistory = history.length, previousScrolls = scrolls.length, previousInto = intoView.length;
  let animationCalls = 0, cancellations = 0;
  $('detail-panel-uptime').animate = () => { animationCalls++; return { cancel: () => cancellations++ }; };
  click(tab('uptime')); expectTab('uptime');
  assert.equal(animationCalls, 1);
  click(tab('uptime')); assert.equal(animationCalls, 1);
  click(tab('specs')); expectTab('specs'); assert.equal(cancellations, 1);
  assert.ok(document.querySelector('#detail-panel-specs .model-profile'));
  assert.equal(history.length, previousHistory);
  assert.equal(scrolls.length, previousScrolls);
  assert.equal(intoView.length, previousInto);
  assert.equal(loadingStarts.length, 0);

  // 16. RTL arrows and Home/End activate and focus available tabs only.
  const key = value => { const e = new window.Event('keydown', { bubbles: true, cancelable: true }); e.key = value; active.dispatchEvent(e); assert.equal(e.defaultPrevented, true); };
  active = tab('specs'); key('ArrowLeft'); expectTab('costs'); assert.equal(active, tab('costs'));
  key('Home'); expectTab('prices'); key('ArrowRight'); expectTab('costs');
  key('ArrowLeft'); expectTab('prices'); key('End'); expectTab('costs');

  // 17. Hidden forms retain edits; repricing does not activate the price panel.
  click(tab('prices')); assert.equal($('budgetForm'), form); assert.equal(field.value, '۱۲۳');
  click(tab('costs')); await run('changePreset("heavy")'); expectTab('costs');
  assert.ok($('costChart').querySelector('.cost-column'));

  // 18. Access changes retain applicable tabs, otherwise fall back to prices.
  click(document.querySelector('.purchase-tabs a[href*="access=weights"]'));
  expectTab('prices'); assert.equal(tab('costs'), null); assert.equal(tab('uptime'), null);
  click(tab('specs'));
  click(document.querySelector('.purchase-tabs a:not([href*="access=weights"])'));
  expectTab('specs');
  run('navigate("#api/gpt-4o-mini")'); expectTab('prices');

  // 19. Reduced motion still switches immediately, with no animation or data wait.
  reduced = true;
  $('detail-panel-uptime').animate = () => { throw Error('Reduced motion must skip animation'); };
  click(tab('uptime')); expectTab('uptime');
  assert.equal(loadingStarts.length, 0); assert.equal(nativeHashWrites, 0);
  console.log(JSON.stringify({ status: 'passed', scenarios: 19, scope: 'Ready navigation, exclusive product tabs, history and scroll-command checks; no browser rendering' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
