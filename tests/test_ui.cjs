const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ui = require('../app/static/ui.js');
const root = path.join(__dirname, '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'app/data/products.json')));
const offers = JSON.parse(fs.readFileSync(path.join(root, 'app/data/offers.json')));
products.forEach((p) => (p.offers = offers.filter((o) => o.product_id === p.id)));

test('Persian numerals accept both keyboards and reject malformed amounts', () => {
  assert.equal(ui.parseNumber('۱,۲۵۰', 2000), 1250);
  assert.equal(ui.parseNumber('١٢٫٥', 20, false), 12.5);
  assert.equal(ui.parseNumber('۱۲٫۵', 20, true), null);
  assert.equal(ui.parseNumber('-10', 100), null);
  assert.equal(ui.parseNumber('1e6', 10000000), null);
  assert.equal(ui.parseNumber('Infinity', 10000000), null);
  assert.equal(ui.parseNumber('0', 744, false, 0.01), null);
  assert.equal(ui.number(12345.6, 1), '۱۲,۳۴۵.۶');
});

test('search understands Persian digits and retains downloadable decision models', () => {
  assert.deepEqual(
    ui.filterProducts(products, { kind: 'gpu', query: 'RTX ۳۰۹۰' }).map((p) => p.id),
    ['rtx-3090']
  );
  assert.equal(
    ui.filterProducts(products, { kind: 'api', task: 'decision', open: true }).length,
    4
  );
  assert.equal(
    ui.filterProducts(products, {
      kind: 'api',
      task: 'decision',
      multiple: true
    }).length,
    4
  );
});

test('a required SSH connection must actually appear in at least one offer', () => {
  const rows = ui.filterProducts(products, {
    kind: 'gpu',
    vram: 24,
    ssh: true
  });
  assert.ok(rows.length);
  assert.ok(rows.every((p) => p.vram >= 24 && p.offers.some((o) => o.ssh === true)));
  assert.ok(rows.every((p) => p.offers.every((o) => o.ssh === true)));
  for (const p of rows) {
    const quote = ui.rate(p);
    if (quote) assert.equal(quote.offer.ssh, true, 'The displayed rate must satisfy the filter');
  }
  assert.ok(
    products.find((p) => p.id === 'rtx-3090').offers.some((o) => o.ssh === false),
    'Filtering must not mutate catalog offers'
  );
});

test('rates preserve zero and cannot turn missing, unverified or unavailable into cheapest', () => {
  assert.equal(ui.rate({ kind: 'api', unit: 'tokens', offers: [{ toman_input_m: 0 }] }).value, 0);
  assert.equal(ui.rate({ kind: 'api', unit: 'tokens', offers: [] }), null);
  assert.equal(
    ui.rate({
      kind: 'api',
      unit: 'tokens',
      offers: [{ toman_input_m: 1, price_status: 'needs_recheck' }]
    }),
    null
  );
  assert.equal(
    ui.rate({
      kind: 'gpu',
      offers: [{ hourly_toman: 1, availability: 'unavailable' }, { daily_toman: 90 }]
    }).key,
    'daily_toman'
  );
});

test('saved lists tolerate corrupt storage and stale catalog IDs', () => {
  assert.deepEqual(ui.readIDs({ getItem: () => '{broken' }, 'x', ['a']), []);
  assert.deepEqual(
    ui.readIDs({ getItem: () => JSON.stringify(['a', 'a', 'missing', 'b']) }, 'x', ['a', 'b'], 1),
    ['a']
  );
  assert.deepEqual(ui.readIDs(null, 'x', ['a']), []);
});

test('provider filters constrain quoted card rates without changing the shared catalog', () => {
  const rows = ui.filterProducts(products, { kind: 'api', provider: 'one', priced: true });
  assert.ok(rows.length > 0);
  for (const p of rows) {
    assert.ok(p.offers.every((o) => o.seller_id === 'one'));
    assert.equal(ui.rate(p).offer.seller_id, 'one');
  }
  assert.ok(products.some((p) => p.offers.some((o) => o.seller_id !== 'one')));
  assert.deepEqual(ui.filterProducts(products, { kind: 'api', provider: 'missing' }), []);
});

test('both price directions retain zero and place unknown prices last', () => {
  const values = [null, 50, 0, undefined, 20];
  assert.deepEqual(
    [...values].sort((a, b) => ui.comparePrices(a, b)),
    [0, 20, 50, null, undefined]
  );
  assert.deepEqual(
    [...values].sort((a, b) => ui.comparePrices(a, b, true)),
    [50, 20, 0, null, undefined]
  );
});

test('untrusted text and non-HTTPS destinations cannot become executable markup', () => {
  assert.equal(ui.safeURL('javascript:alert(1)'), '#');
  assert.equal(ui.safeURL('data:text/html,<script>'), '#');
  assert.equal(ui.safeURL('https://example.com/path'), 'https://example.com/path');
  assert.equal(ui.escape('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});

test('Persian specialization and purchased weights are independent from public weights', () => {
  const weightOffers = JSON.parse(fs.readFileSync(path.join(root, 'app/data/weight_offers.json')));
  const pool = products.map((p) => ({
    ...p,
    weight_offers: weightOffers.filter((w) => w.product_id === p.id)
  }));
  assert.equal(ui.filterProducts(pool, { kind: 'api', persian: true }).length, 13);
  const rows = ui.filterProducts(pool, {
    kind: 'api',
    persian: true,
    access: 'weights',
    publisher: 'person'
  });
  assert.ok(rows.some((p) => p.id === 'tarjoman-fa-en' && !p.open_weights));
  assert.ok(
    ui.filterProducts(pool, { kind: 'api', access: 'api' }).some((p) => p.id === 'tarjoman-fa-en')
  );
  assert.ok(
    !ui.filterProducts(pool, { kind: 'api', open: true }).some((p) => p.id === 'tarjoman-fa-en')
  );
});

test('listing validation checks rights, access-specific fields and unsafe destinations', () => {
  const d = {
    title: 'آوا',
    publisher: 'سازنده',
    task: 'transcription',
    version: '1',
    base_model: 'Whisper',
    base_license: 'MIT',
    language_detail: 'فارسی',
    description: 'تبدیل صوت',
    training_data: 'منبع مجاز',
    limitations: 'صوت پرنویز',
    data_rights: true,
    api: true,
    weights: false,
    unit: 'minute',
    api_rate: '۱,۲۵۰',
    privacy: 'حذف پس از پردازش'
  };
  assert.equal(ui.validateListing(d), '');
  assert.ok(ui.validateListing({ ...d, data_rights: false }));
  assert.ok(ui.validateListing({ ...d, source_url: 'javascript:alert(1)' }));
  assert.ok(ui.validateListing({ ...d, api: false, weights: false }));
  assert.ok(ui.validateListing({ ...d, api_rate: '-1' }));
  assert.ok(
    ui.validateListing({ ...d, weights: true, weights_price: '۹۰۰۰', license: 'commercial' })
  );
  assert.equal(
    ui.validateListing({
      ...d,
      weights: true,
      weights_price: '۹۰۰۰',
      license: 'commercial',
      hardware: 'GPU',
      format: 'Safetensors',
      support: '۳۰ روز'
    }),
    ''
  );
  assert.ok(ui.validateListing({ ...d, task: 'chat', unit: 'tokens' }));
});

test('task aliases, base checkpoints and language details participate in search', () => {
  for (const [query, task] of [
    ['ASR', 'transcription'],
    ['TTS', 'speech'],
    ['OCR', 'ocr'],
    ['RAG', 'embedding']
  ]) {
    const rows = ui.filterProducts(products, { kind: 'api', persian: true, query });
    assert.ok(rows.length, query);
    assert.ok(
      rows.some((p) => p.task === task),
      query
    );
  }
  assert.ok(
    ui
      .filterProducts(products, { kind: 'api', persian: true, query: 'Whisper' })
      .some((p) => p.id === 'avanvis-fa')
  );
  assert.ok(
    ui
      .filterProducts(products, { kind: 'api', persian: true, query: 'انگلیسی' })
      .some((p) => p.task === 'translation')
  );
});

test('provider plus acquisition filters retain only matching weight or API offers', () => {
  const weights = JSON.parse(fs.readFileSync(path.join(root, 'app/data/weight_offers.json')));
  const rows = products.map((p) => ({
    ...p,
    weight_offers: weights.filter((w) => w.product_id === p.id)
  }));
  const f = { kind: 'api', provider: 'indie-sepehr' };
  const all = ui.filterProducts(rows, f);
  assert.ok(
    all.some((p) => p.id === 'tarjoman-fa-en'),
    'Dual-access publisher listing stays discoverable'
  );
  const api = ui.filterProducts(rows, { ...f, access: 'api' });
  assert.deepEqual(
    api.map((p) => p.id),
    ['tarjoman-fa-en', 'nazar-fa']
  );
  const local = ui.filterProducts(rows, { ...f, access: 'weights', priced: true });
  assert.ok(local.some((p) => p.id === 'tarjoman-fa-en'));
  assert.ok(local.every((p) => p.weight_offers.every((w) => w.seller_id === 'indie-sepehr')));
  assert.ok(
    !local.some((p) => p.weights_url),
    'A provider filter cannot attach an unrelated public download'
  );
  assert.deepEqual(ui.filterProducts(rows, { ...f, ssh: true }), []);
  assert.ok(
    rows.some((p) => p.weights_url),
    'Filtering preserves source data'
  );
});

test('hash routing rejects malformed paths and normalizes unsupported filters', () => {
  assert.equal(ui.routeState('#api/%E0%A4%A').path, 'not-found');
  assert.equal(ui.routeState('#unrelated').path, 'not-found');
  assert.equal(ui.routeState('#api/qwen3.8-27b').path, 'api/qwen3.8-27b');
  const state = ui.routeState('#api?task=bogus&access=other&vram=Infinity&context=-1&sort=bogus');
  assert.equal(state.task, '');
  assert.equal(state.access, '');
  assert.equal(state.sort, 'selected');
  assert.equal(state.vram, 0);
  assert.equal(state.context, 0);
  assert.equal(ui.routeState('#api?q=' + 'a'.repeat(90)).query.length, 80);
});
test('detail deep links carry their own provider and the Persian navigation origin', () => {
  const s = ui.routeState('#api/avanvis-fa?provider=ava-studio&from=fa&access=weights');
  assert.equal(s.provider, 'ava-studio');
  assert.equal(s.persian, true);
  assert.equal(s.access, 'weights');
  assert.equal(ui.routeState('#gpu/rtx-3090?ssh=1').ssh, true);
  assert.equal(ui.routeState('#saved?task=gpu&sort=price').kind, 'gpu');
});
test('a comparable-price filter excludes monthly-only rentals under a short rental preset', () => {
  const p = {
    id: 'monthly',
    kind: 'gpu',
    title: 'GPU',
    maker: 'NVIDIA',
    description: '',
    tags: [],
    offers: [{ id: 'm', monthly_toman: 100 }]
  };
  const estimates = { monthly: { standard: { offers: [{ id: 'm', estimate_toman: null }] } } };
  assert.equal(ui.filterProducts([p], { kind: 'gpu', priced: true }, [], estimates).length, 0);
  estimates.monthly.standard.offers[0].estimate_toman = 0;
  assert.equal(ui.filterProducts([p], { kind: 'gpu', priced: true }, [], estimates).length, 1);
});
test('numeric grouping cannot silently change malformed input into another amount', () => {
  for (const value of ['1,2', '12,,300', '1 2', '1,000,', '1.2.3'])
    assert.equal(ui.parseNumber(value, 1e9), null);
  assert.equal(ui.parseNumber('۱ ۲۵۰', 2000), 1250);
  assert.equal(ui.parseNumber(' 1, 250 ', 2000), 1250);
  assert.equal(ui.parseNumber('۱٬۲۵۰٫۵', 2000, false), 1250.5);
});
test('decision listings use the same input billing as catalog decision models', () => {
  assert.equal(ui.taskUnits.decision, 'input_tokens');
  assert.ok(
    products.filter((p) => p.task === 'decision').every((p) => p.unit === ui.taskUnits.decision)
  );
});

test('pagination partitions results, bounds invalid pages and handles empty lists', () => {
  const rows = Array.from({length:53},(_,i)=>i);
  const pages = [1,2,3].map(p=>ui.paginate(rows,p,20));
  assert.deepEqual(pages.flatMap(p=>p.rows),rows);
  assert.equal(pages[2].start,41);
  assert.equal(pages[2].end,53);
  assert.equal(ui.paginate(rows,999,20).page,1);
  assert.equal(ui.paginate([],1,20).start,0);
  assert.deepEqual(ui.paginate(Array(1000),25,20).numbers,[1,'gap',24,25,26,'gap',50]);
});

test('usage, batch and pagination links accept valid bounded values', () => {
  const s = ui.routeState('#api?task=chat&page=3&size=40&mode=batch&usage_unit=tokens&input_tokens=2000&output_tokens=0&requests_day=20');
  assert.equal(s.page,3); assert.equal(s.size,40); assert.equal(s.requestMode,'batch');
  assert.deepEqual(s.usage,{requests_day:20,input_tokens:2000,output_tokens:0});
  assert.equal(ui.routeState('#api?page=-2&size=0').page,1);
  assert.equal(ui.routeState('#gpu?mode=batch').requestMode,'instant');
  assert.deepEqual(ui.routeState('#api?usage_unit=tokens&input_tokens=NaN').usage,{});
});

test('offline rational arithmetic accepts tiny decimal workloads and rounds half up', () => {
  const plan={terms:[{rate:'50000',fields:['minutes'],denominator:1}]};
  assert.equal(ui.evaluatePlan(plan,{minutes:1e-7}).estimate_toman,0.01);
});

test('publisher Batch terms require independent rates, a completion window and a job cap', () => {
  const d={task:'chat',unit:'tokens',title:'مدل',publisher:'گروه',version:'1',base_model:'base',base_license:'license',language_detail:'فارسی',description:'text',training_data:'licensed',limitations:'short text',data_rights:true,api:true,weights:false,api_rate:'100',output_rate:'200',privacy:'no retention',batch:true,batch_rate:'50',batch_output_rate:'100',batch_hours:'24',batch_max_requests:'10000'};
  assert.equal(ui.validateListing(d),'');
  for (const bad of [{batch_max_requests:'0'},{batch_hours:''},{batch_rate:''},{batch_output_rate:''}])
    assert.ok(ui.validateListing({...d,...bad}));
});
