const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const root = require('node:path').resolve(__dirname, '..');
const html = fs.readFileSync(process.argv[2] || root + '/dist/torobai.html', 'utf8');
const { window, document } = parseHTML(html);
const styles = [...document.querySelectorAll('style')];
assert.equal(styles.length, 1, 'The portable file must contain its application stylesheet');
const css = styles[0].textContent;
assert.ok(
  css.includes('.product-grid') && css.includes('@media'),
  'Layout and responsive styles are required'
);
assert.ok(!css.includes('/static/'), 'CSS must not load assets from a server');
for (const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
  assert.ok(match[1].startsWith('data:'), 'Every CSS resource must be embedded');
}
for (const name of ['Vazirmatn']) {
  const bytes = fs.readFileSync(root + '/app/static/fonts/' + name + '.woff2').toString('base64');
  assert.ok(css.includes(bytes), 'The actual ' + name + ' font must be embedded in CSS');
}
for (const el of document.querySelectorAll('link[href], script[src], img[src]')) {
  const resource = el.getAttribute('src') || el.getAttribute('href');
  assert.ok(resource.startsWith('data:'), 'Unexpected external resource: ' + resource);
}
const inline = [...document.querySelectorAll('script')].map((s) => s.textContent);
let currentHash = '';
const location = {
  get hash() {
    return currentHash;
  },
  set hash(value) {
    currentHash = '#' + value.replace(/^#/, '');
  },
  href: 'file:///torobai.html#api'
};
window.history = {
  pushState: (_state, _title, url) => { location.hash = url; },
  replaceState: (_state, _title, url) => {
    location.hash = url;
  }
};
const storage = new Map();
const timers = [];
const motionFrames = new Map(), motionAnimations = [];
let motionFrameID = 0;
const context = vm.createContext({
  window,
  document,
  location,
  URL,
  Blob,
  URLSearchParams,
  console,
  fetch: () => {
    throw new Error('A portable page must not make network requests');
  },
  navigator: { clipboard: { writeText: async () => {} } },
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: fn => { motionFrames.set(++motionFrameID, fn); return motionFrameID; },
  cancelAnimationFrame: id => motionFrames.delete(id),
  setTimeout: (fn, delay = 0) => {
    timers.push(delay);
    if (delay <= 1000) setImmediate(fn);
    return timers.length;
  },
  clearTimeout: () => {}
});
window.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, v)
};
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.focus = () => {};
// Exercise real generated disclosures with simulated geometry/WAAPI, not pixels.
window.HTMLElement.prototype.getBoundingClientRect = function () { return { height: this.style.height ? parseFloat(this.style.height) : 180, top: 0 }; };
window.HTMLElement.prototype.animate = function (frames) {
  const animation = { frames, onfinish: null, oncancel: null, cancel() {}, finish() { this.onfinish?.(); } };
  motionAnimations.push(animation);
  return animation;
};
window.getComputedStyle = () => ({ opacity: '1', transform: 'none', clipPath: 'none' });
// Existing dialog tests assert immediate native states; its animation is covered
// independently in test_motion.cjs. Only disclosures opt into this harness.
document.getElementById('infoDialog').animate = null;
document.getElementById('infoDialog').showModal = function () {
  this.open = true;
};
document.getElementById('infoDialog').close = function () {
  this.open = false;
};
const flush = async () => {
  for (let i = 0; i < 3; i++) await new Promise((resolve) => setImmediate(resolve));
};
const run = (code) => vm.runInContext(code, context);
async function route(hash) {
  location.hash = hash;
  await run('route()');
  await flush();
}
(async () => {
  for (const script of inline) vm.runInContext(script, context);
  await flush();
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 20);
  assert.equal(document.querySelectorAll('.category-tabs>a').length, 11);
  assert.equal(document.querySelectorAll('.seller-invitation').length, 0);
  assert.equal(document.querySelectorAll('.main-nav>a').length, 5);
  assert.equal(run('state.path'), 'api');
  assert.equal(run('state.persian'), false);
  assert.equal(document.getElementById('apiNav').getAttribute('aria-current'), 'page');
  assert.equal(document.querySelector('.wordmark').getAttribute('href'), '#api');
  assert.equal(document.querySelector('.main-nav>a').id, 'apiNav');
  assert.ok(!document.documentElement.textContent.includes('بازار مدل‌های فارسی'));
  assert.equal(document.querySelector('.catalog-heading p'), null, 'No large intro before results');
  assert.equal(document.querySelector('.category-tabs').getAttribute('tabindex'), '0');
  const firstRow = [...document.querySelectorAll('.product-grid>.product-card')]
    .slice(0, 5)
    .map((el) => el.dataset.productId);
  assert.deepEqual(firstRow, [
    'qwen3.8-27b',
    'gemma-4-31b',
    'gpt-5-mini',
    'claude-sonnet-4.5',
    'deepseek-v4-pro'
  ]);
  const products = window.TOROBAI_CATALOG.products;
  for (const p of products) {
    await route('#' + p.kind + '/' + p.id);
    const detailTabs = [...document.querySelectorAll('.detail-tabs [role="tab"]')];
    const offerBadge = document.querySelector('.purchase-tabs .tab-count');
    if (p.kind === 'api' && p.offers.length) {
      const count = run(`fa(${p.offers.length})`);
      assert.equal(offerBadge.textContent, count, 'API badge must contain its count once, with no leaked attribute text');
      assert.equal(offerBadge.getAttribute('aria-label'), count + ' پیشنهاد');
    }
    assert.equal(detailTabs.filter(tab => tab.getAttribute('aria-selected') === 'true').length, 1);
    assert.deepEqual([...document.querySelectorAll('.detail-panel')].filter(panel => !panel.hidden).map(panel => panel.id), ['detail-panel-prices']);
    for (const tab of detailTabs) {
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      assert.ok(panel);
      assert.equal(panel.getAttribute('aria-labelledby'), tab.id);
    }
    for (const details of document.querySelectorAll('#main details')) {
      const children = [...details.querySelectorAll('input,button,select,a')];
      window.TorobMotion.setOpen(details, true);
      for (const [id, fn] of [...motionFrames]) { motionFrames.delete(id); fn(); }
      motionAnimations.at(-1)?.finish();
      assert.equal(details.hasAttribute('open'), true);
      for (const child of children) assert.ok(details.contains(child), 'Expansion must retain live controls');
      window.TorobMotion.setOpen(details, false);
      for (const [id, fn] of [...motionFrames]) { motionFrames.delete(id); fn(); }
      motionAnimations.at(-1)?.finish();
      assert.equal(details.hasAttribute('open'), false);
      assert.ok(!details.querySelector('.disclosure-reveal')?.style.height);
    }
    assert.equal(document.getElementById('productTitle').textContent, p.title);
    const expectedOrder = [...window.TOROBAI_CATALOG.estimates[p.id].standard.offers].sort(
      (a, b) => (a.estimate_toman ?? Infinity) - (b.estimate_toman ?? Infinity)
    );
    const best = expectedOrder.find((o) => o.estimate_toman != null);
    const featured = document.getElementById('featuredOffer');
    const actualOrder = [
      ...(best ? [featured.dataset.offerId] : []),
      ...[...document.querySelectorAll('.offer-row')].map((el) => el.dataset.offerId)
    ];
    assert.deepEqual(
      actualOrder,
      expectedOrder.map((o) => o.id),
      'Featured offer and remaining providers retain the consumption order: ' + p.id
    );
    if (best) {
      assert.equal(featured.querySelector('h2').textContent.trim(), best.seller);
      if (best.request_only)
        assert.equal(featured.querySelector('.featured-buy').dataset.inquire, p.id);
      else
        assert.equal(featured.querySelector('.featured-buy').getAttribute('href'), best.source_url);
      assert.ok(document.getElementById('summaryRate').querySelector('.price-number'));
      assert.ok(document.getElementById('summaryRate').textContent.includes('تومان'));
      assert.equal(
        document.getElementById('summaryRate').querySelector('.price-number').textContent,
        run(`fa(${best.estimate_toman}, ${best.estimate_toman < 100 ? 2 : 0})`)
      );
      const priced = expectedOrder.filter((o) => o.estimate_toman != null);
      assert.equal(
        Boolean(featured.querySelector('.featured-range')),
        priced.length > 1 && priced.at(-1).estimate_toman !== best.estimate_toman
      );
      assert.equal(document.getElementById('sellers').hidden, expectedOrder.length === 1);
      assert.ok(featured.querySelector('.reliability-pill'));
    }
    assert.ok(
      !/<(?:span|bdi)\b/.test(document.getElementById('main').textContent),
      'Price markup must never become visible text: ' + p.id
    );
    const ids = [...document.querySelectorAll('[id]')].map((x) => x.id);
    assert.equal(ids.length, new Set(ids).size, 'Duplicate element IDs: ' + p.id);
    assert.ok(
      !document.getElementById('main').textContent.includes('undefined'),
      'Undefined text: ' + p.id
    );
    assert.ok(!document.getElementById('main').textContent.includes('NaN'), 'NaN text: ' + p.id);
    for (const img of document.querySelectorAll('img'))
      assert.ok(
        img.getAttribute('src').startsWith('data:'),
        'Missing portable image: ' + img.getAttribute('src')
      );
  }
  await route('#api?task=decision');
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 4);
  await route('#api?open=1');
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 20);
  await route('#api?task=transcription');
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 5);
  await route('#gpu?q=RTX+۳۰۹۰');
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 1);
  await route('#api?q=doesnotexist');
  assert.ok(document.querySelector('.empty-state'));
  await route('#api/qwen3.5-9b');
  const save = document.querySelector('[data-save="qwen3.5-9b"]');
  save.dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.deepEqual(JSON.parse(storage.get('hb.saved')), ['qwen3.5-9b']);
  await route('#saved');
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 1);
  run(
    "toggleCompare('qwen3.5-9b');toggleCompare('gemma-3-12b');toggleCompare('laya');toggleCompare('decider-2b')"
  );
  assert.equal(JSON.parse(storage.get('hb.compare')).length, 3);
  await route('#compare');
  assert.equal(document.querySelectorAll('.compare-title').length, 3);
  assert.ok(document.getElementById('main').textContent.includes('واحد متفاوت'));
  await route('#gpu/rtx-3090');
  const standard = document.getElementById('summaryRate').textContent;
  await run("changePreset('light')");
  await flush();
  const light = document.getElementById('summaryRate').textContent;
  assert.notEqual(standard, light);
  await route('#gpu?ssh=1');
  await route(document.querySelector('[data-product-id="rtx-3090"] h2 a').getAttribute('href'));
  assert.ok(document.getElementById('sshOffers').hasAttribute('checked'));
  const gpu = products.find((p) => p.id === 'rtx-3090');
  assert.equal(
    document.querySelectorAll('.offer-row').length,
    gpu.offers.filter((o) => o.ssh === true).length - 1
  );
  const chartNames = [...document.querySelectorAll('.cost-column>span')].map((s) => s.textContent);
  const expectedNames = ['light', 'standard', 'heavy'].map(
    (k) =>
      window.TOROBAI_CATALOG.estimates[gpu.id][k].offers
        .filter((o) => o.ssh === true && o.estimate_toman != null)
        .sort((a, b) => a.estimate_toman - b.estimate_toman)[0]?.seller || ''
  );
  assert.deepEqual(chartNames, expectedNames);
  const checkbox = document.getElementById('sshOffers');
  checkbox.checked = false;
  checkbox.dispatchEvent(new window.Event('change', { bubbles: true }));
  await flush();
  assert.equal(document.querySelectorAll('.offer-row').length, gpu.offers.length - 1);
  await route('#api/missing');
  assert.ok(document.getElementById('main').textContent.includes('پیدا نشد'));

  await route('#providers');
  assert.equal(document.querySelectorAll('.provider-card').length, 15);
  await route('#api?provider=one');
  const providerProducts = products.filter(
    (p) => p.kind === 'api' && p.offers.some((o) => o.seller_id === 'one')
  );
  assert.equal(
    document.querySelectorAll('.product-grid>.product-card').length,
    Math.min(20, providerProducts.length)
  );
  const visibleProviderProduct = products.find(p => p.id === document.querySelector('.product-grid>.product-card').dataset.productId);
  await route(document.querySelector('.product-grid>.product-card h2 a').getAttribute('href')); 
  assert.equal(document.querySelector('#featuredOffer h2').textContent.trim(), visibleProviderProduct.offers.find(o=>o.seller_id==='one').seller);
  assert.equal(document.querySelectorAll('.offer-row').length, 0);
  assert.equal(document.querySelector('.featured-provider img').getAttribute('alt'), visibleProviderProduct.offers.find(o=>o.seller_id==='one').seller);
  assert.ok(!document.getElementById('summaryRate').textContent.includes('<span'));
  document
    .querySelector('[data-action="all-providers"]')
    .dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
  await flush();
  await route(location.hash);
  assert.equal(
    document.querySelectorAll('.offer-row').length,
    visibleProviderProduct.offers.length - 1
  );

  await route('#gpu');
  document
    .querySelector('[data-action="filters"]')
    .dispatchEvent(new window.Event('click', { bubbles: true }));
  const form = document.getElementById('filterForm');
  form.querySelector('[name="vram"] option[value="24"]').selected = true;
  form.querySelector('[name="ssh"]').checked = true;
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(document.getElementById('infoDialog').open, false);
  await flush();
  await route(location.hash);
  assert.ok(document.querySelector('[data-remove-filter="vram"]'));
  assert.ok(document.querySelector('[data-remove-filter="ssh"]'));
  assert.ok(document.querySelectorAll('.product-grid>.product-card').length > 0);
  assert.ok(
    run(
      'filterProducts(products, state, saved).every(p => p.vram >= 24 && p.offers.every(o => o.ssh === true))'
    )
  );
  document
    .querySelector('[data-remove-filter="vram"]')
    .dispatchEvent(new window.Event('click', { bubbles: true }));
  await flush();
  await route(location.hash);
  assert.equal(document.querySelector('[data-remove-filter="vram"]'), null);
  assert.ok(document.querySelector('[data-remove-filter="ssh"]'));

  await route('#api');
  document
    .querySelector('[data-toggle-filter="open"]')
    .dispatchEvent(new window.Event('click', { bubbles: true }));
  await flush();
  await route(location.hash);
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 20);

  await route('#api/qwen3.5-9b');
  await route('#api/qwen3.5-9b');
  const history = JSON.parse(storage.get('torobai.recent'));
  assert.equal(history[0], 'qwen3.5-9b');
  assert.equal(history.filter((id) => id === 'qwen3.5-9b').length, 1);
  assert.ok(history.length <= 12);
  await route('#recent');
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, history.length);
  document
    .querySelector('[data-action="clear-recent"]')
    .dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.deepEqual(JSON.parse(storage.get('torobai.recent')), []);
  assert.ok(document.querySelector('.empty-state'));

  await route('#api');
  const verifiedProduct = products.find(
    (p) =>
      p.maker === 'OpenAI' &&
      p.offers.some((o) => o.seller_id === 'one' && o.pricing_basis !== 'planning_catalog')
  );
  await route('#api?q=' + encodeURIComponent(verifiedProduct.title));
  document
    .querySelector(`[data-uptime-product="${verifiedProduct.id}"]`)
    .dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.equal(document.getElementById('infoDialog').open, true);
  const panel = document.getElementById('dialogBody');
  assert.equal(panel.querySelector('meter'), null);
  const calendars = panel.querySelectorAll('.uptime-calendar');
  assert.equal(calendars.length, verifiedProduct.offers.length);
  for (const calendar of calendars) {
    assert.equal(calendar.querySelectorAll('.uptime-day').length, 30);
    const history = calendar.parentElement;
    const offerID = history.dataset.historyOffer;
    const expected = window.TOROBAI_CATALOG.presentation_reliability.offers[offerID].daily;
    assert.deepEqual(
      [...calendar.children].map((d) => d.dataset.date),
      Array.from(expected, (d) => d.date)
    );
    assert.deepEqual(
      [...calendar.children].map((d) => Number(d.dataset.percent)),
      Array.from(expected, (d) => d.percent)
    );
    assert.equal(history.querySelectorAll('.uptime-day-list time').length, 30);
    assert.ok(calendar.getAttribute('aria-label').includes('۳۰ روز'));
    assert.ok(!calendar.getAttribute('aria-label').includes('<'));
    assert.ok([...calendar.children].every((d) => !d.dataset.tooltip.includes('<')));
  }
  assert.ok(panel.textContent.includes('دسترس‌پذیری سرویس'));
  assert.ok(!panel.textContent.includes('نرخ موفقیت درخواست‌ها'));
  assert.equal(panel.querySelectorAll('.has-report').length, verifiedProduct.offers.length);
  run("$('infoDialog').close()");
  await route('#gpu/rtx-3090');
  assert.ok(document.querySelectorAll('#main .uptime-section .uptime-calendar').length > 0);
  await route('#api/qwen3.5-9b');
  assert.ok(document.querySelectorAll('#main .uptime-section .uptime-calendar').length > 0);
  assert.ok(!/[ه]\u0654|ۀ/.test(document.documentElement.textContent));

  // Mixed-task price sorting requires a deliberate category choice.
  await route('#api');
  document
    .querySelector('[data-sort="price"]')
    .dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.equal(location.hash, '#api');
  assert.equal(document.getElementById('infoDialog').open, true);
  const choice = document.querySelector('.task-picker a[href*="task=chat"]');
  const choiceURL = choice.getAttribute('href');
  choice.click();
  assert.equal(document.getElementById('infoDialog').open, false);
  await route(choiceURL);
  assert.equal(run('state.task'), 'chat');
  assert.ok(document.querySelector('.catalog-price-overview'));
  for (const hash of [
    '#api?sort=price',
    '#api?sort=price-desc',
    '#gpu?sort=price',
    '#gpu?sort=price-desc',
    '#api?task=embedding&sort=price'
  ]) {
    await route(hash);
    const ids = [...document.querySelectorAll('.product-grid>.product-card')].map(
      (el) => el.dataset.productId
    );
    const values = ids.map((id) => {
      const rows = window.TOROBAI_CATALOG.estimates[id].standard.offers.filter(
        (o) => o.estimate_toman != null
      );
      return rows.length ? Math.min(...rows.map((o) => o.estimate_toman)) : null;
    });
    const descending = hash.includes('price-desc');
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] == null) assert.equal(values[i], null, 'Unknown prices stay last');
      else if (values[i] != null)
        assert.ok(descending ? values[i - 1] >= values[i] : values[i - 1] <= values[i]);
    }
    assert.ok(values.some((v) => v != null));
  }
  await route('#api?sort=price');
  assert.equal(
    document.querySelector('.product-grid>.product-card').dataset.productId,
    'qwen3.5-0.8b'
  );
  assert.ok(document.querySelector('.card-price').textContent.includes('هزینه مصرف انتخابی'));

  await route('#api/gpt-4o-mini');
  const chooser = document.getElementById('sellerSort');
  chooser.querySelector('option[value="cost-desc"]').selected = true;
  chooser.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(document.getElementById('featuredOffer').dataset.offerId, 'one-gpt4omini');
  assert.ok(document.querySelector('.offer-row:last-child').textContent.includes('بررسی دوباره'));
  document
    .querySelector('[data-action="usage"]')
    .dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.equal(document.getElementById('usageDetails').open, true);
  await run("changePreset('heavy')");
  assert.ok(!document.getElementById('summaryRate').textContent.includes('<'));
  assert.ok(document.getElementById('usageSummary').textContent.includes('۱۰,۰۰۰'));

  // Default/reset search stays in the general catalog; the Persian category is opt-in.
  await route('');
  document.getElementById('searchInput').value = 'GPT-5';
  document
    .getElementById('searchForm')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.ok(location.hash.startsWith('#api?'));
  await flush();
  await route(location.hash);
  assert.ok(document.querySelectorAll('.product-grid>.product-card').length > 0);
  document.querySelector('[data-action="reset"]').click();
  await flush();
  assert.equal(location.hash, '#api');
  await route('#fa');
  assert.equal(run('state.persian'), true);
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 13);
  assert.equal(document.getElementById('faNav').getAttribute('aria-current'), 'page');
  const homeLink = document.querySelector('.wordmark').getAttribute('href');
  await route(homeLink);
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 20);
  const chat = document.getElementById('chatbotPanel');
  chat.showModal = () => { chat.open = true; };
  chat.close = () => { chat.open = false; };
  document.getElementById('guideButton').click();
  assert.ok(chat.open);
  assert.ok(document.querySelector('#chatbotChoices [data-chat-choice]'));
  document.getElementById('chatbotClose').click();
  // Persian discovery keeps access, publisher type and price units separate.
  await route('#fa');
  assert.ok(document.querySelector('h1').textContent.includes('مدل‌های اختصاصی فارسی'));
  assert.equal(document.querySelectorAll('[data-access-filter]').length, 3);
  document.querySelector('[data-access-filter="weights"]').click();
  await flush();
  await route(location.hash);
  assert.ok(location.hash.startsWith('#fa?'));
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 10);
  await route('#fa?access=api&publisher=person');
  assert.deepEqual(
    [...document.querySelectorAll('.product-card')].map((p) => p.dataset.productId).sort(),
    ['nazar-fa', 'tarjoman-fa-en', 'whisper-fa-cv17']
  );
  await route('#fa?access=weights&task=translation&sort=price');
  assert.equal(document.querySelector('.product-card').dataset.productId, 'parsinlu-en-fa');
  assert.ok(document.querySelector('.catalog-price-overview').textContent.includes('مجوز پایه'));
  await route('#fa?access=weights&task=translation&sort=price-desc');
  assert.equal(document.querySelector('.product-card').dataset.productId, 'tarjoman-en-fa');
  await route('#fa?sort=price');
  assert.equal(run('state.task'), 'transcription');
  assert.equal(document.querySelector('.product-card').dataset.productId, 'shenava-call');
  // API/weights switching changes the offer type, never the API calculation.
  await route('#api/avanvis-fa');
  const apiCost = document.querySelector('#summaryRate .price-number').textContent;
  assert.equal(apiCost, run('fa(750000)'));
  await route('#api/avanvis-fa?access=weights');
  assert.ok(document.getElementById('main').classList.contains('weights-view'));
  assert.equal(
    document.getElementById('featuredOffer').dataset.weightOfferId,
    'weights-avanvis-fa'
  );
  assert.equal(document.getElementById('summaryRate'), null);
  assert.ok(document.getElementById('featuredOffer').textContent.includes('غیرانحصاری'));
  assert.equal(document.querySelectorAll('.offer-row').length, 0);
  assert.ok(document.querySelector('.delivery-grid').textContent.includes('Safetensors'));
  await route('#api/tarjoman-fa-en');
  assert.ok(!document.getElementById('main').classList.contains('weights-view'));
  assert.equal(document.querySelectorAll('.offer-row').length, 2);
  assert.equal(document.querySelectorAll('.purchase-tabs a').length, 2);
  assert.equal(document.querySelector('#featuredOffer h2').textContent.trim(), 'سپهر | توسعه‌دهنده مستقل');
  assert.equal(document.querySelector('#summaryRate .price-number').textContent, run('fa(21000)'));
  await route(
    document.querySelector('.purchase-tabs a[href$="access=weights"]').getAttribute('href')
  );
  assert.ok(document.getElementById('main').classList.contains('weights-view'));
  assert.equal(
    document.querySelector('#featuredOffer .price-number').textContent,
    run('fa(14000000)')
  );
  await route('#api/whisper-fa-cv17');
  assert.equal(document.querySelectorAll('.purchase-tabs a').length, 2);
  assert.equal(document.querySelectorAll('.offer-row').length, 1);
  assert.ok(document.querySelector('.offer-access-note').textContent.includes('برچسب زمانی'));
  await route('#api/whisper-fa-cv17?access=weights');
  assert.ok(
    document
      .querySelector('.featured-buy')
      .getAttribute('href')
      .includes('MohammadGholizadeh/whisper-large-v3-persian-common-voice-17')
  );
  await route('#api/parsinlu-en-fa?access=weights');
  assert.ok(document.getElementById('featuredOffer').textContent.includes('غیرتجاری'));
  assert.ok(
    document
      .querySelector('.featured-buy')
      .getAttribute('href')
      .startsWith('https://huggingface.co/')
  );
  // Discovery changes preserve context and provide a route out of an empty scope.
  await route('#fa?access=weights&publisher=person&q=فارسی');
  const translation = document
    .querySelector('.category-tabs a[href*="task=translation"]')
    .getAttribute('href');
  assert.ok(
    translation.includes('access=weights') &&
      translation.includes('publisher=person') &&
      translation.includes('q=')
  );
  await route('#fa?task=transcription&sort=price');
  document.querySelector('[data-remove-filter="task"]').click();
  await flush();
  await route(location.hash);
  assert.equal(run('state.task'), '');
  assert.equal(run('state.sort'), 'selected');
  await route('#fa?q=GPT-4o');
  assert.ok(document.querySelector('.search-scope-note a[href^="#api?q="]'));
  assert.ok(document.querySelector('.empty-state a[href="#fa"]'));
  await route('#fa?q=RTX%203090');
  assert.ok(document.querySelector('.search-scope-note a[href^="#gpu?q="]'));
  await route('#gpu?q=Whisper');
  assert.ok(document.querySelector('.search-scope-note a[href^="#api?q="]'));
  await route('#fa?task=transcription');
  document.querySelector('[data-action="filters"]').click();
  assert.equal(document.querySelector('#filterForm [name=context]'), null);
  assert.equal(document.querySelector('#filterForm [name=vram]'), null);
  document.getElementById('closeDialog').click();
  await route('#fa?access=weights&task=translation');
  assert.ok(document.querySelector('[data-product-id="parsinlu-en-fa"] .restricted-license'));
  await route('#fa?provider=indie-sepehr&access=weights');
  assert.ok(document.querySelector('[data-product-id="tarjoman-fa-en"]'));
  await route('#api/tarjoman-fa-en?access=weights');
  assert.equal(
    document.querySelector('#featuredOffer h2').textContent.trim(),
    products.find((p) => p.id === 'tarjoman-fa-en').weight_offers[0].seller
  );
  await route('#fa');
  await route('#api/whisper-1');
  assert.equal(document.getElementById('sellers').hidden, true);
  assert.equal(document.querySelector('[data-price-section]').getAttribute('aria-controls'), 'detail-panel-prices');
  assert.equal(document.querySelector('.featured-range'), null);
  assert.ok(!document.querySelector('#specs').textContent.includes('ظرفیت متن'));
  await route('#api?open=1');
  assert.equal(document.getElementById('apiNav').getAttribute('aria-current'), 'page');
  const menu = document.getElementById('personalMenu');
  menu.open = true;
  const escape = new window.Event('keydown', { bubbles: true });
  escape.key = 'Escape';
  document.dispatchEvent(escape);
  for (const [id, fn] of [...motionFrames]) { motionFrames.delete(id); fn(); }
  motionAnimations.at(-1)?.finish();
  assert.equal(menu.open, false);
  document.getElementById('guideButton').click();
  assert.equal(document.getElementById('chatbotPanel').open, true);
  assert.ok(document.querySelectorAll('#chatbotChoices [data-chat-choice]').length >= 6);
  document.getElementById('chatbotClose').click();

  // Both fictional hosts have complete API request snapshots; noncommercial scope is prominent.
  await route('#fa');
  await route('#api/parsinlu-en-fa');
  assert.equal(document.querySelectorAll('.offer-access-note.noncommercial').length, 2);
  assert.ok(document.querySelector('#featuredOffer').textContent.includes('غیرتجاری'));
  document.querySelector('#featuredOffer [data-inquire]').click();
  assert.ok(document.querySelector('#requestForm .noncommercial').textContent.includes('غیرتجاری'));
  const apiRequest = document.getElementById('requestForm');
  apiRequest.querySelector('[name=organization]').value = 'گروه پژوهش';
  apiRequest.querySelector('[name=purpose]').value = 'پژوهش غیرتجاری روی ترجمه';
  apiRequest.querySelector('[name=terms]').checked = true;
  apiRequest.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  const apiSnapshot = JSON.parse(storage.get('torobai.requests'))[0];
  assert.equal(apiSnapshot.access, 'api');
  assert.equal(apiSnapshot.terms.access_scope, 'noncommercial');
  assert.ok(apiSnapshot.terms.service_terms.monthly_characters_limit === 1000000);
  const apiText = run("requestText(localRecords('torobai.requests')[0])");
  assert.ok(apiText.includes('غیرتجاری') && apiText.includes('۱ میلیون'));
  assert.ok(!apiText.includes('undefined') && !apiText.includes('<span'));
  await route('#requests');
  document.querySelector('[data-delete-request]').click();
  assert.deepEqual(JSON.parse(storage.get('torobai.requests')), []);

  // Purchase requests are local drafts, with complete license terms and no send.
  await route('#api/avanvis-fa?access=weights');
  document.querySelector('[data-inquire]').click();
  const reqForm = document.getElementById('requestForm');
  reqForm.querySelector('[name=organization]').value = 'تیم خریدار';
  reqForm.querySelector('[name=purpose]').value = 'پیاده‌سازی تماس‌های فارسی';
  reqForm.querySelector('[name=terms]').checked = true;
  reqForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.equal(location.hash, '#requests');
  const requests = JSON.parse(storage.get('torobai.requests'));
  assert.equal(requests[0].status, 'saved_locally');
  assert.equal(requests[0].terms.includes_training_data, false);
  await flush();
  await route(location.hash);
  assert.ok(document.querySelector('.draft-badge').textContent.includes('ارسال نشده'));
  document.querySelector('[data-request-text]').click();
  const readable = run("requestText(localRecords('torobai.requests')[0])");
  assert.ok(
    readable.includes('تیم خریدار') &&
      readable.includes('Safetensors') &&
      readable.includes('ارسال نشده')
  );
  assert.ok(!readable.includes('undefined') && !readable.includes('<span'));
  document.querySelector('[data-export-request]').click();
  document.querySelector('[data-delete-request]').click();
  assert.deepEqual(JSON.parse(storage.get('torobai.requests')), []);
  // The authoring flow validates each stage, previews escaped content and edits drafts.
  await route('#publish');
  let lf = document.getElementById('listingForm');
  lf.querySelector('[name=title]').value = 'فرم نیمه‌کاره';
  lf.querySelector('[name=title]').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(JSON.parse(storage.get('torobai.listing.work'))[0].title, 'فرم نیمه‌کاره');
  await route('#fa');
  await route('#publish');
  assert.equal(document.querySelector('#listingForm [name=title]').value, 'فرم نیمه‌کاره');
  document.querySelector('[data-new-listing]').click();
  lf = document.getElementById('listingForm');
  assert.equal(lf.querySelector('[name=title]').value, '');
  const submit = () =>
    lf.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  submit();
  assert.equal(document.getElementById('listingError').hidden, false);
  const listing = {
    title: 'مدل فارسی <img src=x>',
    publisher: 'گروه آزمون',
    version: '1.2',
    base_model: 'Whisper',
    base_license: 'MIT',
    language_detail: 'فارسی',
    description: 'تبدیل گفتار',
    training_data: 'صوت مجاز',
    limitations: 'نیازمند صوت واضح',
    api_rate: '۱۲۵۰',
    weights_price: '۱۸۰۰۰۰۰۰',
    privacy: 'حذف بعد از پردازش',
    format: 'Safetensors',
    hardware: 'GPU 8 GB',
    support: '۳۰ روز'
  };
  for (const [key, value] of Object.entries(listing))
    lf.querySelector(`[name="${key}"]`).value = value;
  for (const key of ['api', 'weights', 'data_rights', 'modification'])
    lf.querySelector(`[name="${key}"]`).checked = true;
  submit();
  assert.equal(document.querySelector('[data-listing-step="2"]').hidden, false);
  assert.equal(lf.querySelector('[name=output_rate]').closest('label').hidden, true);
  submit();
  assert.equal(document.querySelector('[data-listing-step="3"]').hidden, false);
  assert.equal(document.getElementById('listingPreview').querySelector('img'), null);
  assert.ok(
    document.getElementById('listingPreview').textContent.includes('مدل فارسی <img src=x>')
  );
  document.querySelector('[data-export-current]').click();
  submit();
  let drafts = JSON.parse(storage.get('torobai.listings'));
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].status, 'draft');
  document.querySelector('[data-edit-draft]').click();
  lf = document.getElementById('listingForm');
  assert.equal(lf.querySelector('[name=title]').value, listing.title);
  document.querySelector('[data-delete-draft]').click();
  assert.deepEqual(JSON.parse(storage.get('torobai.listings')), []);
  // Quota failure must not claim persistence or route to a success screen.
  const writer = window.localStorage.setItem;
  window.localStorage.setItem = () => {
    throw Error('quota');
  };
  assert.equal(run("saveRecords('torobai.listings',[{id:'x'}])"), false);
  window.localStorage.setItem = writer;

  // Review regressions: explicit URL scope and visible reset even with one provider.
  await route('#api?provider=one');
  await route('#api/avanvis-fa');
  assert.equal(document.querySelectorAll('.offer-row').length, 2);
  await route('#api/gpt-4o-mini?provider=one');
  assert.equal(document.querySelectorAll('.offer-row').length, 0);
  assert.equal(document.querySelector('#featuredOffer h2').textContent.trim(), '1xAi');
  assert.ok(!document.querySelector('[data-action="all-providers"]').closest('[hidden]'));
  assert.ok(!document.querySelector('[data-action="all-providers"]').closest('#sellers'));
  document.querySelector('[data-action="all-providers"]').click();
  await flush();
  await route(location.hash);
  assert.equal(document.querySelectorAll('.offer-row').length, 2);
  await route('#gpu/rtx-3090?ssh=1');
  assert.ok(
    document.getElementById('sshOffers').checked ||
      document.getElementById('sshOffers').hasAttribute('checked')
  );
  assert.ok(!document.getElementById('sshOffers').closest('#sellers'));
  await run("changePreset('light')");
  const keptHours = run('activeEstimate.assumptions.hours');
  const sshControl = document.getElementById('sshOffers');
  sshControl.checked = false;
  sshControl.dispatchEvent(new window.Event('change', { bubbles: true }));
  await flush();
  assert.ok(!location.hash.includes('ssh=1'));
  assert.equal(run('activeEstimate.assumptions.hours'), keptHours);

  // A host filter cannot conceal the creator's file when switching acquisition.
  const hosted = products.find((p) => p.id === 'whisper-fa-cv17');
  await route('#api/whisper-fa-cv17?provider=' + hosted.offers[0].seller_id + '&from=fa');
  assert.equal(document.getElementById('faNav').getAttribute('aria-current'), 'page');
  const fileTab = document.querySelector('.purchase-tabs a[href*="access=weights"]');
  assert.ok(!fileTab.getAttribute('href').includes('provider='));
  await route(fileTab.getAttribute('href'));
  assert.ok(
    document
      .querySelector('.featured-buy')
      .getAttribute('href')
      .startsWith('https://huggingface.co/')
  );

  // Saved APIs and GPUs get an explicit comparable category, with a way to reset it.
  run("saved = ['rtx-3090','gpt-4o-mini']; persist()");
  await route('#saved');
  document.querySelector('[data-sort=price]').click();
  const savedGpuChoice = document.querySelector('.task-picker a[href*="task=gpu"]');
  assert.ok(savedGpuChoice);
  await route(savedGpuChoice.getAttribute('href'));
  assert.equal(document.querySelectorAll('.product-card').length, 1);
  assert.ok(document.querySelector('[data-remove-filter=task]'));
  document.querySelector('[data-remove-filter=task]').click();
  await flush();
  await route(location.hash);
  assert.equal(document.querySelectorAll('.product-card').length, 2);
  await route('#saved?q=no-such-model');
  assert.ok(!document.querySelector('.empty-state').textContent.includes('هنوز'));
  assert.ok(document.querySelector('.empty-state a[href="#saved"]'));

  // Paid local weights and public checkpoints retain distinct access in comparison.
  run("comparison = ['avanvis-fa','whisper-fa-cv17']; persist()");
  await route('#compare');
  const compareRow = [...document.querySelectorAll('tbody tr')].find(
    (r) => r.querySelector('th').textContent === 'قابل دانلود و اجرای شخصی'
  );
  assert.equal(compareRow.querySelector('td').textContent, 'با خرید مجوز');
  assert.ok(compareRow.textContent.includes('دریافت طبق مجوز'));
  assert.ok(document.querySelector('tbody').textContent.includes('هزینه با مصرف یکسان'));

  // Offline sharing never includes a local file address.
  await route('#api/avanvis-fa');
  const shared = run('shareText()');
  assert.ok(shared.includes('آوانویس') && shared.includes('تومان'));
  assert.ok(!shared.includes('file:') && !shared.includes('C:/'));
  await route('#api/%E0%A4%A');
  assert.ok(document.getElementById('main').textContent.includes('صفحه پیدا نشد'));
  await route('#gpu/gpt-4o-mini');
  assert.ok(document.getElementById('main').textContent.includes('محصول پیدا نشد'));

  // An uncached failed quote replaces all loading surfaces and permits retry.
  run(
    'globalThis.savedEstimate = estimate; estimate = async () => { throw new Error("خطای دریافت قیمت") }'
  );
  await route('#api/avanvis-fa?usage_unit=minute&minutes=4321');
  assert.equal(document.querySelector('.offer-skeleton'), null);
  assert.equal(document.querySelector('#offerList .loading-state'), null);
  assert.equal(document.querySelector('#main .loading-state'), null);
  assert.ok(document.querySelector('[data-action=retry-estimate]'));
  run('estimate = globalThis.savedEstimate');
  document.querySelector('[data-action=retry-estimate]').click();
  await flush();
  assert.ok(document.querySelector('#summaryRate .price-number'));

  // Weight access is usable independently of the API estimation path.
  run('estimate = async () => { throw new Error("API unavailable") }');
  await route('#api/avanvis-fa?access=weights');
  assert.equal(
    document.getElementById('featuredOffer').dataset.weightOfferId,
    'weights-avanvis-fa'
  );
  run('estimate = globalThis.savedEstimate');

  // Storage failures must not claim durable favorites or require a complete draft to export.
  await route('#fa');
  run('globalThis.savedStorage = storage; storage = null');
  document.querySelector('[data-save="avanvis-fa"]').click();
  assert.ok(document.getElementById('toast').textContent.includes('در دسترس نیست'));
  run('storage = globalThis.savedStorage');
  await route('#publish');
  document.querySelector('[data-new-listing]').click();
  document.querySelector('#listingForm [name=title]').value = 'فرم ناقص برای بازیابی';
  run(
    'globalThis.realDownload = downloadRecord; globalThis.downloads = []; downloadRecord = (...args) => globalThis.downloads.push(args)'
  );
  assert.equal(document.querySelector('[data-export-current]').hidden, false);
  document.querySelector('[data-export-current]').click();
  assert.equal(run('globalThis.downloads.at(-1)[1].title'), 'فرم ناقص برای بازیابی');
  assert.equal(run('globalThis.downloads.at(-1)[1].complete'), false);

  // API requests retain quoted usage and can be edited without repricing or duplicating.
  await route('#api/tarjoman-fa-en');
  document.querySelector('#featuredOffer [data-inquire]').click();
  let editForm = document.getElementById('requestForm');
  editForm.querySelector('[name=organization]').value = 'تیم پژوهش';
  editForm.querySelector('[name=purpose]').value = 'ترجمه متن فارسی';
  editForm.querySelector('[name=terms]').checked = true;
  editForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  const originalRequest = JSON.parse(storage.get('torobai.requests'))[0];
  assert.equal(originalRequest.unit, 'characters');
  assert.equal(originalRequest.estimate_toman, 21000);
  assert.equal(originalRequest.scenario.characters, 100000);
  await route('#requests');
  document.querySelector('[data-edit-request]').click();
  editForm = document.getElementById('requestForm');
  assert.equal(editForm.querySelector('[name=organization]').value, 'تیم پژوهش');
  editForm.querySelector('[name=purpose]').value = 'ترجمه مکاتبات جدید';
  editForm.querySelector('[name=terms]').checked = true;
  editForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  const editedRequest = JSON.parse(storage.get('torobai.requests'));
  assert.equal(editedRequest.length, 1);
  assert.equal(editedRequest[0].id, originalRequest.id);
  assert.deepEqual(editedRequest[0].terms, originalRequest.terms);
  assert.equal(editedRequest[0].purpose, 'ترجمه مکاتبات جدید');
  assert.ok(document.querySelector('.request-list').textContent.includes('۲۱,۰۰۰'));

  // Export remains available when saving a request fails; it must say it was not stored.
  document.querySelector('[data-edit-request]').click();
  editForm = document.getElementById('requestForm');
  editForm.querySelector('[name=terms]').checked = true;
  run('storage = null');
  editForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(document.getElementById('infoDialog').open, true);
  document.querySelector('[data-download-request]').click();
  assert.ok(run('globalThis.downloads.at(-1)[1]').includes('فایل درخواست؛ ارسال نشده'));
  assert.ok(!run('globalThis.downloads.at(-1)[1]').includes('ذخیره در مرورگر؛ ارسال نشده'));
  run('storage = globalThis.savedStorage; downloadRecord = globalThis.realDownload');
  document.getElementById('closeDialog').click();
  await route('#requests');
  document.querySelector('[data-delete-request]').click();
  storage.set('torobai.requests', JSON.stringify([{ id: 'broken', access: 'api' }]));
  await route('#requests');
  assert.equal(document.querySelectorAll('[data-request-text]').length, 0);
  storage.delete('torobai.requests');

  // A delayed product calculation must not overwrite the next page.
  run('globalThis.savedEstimate=estimate;estimate=(p,key,values)=>values&&p.id==="qwen3.8-27b"?new Promise(resolve=>{globalThis.finishStale=()=>savedEstimate(p,key,values).then(resolve)}):savedEstimate(p,key,values)');
  location.hash = '#api/qwen3.8-27b?usage_unit=tokens&requests_day=31&input_tokens=319&output_tokens=17';
  const staleRoute = run('route()');
  assert.ok(document.querySelector('.offer-skeleton'));
  await route('#gpu');
  run('finishStale()');
  await staleRoute;
  run('estimate=savedEstimate');
  assert.equal(document.getElementById('productTitle'), null);
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length, 9);
  assert.ok(!timers.includes(900) && !timers.includes(600), 'Ready catalog and product data must not wait on presentation timers');
  // v0.12: page boundaries, URL state and the full consumption-to-request path.
  const allPageIDs = [];
  for (let page=1;page<=3;page++) {
    await route('#api?page='+page);
    const cards=[...document.querySelectorAll('.product-grid>.product-card')];
    assert.equal(cards.length,page===3?13:20);
    allPageIDs.push(...cards.map(c=>c.dataset.productId));
    assert.equal(document.querySelector('.page-numbers [aria-current=page]').dataset.page,String(page));
    assert.equal(document.querySelectorAll('.seller-stack .brand-type').length,0);
  }
  assert.equal(new Set(allPageIDs).size,53);
  await route('#api?page=999');
  assert.equal(run('state.page'),1);
  await route('#api?size=60');
  assert.equal(document.querySelectorAll('.product-grid>.product-card').length,53);
  assert.ok(document.getElementById('pageSize'),'Can reduce page size even when everything fits');
  await route('#api?page=2&size=20');
  run("navigateFilters({query:'qwen'})");
  await flush();
  assert.ok(!location.hash.includes('page=2'));
  await flush();
  await route(location.hash);
  assert.equal(run('state.query'),'qwen');
  assert.ok(document.querySelectorAll('.product-grid>.product-card').length > 0);
  assert.ok([...document.querySelectorAll('.product-grid>.product-card')].every(el=> { const p=products.find(p=>p.id===el.dataset.productId); return /qwen/i.test([p.title,p.maker,p.model_id,p.search_terms,p.capability?.base_model].join(' ')); }));
  await route('#api?task=chat&sort=price-desc');
  const fullSorted = run("filterProducts(products,state).sort((a,b)=>HB.comparePrices(catalogQuote(a).best?.estimate_toman,catalogQuote(b).best?.estimate_toman,true)).map(p=>p.id)");
  assert.deepEqual([...document.querySelectorAll('.product-grid>.product-card')].map(c=>c.dataset.productId),Array.from(fullSorted).slice(0,20));
  await route('#api?task=chat&sort=price');
  let usageForm = document.getElementById('catalogUsageForm');
  for (const [key,value] of Object.entries({requests_day:'۷',input_tokens:'۲۰۰۰',output_tokens:'۵۰۰'})) {
    const input=usageForm.querySelector(`[name=${key}]`);input.value=value;
    input.dispatchEvent(new window.Event('input',{bubbles:true}));
  }
  assert.equal(document.getElementById('catalogUsagePending').hidden,false);
  usageForm.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  await flush();
  assert.ok(location.hash.includes('input_tokens=2000'));
  await flush();
  await route(location.hash);
  assert.equal(run('state.usage.requests_day'),7);
  const customCard=document.querySelector('.product-grid>.product-card');
  const customID=customCard.dataset.productId;
  const customPrice=customCard.querySelector('.card-price>strong').textContent;
  await route(customCard.querySelector('h2 a').getAttribute('href'));
  assert.equal(document.getElementById('summaryRate').textContent,customPrice);
  assert.equal(document.querySelector('#budgetForm [name=input_tokens]').value,'۲,۰۰۰');
  assert.ok(document.getElementById('usageSummary').textContent.includes('۷ درخواست'));
  await route('#api/qwen3.8-27b?usage_unit=tokens&requests_day=7&input_tokens=2000&output_tokens=500');
  const regularAmount=run('activeEstimate.offers.find(o=>o.estimate_toman!=null).estimate_toman');
  let budget=document.getElementById('budgetForm');
  budget.querySelector('[name=request_mode] option[value=batch]').selected=true;
  budget.querySelector('[name=request_mode]').dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(document.getElementById('summaryRate'),null);
  budget.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  await flush();
  assert.equal(run('state.requestMode'),'batch');
  assert.ok(location.hash.includes('mode=batch'));
  assert.ok(run('activeEstimate.offers.filter(o=>o.estimate_toman!=null).every(o=>o.batch.supported)'));
  assert.ok(run('activeEstimate.offers.find(o=>o.estimate_toman!=null).estimate_toman')<regularAmount);
  assert.ok(document.querySelector('#featuredOffer .batch-terms').textContent.includes('ساعت'));
  await route('#api?mode=batch&task=chat');
  assert.ok(document.querySelectorAll('.product-grid>.product-card').length>0);
  assert.ok(run("filterProducts(products,state).every(p=>p.offers.every(o=>o.batch.supported))"));
  assert.equal(document.querySelectorAll('.seller-stack .brand-type').length,0);
  await route('#api/gpt-4o-mini?mode=batch');
  assert.equal(document.getElementById('summaryRate'),null,'No ordinary-price fallback for unknown Batch');
  await route('#api/avanvis-fa?mode=batch');
  const batchID=document.getElementById('featuredOffer').dataset.offerId;
  run(`inquiry('avanvis-fa','api',${JSON.stringify(batchID)})`);
  assert.equal(run('requestDraft.terms.request_mode'),'batch');
  assert.ok(run("requestText({...requestDraft,organization:'test',purpose:'test'}).includes('پردازش: Batch')"));
  assert.ok(document.querySelector('#requestForm .batch-terms'));
  await route('#fa?access=weights&mode=batch');
  assert.equal(document.getElementById('catalogUsageForm'),null);
  assert.ok(document.querySelectorAll('.product-grid>.product-card').length>0);
  await route('#publish');
  document.querySelector('[data-new-listing]').click();
  assert.ok(document.querySelector('[name=api]').hasAttribute('checked'));
  // Linkedom does not reflect default checked attributes into checkbox properties.
  document.querySelector('[name=api]').checked=true;
  const batchCheckbox=document.querySelector('[name=batch]');batchCheckbox.checked=true;
  batchCheckbox.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(document.querySelector('.listing-batch-fields').hidden,false);

  console.log(
    JSON.stringify(
      {
        status: 'passed',
        product_routes: products.length,
        scenarios: 82,
        scope: 'DOM execution and events; no browser layout or pixel checks'
      },
      null,
      2
    )
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
