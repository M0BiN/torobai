// Actual exported UI, local storage and events. These are DOM tests, not browser QA.
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { window, document } = parseHTML(
  fs.readFileSync(require('node:path').resolve(__dirname, '../dist/torobai.html'), 'utf8')
);
let hash = '#api',
  failStorage = false,
  nativeHashWrites = 0;
const entries = new Map(),
  downloads = [];
const location = {
  get hash() {
    return hash;
  },
  set hash(v) {
    nativeHashWrites++;
    hash = v;
  },
  href: 'file:///torobai.html'
};
window.history = {
  pushState: (_s, _t, url) => {
    hash = url;
  },
  replaceState: (_s, _t, url) => {
    hash = url;
  }
};
window.localStorage = {
  getItem: (key) => entries.get(key) || null,
  setItem: (key, value) => {
    if (failStorage) throw Error('Blocked');
    entries.set(key, value);
  }
};
window.scrollX = 0;
window.scrollY = 0;
window.innerHeight = 700;
window.scrollTo = ({ top = 0 }) => {
  window.scrollY = top;
};
window.HTMLElement.prototype.focus = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.getBoundingClientRect = () => ({ top: 0, height: 100 });
window.getComputedStyle = () => ({ position: 'static' });
const dialog = document.getElementById('infoDialog');
dialog.showModal = () => {
  dialog.open = true;
};
dialog.close = () => {
  dialog.open = false;
};
const context = vm.createContext({
  window,
  document,
  location,
  URL,
  URLSearchParams,
  console,
  navigator: {},
  Blob,
  matchMedia: () => ({ matches: true }),
  fetch: () => {
    throw Error('Portable UI must not fetch');
  },
  setTimeout: (fn, ms) => {
    if (ms <= 1000) setImmediate(fn);
    return 1;
  },
  clearTimeout: () => {}
});
const run = (code) => vm.runInContext(code, context),
  $ = (id) => document.getElementById(id);
