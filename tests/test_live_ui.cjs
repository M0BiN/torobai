// Executes the served-page path with real Python catalog/calculation fixtures.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { parseHTML } = require('linkedom');
const root = require('node:path').resolve(__dirname, '..');
const payload = JSON.parse(
  execFileSync(
    process.env.TOROBAI_TEST_PYTHON || 'python',
    [
      '-c',
      'import json; from app.main import catalog, estimate, PriceScenario; print(json.dumps({"catalog": catalog(), "custom": estimate(PriceScenario(product_id="gpt-4o-mini", requests_day=10, input_tokens=100, output_tokens=20))}))'
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }
  )
);
const { window, document } = parseHTML(fs.readFileSync(root + '/app/static/index.html', 'utf8'));
const location = { hash: '#api/gpt-4o-mini', href: 'http://127.0.0.1:8000/#api/gpt-4o-mini' };
const calls = [];
window.localStorage = { getItem: () => null, setItem: () => {} };
window.scrollTo = () => {};
window.HTMLElement.prototype.focus = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
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
  navigator: { clipboard: { writeText: async () => {} } },
  matchMedia: () => ({ matches: true }),
  setTimeout: (fn, delay) => {
    if (delay <= 1000) setImmediate(fn);
  },
  clearTimeout: () => {},
  fetch: async (url, options) => {
    calls.push({ url, options });
    if (url === '/api/catalog') return { ok: true, json: async () => payload.catalog };
    assert.equal(url, '/api/estimate');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {
      product_id: 'gpt-4o-mini',
      requests_day: 10,
      input_tokens: 100,
      output_tokens: 20
    });
    return { ok: true, json: async () => payload.custom };
  }
});
async function flush() {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
}
(async () => {
  for (const name of ['ui', 'motion', 'marketplace', 'performance', 'app'])
    vm.runInContext(fs.readFileSync(root + '/app/static/' + name + '.js', 'utf8'), context);
  await flush();
  assert.ok(
    document.getElementById('budgetForm'),
    'Served page must retain custom consumption inputs'
  );
  assert.equal(calls.length, 1, 'Preset catalog values need no per-product network calls');
  const form = document.getElementById('budgetForm');
  for (const [name, value] of Object.entries({
    requests_day: '۱۰',
    input_tokens: '۱۰۰',
    output_tokens: '۲۰'
  })) {
    const input = form.querySelector(`[name="${name}"]`);
    input.value = value;
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  assert.equal(
    document.getElementById('summaryRate'),
    null,
    'Editing consumption invalidates the stale headline'
  );
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.equal(calls.length, 2);
  assert.equal(document.querySelector('#summaryRate .price-number').textContent, '۲,۵۸۶');
  assert.equal(document.querySelector('.featured-provider h2').textContent.trim(), '1xAi');
  assert.ok(!document.getElementById('main').textContent.includes('<span'));
  assert.ok(document.getElementById('usageSummary').textContent.includes('۱۰ درخواست'));
  console.log(
    JSON.stringify({
      status: 'passed',
      scenarios: 3,
      scope: 'Served-page DOM with Python calculation fixtures; no browser rendering'
    })
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
