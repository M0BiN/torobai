// Structural checks for the requested rail and compact home; not browser rendering.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const cssom = require('cssom');
const css = fs.readFileSync(
  require('node:path').join(__dirname, '../app/static/styles.css'),
  'utf8'
);
const sheet = cssom.parse(css);
const all = [];
function collect(rules) {
  for (const r of rules) {
    if (r.selectorText) all.push(r);
    if (r.cssRules) collect(r.cssRules);
  }
}
collect(sheet.cssRules);
test('categories keep one scrollable horizontal row at every width', () => {
  const rules = all.filter((r) => r.selectorText === '.category-tabs');
  assert.ok(rules.some((r) => r.style.display === 'flex' && r.style['overflow-x'] === 'auto'));
  assert.ok(rules.some((r) => r.style['flex-wrap'] === 'nowrap'));
  assert.ok(
    !rules.some(
      (r) =>
        r.style.display === 'grid' ||
        r.style['flex-wrap'] === 'wrap' ||
        r.style['scrollbar-width'] === 'none'
    )
  );
  assert.ok(
    all.some((r) => r.selectorText === '.category-tabs > a' && r.style.flex === '0 0 auto')
  );
});
test('the category scrollbar has a visible rounded thumb and Chromium plus standard styles', () => {
  assert.ok(
    all.some(
      (r) =>
        r.selectorText === '.category-tabs' &&
        r.style['scrollbar-width'] === 'thin' &&
        r.style['scrollbar-color']
    )
  );
  const bar = all.find((r) => r.selectorText === '.category-tabs::-webkit-scrollbar');
  const thumb = all.find((r) => r.selectorText === '.category-tabs::-webkit-scrollbar-thumb');
  assert.equal(bar.style.height, '8px');
  assert.equal(thumb.style['border-radius'], '20px');
  assert.equal(thumb.style['background-clip'], 'padding-box');
  assert.ok(
    all.some(
      (r) =>
        r.selectorText === '.category-tabs::-webkit-scrollbar-button' && r.style.display === 'none'
    )
  );
});
test('daily uptime remains square and wraps into two rows on narrow screens', () => {
  const day = all.find((r) => r.selectorText === '.uptime-day');
  assert.equal(day.style['aspect-ratio'], '1');
  const calendars = all.filter((r) => r.selectorText === '.uptime-calendar');
  assert.ok(
    calendars.some((r) => r.style['grid-template-columns'] === 'repeat(30, minmax(0, 1fr))')
  );
  assert.ok(
    calendars.some((r) => r.style['grid-template-columns'] === 'repeat(15, minmax(0, 1fr))')
  );
  assert.ok(!all.some((r) => r.selectorText.includes('.uptime-meter')));
});
test('five primary destinations have an explicit one-row compact navigation override', () => {
  const nav=all.filter(r=>r.selectorText==='.main-nav').at(-1);
  assert.equal(nav.style.display,'flex');
  assert.equal(nav.style['flex-wrap'],'nowrap');
  assert.equal(nav.style['overflow-x'],'auto');
  assert.equal(all.filter(r=>r.selectorText==='.main-nav > a').at(-1).style.flex,'0 0 auto');
});