const flush = async () => {
  for (let i = 0; i < 6; i++) await new Promise(setImmediate);
};
const click = (node) => {
  assert.ok(node);
  const e = new window.Event('click', { bubbles: true, cancelable: true });
  e.button = 0;
  node.dispatchEvent(e);
  return e;
};
const submit = (node) => {
  const e = new window.Event('submit', { bubbles: true, cancelable: true });
  node.dispatchEvent(e);
  assert.equal(e.defaultPrevented, true);
};
const go = async (url) => {
  await run(`route({url:${JSON.stringify(url)},writeHistory:true})`);
  await flush();
};
const text = () => document.getElementById('main').textContent;
const change = (node) => node.dispatchEvent(new window.Event('change', { bubbles: true }));
const choose = (form, name, value) => {
  const el = form.querySelector(`[name=${name}]`);
  for (const o of el.querySelectorAll('option')) {
    if (o.value === value) o.setAttribute('selected', '');
    else o.removeAttribute('selected');
  }
  assert.equal(el.value, value);
};
const hydrate = (form) => {
  form
    .querySelectorAll('input[type=checkbox]')
    .forEach((x) => (x.checked = x.hasAttribute('checked')));
  form.querySelectorAll('select').forEach((x) => {
    if (x.value == null) x.querySelector('option')?.setAttribute('selected', '');
  });
};
const input = (form, name, value) => (form.querySelector(`[name=${name}]`).value = String(value));
const prepareImport = async (rows) => {
  await go('#manage');
  const file = $('tariffFile');
  file.files = [{ name: 'rates.json', size: 100, text: async () => JSON.stringify(rows) }];
  change(file);
  await flush();
  assert.ok(document.querySelector('[data-apply-import]'), $('importError').textContent);
};
const commitImport = async (rows) => {
  await prepareImport(rows);
  click(document.querySelector('[data-apply-import]'));
  await flush();
};
(async () => {
  for (const script of document.querySelectorAll('script')) run(script.textContent);
  await flush();
  context.captureDownload = (...args) => downloads.push(args);
  run('downloadRecord=(...args)=>captureDownload(...args)');
  assert.ok(run('marketBase.marketplace.gpu_plans'));
  assert.equal(run('products.length'), 62);
  // Capability requirements belong to one offer, not a union across suppliers.
  assert.equal(
    run('HB.offerMatches({capabilities:{json:true,streaming:false}},{json:true,streaming:true})'),
    false
  );
  assert.equal(run('HB.offerMatches({capabilities:{}},{json:true})'), false);
  await go('#api/gpt-4o-mini?json=1&streaming=1');
  const filterBadge = document.querySelector('.filter-count');
  assert.equal(filterBadge.textContent, '۲');
  assert.equal(filterBadge.getAttribute('aria-label'), '۲ فیلتر فعال');
  await go('#api?json=1&streaming=1');
  assert.ok(
    run(
      'HB.filterProducts(products,state,catalog).every(p=>p.offers.some(o=>HB.offerMatches(o,state)))'
    )
  );
  assert.ok(run('searchSuggestions("نارون").some(s=>s.type==="عرضه‌کننده")'));
  assert.ok(run('searchSuggestions("ترجمه").some(s=>s.type==="کاربرد")'));
  $('searchInput').value = 'نارون';
  run('renderSearchSuggestions()');
  assert.equal($('unifiedSuggestions').hidden, false);
  const key = new window.Event('keydown', { bubbles: true, cancelable: true });
  key.key = 'ArrowDown';
  $('searchInput').dispatchEvent(key);
  assert.equal($('searchInput').getAttribute('aria-activedescendant'), 'suggest-0');
  // Same model comparison, strict maximum of three suppliers, difference toggle.
  await go('#api/avanvis-fa');
  let choices = [...document.querySelectorAll('[data-compare-offer]')];
  assert.ok(choices.length >= 2);
  for (const c of choices.slice(0, 2)) {
    c.checked = true;
    change(c);
  }
  click(document.querySelector('[data-show-seller-comparison]'));
  assert.equal(document.querySelectorAll('.offer-comparison thead th').length, 3);
  $('onlyOfferDifferences').checked = false;
  change($('onlyOfferDifferences'));
  assert.ok(dialog.textContent.includes('زمان شروع پاسخ'));
  assert.equal(run('billTotal(100000,10)'), 110000);
  assert.ok(document.querySelector('.bill-details').textContent.includes('اعتبار لازم'));
  dialog.close();
  // Submit API and weights on a single existing model; approve before catalog use.
  await go('#studio?model=avanvis-fa');
  let f = $('proposalForm');
  hydrate(f);
  input(f, 'seller', 'آزمون عرضه');
  input(f, 'rate', 2);
  input(f, 'credit', 1000);
  input(f, 'tax', 10);
  input(f, 'terms', 'شرایط پشتیبانی و حفظ محرمانگی داده در قرارداد مشخص است.');
  f.querySelector('[name=json]').checked = true;
  f.querySelector('[name=batch]').checked = true;
  input(f, 'batch_rate', 1);
  input(f, 'batch_hours', 24);
  input(f, 'batch_max', 500);
  const count = run('products.find(p=>p.id==="avanvis-fa").offers.length');
  click(document.querySelector('[data-proposal-submit]'));
  await flush();
  assert.equal(
    run('marketState.proposals[0].status'),
    'submitted',
    $('proposalError')?.textContent
  );
  const proposalId = run('marketState.proposals[0].id');
  assert.equal(run('products.find(p=>p.id==="avanvis-fa").offers.length'), count);
  await go('#manage');
  click(document.querySelector(`[data-review-proposal="${proposalId}"][data-review=approved]`));
  submit($('proposalReview'));
  await flush();
  assert.equal(run('marketState.proposals[0].status'), 'approved');
  await go('#api/avanvis-fa?provider=local-' + proposalId);
  assert.equal(
    run('activeEstimate.offers.find(o=>o.id==="local-' + proposalId + '").estimate_toman'),
    1200
  );
  assert.ok(text().includes('ثبت نشده'));
  assert.equal(run('catalogQuote(selected,state).best.minimum_payment_toman'), 1100);
  await go('#api/avanvis-fa?provider=local-' + proposalId + '&mode=batch');
  assert.equal(run('catalogQuote(selected,state).best.estimate_toman'), 600);
  await go('#studio');
  click(document.querySelector(`[data-edit-proposal="${proposalId}"]`));
  f = $('proposalForm');
  hydrate(f);
  input(f, 'rate', 8);
  click(document.querySelector('[data-proposal-submit]'));
  assert.equal(run('marketState.proposals[0].published.rate'), 2);
  assert.equal(
    run(
      'products.find(p=>p.id==="avanvis-fa").offers.find(o=>o.id==="local-' +
        proposalId +
        '").toman_unit'
    ),
    2
  );
  click(document.querySelector('[data-new-proposal]'));
  f = $('proposalForm');
  hydrate(f);
  choose(f, 'product_id', 'avanvis-fa');
  choose(f, 'access', 'weights');
  change(f.querySelector('[name=access]'));
  input(f, 'seller', 'آزمون عرضه');
  input(f, 'rate', 10000);
  input(f, 'terms', 'دریافت فایل و پشتیبانی طبق قرارداد عرضه.');
  input(f, 'format', 'Safetensors');
  input(f, 'hardware', '24 GB');
  click(document.querySelector('[data-proposal-submit]'));
  await flush();
  const weightId = run('marketState.proposals[0].id');
  assert.notEqual(weightId, proposalId);
  await go('#manage');
  click(document.querySelector(`[data-review-proposal="${weightId}"][data-review=approved]`));
  submit($('proposalReview'));
  assert.ok(
    run(
      'products.find(p=>p.id==="avanvis-fa").weight_offers.some(o=>o.id==="local-' + weightId + '")'
    )
  );
  // Scope watch to the API just approved, then import a new tariff and inspect history.
  await go('#api/avanvis-fa?provider=local-' + proposalId);
  click(document.querySelector('[data-watch]'));
  click(document.querySelector('[data-save-watch]'));
  assert.equal(run('marketState.history.length'), 1);
  const watched = run('watchRecords()[0].id');
  const date = new Date().toISOString().slice(0, 10),
    offer = 'local-' + proposalId;
  await prepareImport([
    { id: offer, observed_at: date, availability: 'available', toman_unit: 1.5 }
  ]);
  assert.ok($('importPreview').textContent.includes('واحد مصرف'));
  failStorage = true;
  click(document.querySelector('[data-apply-import]'));
  assert.equal(run('marketState.updates.length'), 0);
  failStorage = false;
  click(document.querySelector('[data-apply-import]'));
  assert.equal(run('marketState.history.length'), 2);
  assert.equal(run('marketState.notifications.length'), 1);
  assert.equal(run('marketState.notifications[0].amount'), 900);
  await go('#watchlist');
  click(document.querySelector('[data-watch-history]'));
  assert.ok(dialog.querySelector('.price-history-chart'));
  click(dialog.querySelector('[data-export-history]'));
  assert.equal(downloads.at(-1)[1].length, 2);
  dialog.close();
  click(document.querySelector('[data-watch-policy]'));
  f = $('watchPolicyForm');
  hydrate(f);
  choose(f, 'channel', 'browser');
  submit(f);
  await flush();
  assert.equal($('watchPolicyError').hidden, false);
  choose(f, 'channel', 'site');
  input(f, 'target', 800);
  submit(f);
  await flush();
  await commitImport([{ id: offer, observed_at: date, availability: 'unavailable' }]);
  assert.equal(
    run(
      'catalog.estimates["avanvis-fa"].standard.offers.find(o=>o.id==="' +
        offer +
        '").estimate_toman'
    ),
    null
  );
  await commitImport([{ id: offer, observed_at: date, availability: 'available', toman_unit: 1 }]);
  assert.ok(run('marketState.notifications.some(n=>n.title.includes("دوباره"))'));
  assert.ok(run('marketState.notifications.some(n=>n.title.includes("سقف"))'));
  await go('#notifications');
  click(document.querySelector('[data-read-all-notices]'));
  assert.equal($('noticeCount').textContent, '۰');
  // All-or-none imports reject unknown IDs, duplicated IDs, wrong units and malformed CSV.
  for (const rows of [
    [{ id: 'missing', observed_at: date, availability: 'available' }],
    [{ id: offer, observed_at: date, availability: 'available', toman_input_m: 1 }],
    [{ id: offer, observed_at: date, availability: 'available', toman_unit: -1 }]
  ])
    assert.throws(() => run('parseImport(' + JSON.stringify(JSON.stringify(rows)) + ',"json")'));
  assert.throws(() => run('parseImport("id,id\\nx,x","csv")'));
  assert.throws(() => run('parseImport("id,observed_at,availability\\n\\\"open","csv")'));
  assert.equal(
    run(
      'parseImport(' +
        JSON.stringify(
          'id,observed_at,availability,toman_unit\n"' + offer + '",' + date + ',available,2.75'
        ) +
        ',"csv")[0].toman_unit'
    ),
    2.75
  );
  const token = run(
    'products.find(p=>p.unit==="tokens"&&p.offers.some(o=>o.toman_input_m!=null&&o.toman_output_m!=null)).offers.find(o=>o.toman_input_m!=null&&o.toman_output_m!=null).id'
  );
  await commitImport([
    { id: token, observed_at: date, availability: 'available', toman_input_m: 123 }
  ]);
  await commitImport([
    { id: token, observed_at: date, availability: 'available', toman_output_m: 456 }
  ]);
  assert.equal(run('marketState.updates.find(o=>o.id==="' + token + '").toman_input_m'), 123);
  // GPU imports use Python-compiled quantities, maintaining minimum and billing step.
  const gpu = run('Object.keys(catalog.marketplace.gpu_plans)[0]'),
    gpuBefore = run('products.find(p=>p.kind==="gpu"&&p.offers.some(o=>o.id==="' + gpu + '")).id');
  const rateKey = run('catalog.marketplace.gpu_plans["' + gpu + '"].standard.terms[0].rate_key');
  await commitImport([{ id: gpu, observed_at: date, availability: 'available', [rateKey]: 1234 }]);
  assert.equal(
    run(
      'catalog.estimates["' +
        gpuBefore +
        '"].standard.offers.find(o=>o.id==="' +
        gpu +
        '").estimate_toman'
    ),
    run('1234*catalog.marketplace.gpu_plans["' + gpu + '"].standard.quantity')
  );
  await go('#gpu-match');
  f = $('gpuMatchForm');
  hydrate(f);
  input(f, 'parameters', 7);
  choose(f, 'rental', 'heavy');
  input(f, 'disk_rate', 100);
  input(f, 'traffic_rate', 50);
  submit(f);
  assert.ok($('gpuMatchResults').textContent.includes('حافظه برآوردی'));
  assert.ok(document.querySelector('.gpu-match-row a').getAttribute('href').includes('rental='));
  input(f, 'parameters', 2000);
  submit(f);
  assert.ok($('gpuMatchResults').textContent.includes('پیشنهاد متناسب پیدا نشد'));
  // Shared input samples remain escaped, task-matched and explicit about provenance.
  await go('#samples');
  assert.ok(text().includes('اجرای مدل و ارزیابی مستقل انجام نشده'));
  click(document.querySelector('[data-new-sample]'));
  f = $('sampleForm');
  hydrate(f);
  choose(f, 'task', 'translation');
  change(f.querySelector('[name=task]'));
  assert.ok(
    [...f.querySelector('[name=model0]').options].every(
      (o) => run('products.find(p=>p.id==="' + o.value + '").task') === 'translation'
    )
  );
  input(f, 'title', '<img onerror=x> نمونه');
  input(f, 'input', 'Thank you');
  input(f, 'reference', 'متشکرم');
  input(f, 'output0', 'متشکرم');
  input(f, 'output1', 'سپاسگزارم');
  input(f, 'version', 'نسخه ثبت‌شده');
  input(f, 'conditions', 'اجرای کاربر روی ورودی یکسان');
  submit(f);
  await flush();
  assert.equal(run('marketState.samples.length'), 1);
  assert.equal(document.querySelector('#main img[onerror]'), null);
  assert.ok(text().includes('ویرایش روی'));
  $('sampleDifferences').checked = true;
  change($('sampleDifferences'));
  assert.ok(document.querySelector('mark'));
  click(document.querySelector('[data-export-sample]'));
  assert.equal(downloads.at(-1)[1].input, 'Thank you');
  // Model request validation and approval creates one canonical model with both access types.
  const model = {
    id: 'listing-qa',
    title: 'مدل آزمایش',
    publisher: 'سازنده مستقل',
    publisher_type: 'person',
    task: 'translation',
    unit: 'characters',
    version: '1',
    base_model: 'base',
    base_license: 'Apache-2.0',
    language_detail: 'انگلیسی به فارسی',
    description: 'ترجمه متن فارسی',
    training_data: 'داده دارای مجوز',
    limitations: 'متون عمومی',
    data_rights: true,
    api: true,
    weights: true,
    api_rate: '100',
    weights_price: '500000',
    privacy: 'شرایط نگهداری داده',
    format: 'Safetensors',
    hardware: '24 GB',
    support: 'پشتیبانی طبق قرارداد',
    license: 'commercial',
    updated_at: new Date().toISOString()
  };
  entries.set('torobai.listings', JSON.stringify([model]));
  await go('#manage');
  click(document.querySelector('[data-submit-model="listing-qa"]'));
  assert.equal(run('marketState.models[0].status'), 'submitted');
  click(document.querySelector('[data-approve-model="listing-qa"]'));
  assert.equal(run('products.length'), 63);
  await go('#api/community-listing-qa');
  assert.equal(run('selected.offers.length'), 1);
  assert.equal(run('selected.weight_offers.length'), 1);
  assert.ok(text().includes('مدل آزمایش'));
  await go('#api/community-listing-qa?access=weights');
  assert.ok(text().includes('Safetensors'));
  // Report decisions return to the buyer's report with the entered response.
  await go('#api/avanvis-fa');
  click(document.querySelector('#featuredOffer [data-report-offer]'));
  input($('reportForm'), 'detail', 'مبلغ با شرایط اعلام‌شده مطابقت ندارد.');
  submit($('reportForm'));
  await go('#manage');
  f = document.querySelector('.report-review');
  hydrate(f);
  choose(f, 'status', 'needs_info');
  input(f, 'note', 'لینک تعرفه و تاریخ مشاهده را ثبت کنید.');
  submit(f);
  await go('#reports');
  assert.ok(text().includes('لینک تعرفه و تاریخ مشاهده را ثبت کنید.'));
  // Exact duplicate merge redirects old routes; undo restores the original models.
  run(
    'globalThis.duplicate=cloneMarket(marketBase.products.find(p=>p.id==="avanvis-fa"));duplicate.id="duplicate-qa";duplicate.offers=[];duplicate.weight_offers=[];marketBase.products.push(duplicate);marketBase.estimates[duplicate.id]=cloneMarket(marketBase.estimates["avanvis-fa"]);Object.values(marketBase.estimates[duplicate.id]).forEach(e=>e.offers=[]);applyMarket()'
  );
  await go('#manage');
  click(document.querySelector('[data-merge-from="duplicate-qa"]'));
  assert.equal(run('products.some(p=>p.id==="duplicate-qa")'), false);
  await go('#api/duplicate-qa');
  assert.equal(run('selected.id'), 'avanvis-fa');
  await go('#manage');
  click(document.querySelector('[data-reset-merges]'));
  assert.equal(run('products.some(p=>p.id==="duplicate-qa")'), true);
  run(
    'marketBase.products=marketBase.products.filter(p=>p.id!=="duplicate-qa");delete marketBase.estimates["duplicate-qa"];applyMarket()'
  );
  // Rebuilding from saved workspace preserves tariff changes and registrations.
  run('marketState=readMarket();applyMarket()');
  assert.equal(run('products.length'), 63);
  assert.equal(
    run('products.find(p=>p.id==="avanvis-fa").offers.find(o=>o.id==="' + offer + '").toman_unit'),
    1
  );
  assert.equal(nativeHashWrites, 0);
  console.log(
    'v018 buyer/supplier/admin DOM flows passed: capability scope, search, comparison, bills, approval/editing, API+weights, tariff imports/API+GPU, storage failures, history/alerts, GPU matching, samples and new model approval.'
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
