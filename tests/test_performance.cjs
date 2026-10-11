// Actual exported UI, local storage and events. These are DOM tests, not browser QA.
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { window, document } = parseHTML(
  fs.readFileSync(require('node:path').resolve(__dirname, '../dist/torobai.html'), 'utf8')
);
let reducedMotion = true,
  holdCalculations = false;
const calculationTimers = [],
  scrollCommands = [];
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
window.scrollTo = ({ top = 0, behavior }) => {
  scrollCommands.push({ top, behavior });
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
  matchMedia: () => ({ matches: reducedMotion }),
  fetch: () => {
    throw Error('Portable UI must not fetch');
  },
  setTimeout: (fn, ms) => {
    if (ms === 650 && holdCalculations) calculationTimers.push(fn);
    else if (ms <= 1000) setImmediate(fn);
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
(async () => {
  for (const script of document.querySelectorAll('script')) run(script.textContent);
  await flush();
  context.captureDownload = (...args) => downloads.push(args);
  run('downloadRecord=(...args)=>captureDownload(...args)');
  await go('#benchmarks');
  assert.equal(run('state.path'), 'benchmarks');
  assert.equal($('benchmarksNav').getAttribute('aria-current'), 'page');
  assert.equal(document.querySelectorAll('.bench-model').length, 3);
  assert.ok(text().includes('مدل‌ها را کنار هم ببینید'));
  assert.equal(document.querySelectorAll('.bench-table tbody tr').length, 6);
  assert.equal(
    document.querySelectorAll('.bench-best').length,
    0,
    'different reports cannot crown a winner'
  );
  const groups = JSON.parse(run('JSON.stringify(benchmarkGroups())'));
  const allProducts = JSON.parse(
    run('JSON.stringify(products.map(p=>({id:p.id,task:p.task,kind:p.kind})))')
  );
  // Every model/hardware entry is selectable and has a meaningful source or gap.
  for (const p of allProducts) {
    await go('#benchmarks?task=' + p.task + '&picks=' + p.id + '&chart=matrix');
    assert.equal(document.querySelectorAll('.bench-model').length, 1, p.id);
    assert.ok(document.querySelectorAll('.bench-table tbody tr').length > 0, p.id);
    assert.ok(!/undefined|NaN|Infinity|<bdi/.test(text()), p.id + ' leaked text');
    assert.ok(!document.querySelector('[aria-busy=true]'), 'bundled results render instantly');
    assert.ok(run(`benchmarkProfile(products.find(p=>p.id===${JSON.stringify(p.id)})).note`));
  }
  // Legacy cohort links still work, including both charts and exact tables.
  for (const g of groups)
    for (const chart of ['bars', 'matrix', 'scatter']) {
      await go('#benchmarks?group=' + g.id + '&chart=' + chart);
      assert.ok($('benchmarkResults'), g.id + ' ' + chart);
      assert.ok(!/undefined|NaN|Infinity/.test(text()), g.id + ' ' + chart);
      if (g.kind === 'scenario') assert.ok(text().includes('آزمون اجرا نشده'));
    }
  await go('#benchmarks?task=chat&picks=gemma-4-31b,gemma-4-12b&chart=matrix');
  assert.ok(
    document.querySelectorAll('.bench-best').length >= 4,
    'same report may highlight exact row best'
  );
  await go('#benchmarks?task=chat&picks=gemini-3.8-flash,gpt-4o-mini&common=1');
  assert.ok(text().includes('آزمون مشترکی پیدا نشد'));
  click(document.querySelector('[data-bench-all]'));
  await flush();
  assert.equal(run('state.benchCommon'), false);
  // The picker has all models of this task, stages changes, filters locally, and commits once.
  click(document.querySelector('[data-bench-add]'));
  assert.equal(
    document.querySelectorAll('.bench-picker-item').length,
    run("products.filter(p=>p.task==='chat').length")
  );
  const picksBefore = run('state.benchPicks');
  $('benchmarkSearch').value = 'qwen3.8';
  $('benchmarkSearch').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.ok(document.querySelectorAll('.bench-picker-item').length >= 3);
  click(document.querySelector('[data-bench-pick="qwen3.8-27b"]'));
  assert.equal(run('state.benchPicks'), picksBefore, 'draft must not mutate the comparison');
  click(document.querySelector('[data-bench-pick="qwen3.8-max"]'));
  click(document.querySelector('[data-bench-pick="qwen3.8-flash-next"]'));
  assert.equal($('benchmarkPickerError').hidden, false, 'fifth selection rejected');
  click(document.querySelector('[data-bench-apply]'));
  await flush();
  assert.equal(run('benchmarkContext().rows.length'), 4);
  assert.ok(run('state.benchPicks').includes('qwen3.8-27b'));
  assert.equal($('infoDialog').open, false);
  // A cancelled draft leaves committed picks and source ordering intact.
  click(document.querySelector('[data-bench-add]'));
  click(document.querySelector('[data-bench-pick="qwen3.8-27b"]'));
  run('closeDialog()');
  assert.ok(run('state.benchPicks').includes('qwen3.8-27b'));
  await go('#benchmarks?task=chat&picks=gpt-4o-mini,rtx-4090,gpt-4o-mini,does-not-exist');
  assert.equal(run('benchmarkContext().rows.length'), 1, 'cross-task and duplicate IDs removed');
  click(document.querySelector('[data-bench-remove]'));
  await flush();
  assert.equal(run('benchmarkContext().rows.length'), 1, 'last model is not removed');
  await go('#benchmarks?group=does-not-exist&metric=bad&chart=bad&picks=%3Csvg%3E');
  assert.ok($('benchmarkResults'));
  assert.ok(!document.querySelector('svg[onload]'));
  // Applying usage retains exact money, current selection, open disclosure and viewport.
  await go('#benchmarks?task=chat&picks=gemma-4-31b,gemma-4-12b');
  let f = $('benchmarkUsageForm');
  hydrate(f);
  run("window.TorobMotion.setOpen($('benchmarkUsage'),true,false)");
  const before = run('benchmarkContext().rows[0].quote.estimate_toman');
  window.scrollY = 440;
  input(f, 'requests_day', 2000);
  input(f, 'input_tokens', 850);
  input(f, 'output_tokens', 250);
  submit(f);
  await flush();
  assert.equal(run('state.usage.requests_day'), 2000);
  assert.equal(run('benchmarkContext().rows[0].quote.estimate_toman'), before * 2);
  assert.equal(window.scrollY, 440);
  assert.ok($('benchmarkUsage').open || $('benchmarkUsage').hasAttribute('open'));
  assert.ok(
    document.querySelector('.bench-model-name').getAttribute('href').includes('requests_day=2000')
  );
  const stableScroll = scrollCommands.length;
  const namesBefore = [...document.querySelectorAll('.bench-model-name')].map((n) => n.textContent);
  click(document.querySelector('[data-bench-chart=matrix]'));
  await flush();
  assert.equal(run('state.benchChart'), 'matrix');
  assert.deepEqual(
    [...document.querySelectorAll('.bench-model-name')].map((n) => n.textContent),
    namesBefore
  );
  assert.ok(scrollCommands.slice(stableScroll).every((s) => s.behavior === 'instant'));
  // Source dialogs and exports preserve tested version, nulls and provenance.
  await go('#benchmarks?task=chat&picks=gpt-4o');
  click(document.querySelector('[data-bench-source]'));
  assert.ok($('dialogBody').textContent.includes('gpt-4o-2024-08-06'));
  run('closeDialog()');
  click(document.querySelector('[data-bench-export]'));
  assert.ok(downloads.at(-1)[1].includes('gpt-4o-2024-08-06'));
  await go('#benchmarks?task=translation&picks=tarjoman-en-fa,parsinlu-en-fa');
  click(document.querySelector('[data-bench-export]'));
  const csv = downloads.at(-1)[1];
  assert.ok(csv.includes('"scenario","false"'));
  assert.ok(csv.includes('"research_report","true"'));
  assert.ok(csv.includes('4.957'));
  assert.ok(csv.includes('آزمون اجرا نشده'));
  assert.equal(downloads.at(-1)[0], 'torobai-benchmarks.csv');
  await go('#benchmarks?task=gpu&rental=heavy&picks=rtx-4090,rtx-5090');
  assert.equal(
    run("benchmarkQuote(products.find(p=>p.id==='rtx-4090')).estimate_toman"),
    run(
      "Math.min(...catalog.estimates['rtx-4090'].heavy.offers.filter(o=>o.estimate_toman!=null).map(o=>o.estimate_toman))"
    )
  );
  await go('#api/gemma-4-31b');
  click(document.querySelector('[data-detail-tab=performance]'));
  assert.equal($('detail-panel-performance').hidden, false);
  assert.equal($('detail-panel-prices').hidden, true);
  assert.ok($('detail-panel-performance').textContent.includes(run('fa(85.2,1)')));
  await go('#api/gpt-4o-mini');
  assert.ok($('detail-panel-performance').textContent.includes('۸۲'));
  await go('#api/tts-1');
  assert.ok($('detail-panel-performance').textContent.includes('MOS'));
  assert.ok($('detail-panel-performance').textContent.includes('ثبت نشده'));
  await go('#gpu/h100-80gb');
  assert.ok($('detail-panel-performance').textContent.includes('۸۰'));
  assert.equal(run("gpuParameterGuess(products.find(p=>p.id==='gemma-4-e2b'))"), '5.1');
  assert.equal(run("gpuParameterGuess(products.find(p=>p.id==='qwen3.5-35b-a3b'))"), '35');
  // New work retains results, displays progress, then focuses and scrolls once.
  await go('#gpu-match?model=qwen3.5-9b');
  f = $('gpuMatchForm');
  hydrate(f);
  reducedMotion = false;
  holdCalculations = true;
  const original = $('gpuMatchResults').innerHTML;
  input(f, 'parameters', 13);
  submit(f);
  assert.equal($('gpuMatchResults').getAttribute('aria-busy'), 'true');
  assert.equal($('gpuMatchResults').innerHTML, original);
  assert.equal(f.querySelector('[type=submit]').disabled, true);
  const started = scrollCommands.length;
  submit(f);
  assert.equal(calculationTimers.length, 1, 'duplicate submit coalesced');
  calculationTimers.shift()();
  await flush();
  assert.equal($('gpuMatchResults').getAttribute('aria-busy'), null);
  assert.equal(f.querySelector('[type=submit]').disabled, false);
  assert.equal(scrollCommands.length, started + 1);
  assert.equal(scrollCommands.at(-1).behavior, 'smooth');
  const memory = run(
    'gpuMemoryParts({parameters:13,bits:4,context:4096,kv:.25,concurrent:1,overhead:2,margin:20})'
  );
  assert.ok(Math.abs(memory.total - ((13e9 * 0.5) / 2 ** 30 + 1.024 + 2) * 1.2) < 1e-10);
  assert.ok(document.querySelectorAll('.memory-breakdown dd').length === 4);
  assert.ok(document.querySelector('.gpu-best-match'));
  // Canonical Persian numbers share cache; no spinner or timer.
  input(f, 'parameters', '۱۳');
  submit(f);
  assert.equal(calculationTimers.length, 0);
  assert.equal($('gpuMatchResults').getAttribute('aria-busy'), null);
  // Editing cancels pending work and never commits a stale result or scroll.
  input(f, 'parameters', 14);
  submit(f);
  const oldResult = $('gpuMatchResults').innerHTML,
    oldScroll = scrollCommands.length;
  input(f, 'parameters', 15);
  f.querySelector('[name=parameters]').dispatchEvent(new window.Event('input', { bubbles: true }));
  calculationTimers.shift()();
  await flush();
  assert.equal($('gpuMatchResults').innerHTML, oldResult);
  assert.equal(scrollCommands.length, oldScroll);
  assert.equal(f.querySelector('[type=submit]').disabled, false);
  assert.equal(run('gpuMatchPending'), null);
  // Leaving the route prevents stale work from replacing another page or scrolling it.
  submit(f);
  await go('#benchmarks');
  const afterRoute = scrollCommands.length;
  calculationTimers.shift()();
  await flush();
  assert.ok($('benchmarkResults'));
  assert.equal(scrollCommands.length, afterRoute);
  // Validation, empty results and actual catalog revision invalidation.
  reducedMotion = true;
  holdCalculations = false;
  await go('#gpu-match?model=qwen3.5-9b');
  f = $('gpuMatchForm');
  hydrate(f);
  input(f, 'concurrent', 0);
  submit(f);
  assert.equal($('gpuMatchError').hidden, false);
  input(f, 'concurrent', 1);
  input(f, 'parameters', 2000);
  submit(f);
  assert.ok($('gpuMatchResults').textContent.includes('پیشنهاد متناسب پیدا نشد'));
  assert.equal(scrollCommands.at(-1).behavior, 'instant');
  input(f, 'parameters', 7);
  input(f, 'disk', 0);
  input(f, 'traffic', 0);
  submit(f);
  assert.ok(!$('gpuMatchResults').textContent.includes('نرخ دیسک'));
  assert.ok(run('gpuMatchCache.size') > 0);
  run('applyMarket()');
  assert.equal(run('gpuMatchCache.size'), 0);
  assert.equal(nativeHashWrites, 0);
  console.log(
    JSON.stringify({
      status: 'passed',
      groups: groups.length,
      cohort_views: groups.length * 3,
      product_profiles: allProducts.length,
      scope:
        'Exported DOM, exact-cost reuse, benchmark provenance and GPU scheduling/scroll commands; no browser rendering'
    })
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
