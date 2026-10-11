// Runs the exported application, with controlled network replies and dialog geometry.
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const root = require('node:path').resolve(__dirname, '../..');
const html = fs.readFileSync(root + '/dist/torobai.html', 'utf8');
const { window, document } = parseHTML(html);
let hash = '#api',
  fetchHandler = () => {
    throw Error('Offline guide must not fetch');
  };
const scrolls = [],
  timers = [];
const location = {
  get hash() {
    return hash;
  },
  set hash(_) {
    throw Error('Native hash navigation');
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
window.localStorage = { getItem: () => null, setItem: () => {} };
window.scrollTo = (args) => scrolls.push(args);
window.scrollY = 400;
window.scrollX = 0;
window.innerHeight = 800;
window.HTMLElement.prototype.focus = function () {};
window.HTMLElement.prototype.scrollIntoView = function () {
  throw Error('Unexpected scrollIntoView');
};
window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { top: 0, left: 0, right: 500, bottom: 800, height: 100 };
};
window.HTMLElement.prototype.showModal = function () {
  this.open = true;
};
window.HTMLElement.prototype.close = function () {
  this.open = false;
};
window.getComputedStyle = () => ({ position: 'static' });
const context = vm.createContext({
  window,
  document,
  location,
  URL,
  URLSearchParams,
  console,
  navigator: {},
  AbortController,
  matchMedia: () => ({ matches: true }),
  setTimeout: (fn, delay) => {
    if (delay < 1000) return setTimeout(fn, delay);
    timers.push(delay);
    return -1;
  },
  clearTimeout,
  fetch: (...args) => fetchHandler(...args)
});
const run = (code) => vm.runInContext(code, context);
const click = (el) => {
  assert.ok(el, 'Missing control');
  el.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
};
const flush = async () => {
  for (let n = 0; n < 8; n++) await new Promise((resolve) => setImmediate(resolve));
};
const choose = (label) =>
  click(
    [
      ...document.querySelectorAll(
        (document.getElementById('chatbotSheet').open ? '#chatbotSheet' : '#chatbotChoices') +
          ' button[data-chat-choice]'
      )
    ].find((b) => b.textContent === label)
  );
const plain = (value) => JSON.parse(JSON.stringify(value));
(async () => {
  for (const script of document.querySelectorAll('script')) run(script.textContent);
  await flush();
  run('window.TorobChat.open()');
  assert.equal(document.getElementById('chatbotPanel').open, true);
  assert.ok(document.getElementById('chatbotInput').disabled);
  choose('برای کدنویسی');
  assert.match(document.getElementById('chatbotLog').textContent, /API یا ابزار کدنویسی/);
  choose('اتصال با API');
  let cards = [...document.querySelectorAll('.chatbot-message:last-child .chatbot-card')];
  assert.ok(cards.length > 0 && cards.length <= 3);
  assert.match(
    document.querySelector('.chatbot-message:last-child .chatbot-basis').textContent,
    /آزمون منتشرشده/
  );
  assert.equal(scrolls.length, 1, 'Chat messages did not scroll the page after initial route');
  const destination = document
    .querySelector('.chatbot-message:last-child .chatbot-links a')
    .getAttribute('href');
  assert.ok(destination.includes('usecase=coding'));
  const expected = run(
    'catalogRows(HB.routeState(' + JSON.stringify(destination) + ')).map(p=>p.id)'
  );
  await run('route({url:' + JSON.stringify(destination) + '})');
  await flush();
  assert.equal(
    document.querySelectorAll('#catalogResults .product-card').length,
    Math.min(20, expected.length)
  );
  assert.match(document.getElementById('catalogAppliedFilters').textContent, /آزمون کدنویسی/);
  const transcriptBeforeSettings = document.getElementById('chatbotLog').innerHTML;
  choose('تنظیم مصرف و بودجه');
  assert.equal(document.getElementById('chatbotLog').innerHTML, transcriptBeforeSettings);
  assert.equal(document.querySelector('#chatbotLog form'), null);
  assert.equal(document.getElementById('chatbotSheet').open, true);
  const form = document.getElementById('chatbotUsageForm');
  for (const [key, value] of Object.entries({
    requests_day: '۱۰',
    input_tokens: '۱۰۰',
    output_tokens: '۲۰',
    budget: '۵۰۰۰۰'
  }))
    form.querySelector(`[name=${key}]`).value = value;
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.equal(document.getElementById('chatbotSheet').open, false);
  const budgetLink = document
    .querySelector('.chatbot-message:last-child .chatbot-links a')
    .getAttribute('href');
  assert.match(budgetLink, /max_cost=50000/);
  assert.match(budgetLink, /requests_day=10/);
  const results = run('catalogRows(HB.routeState(' + JSON.stringify(budgetLink) + '))');
  assert.ok(results.length);
  for (const product of results)
    assert.ok(
      run(
        'catalogQuote(products.find(p=>p.id===' +
          JSON.stringify(product.id) +
          '),HB.routeState(' +
          JSON.stringify(budgetLink) +
          ')).best.estimate_toman'
      ) <= 50000
    );
  // Preserve the same provider and quote at every card destination.
  for (const card of document.querySelectorAll('.chatbot-message:last-child .chatbot-card')) {
    const link = card.querySelector('a').getAttribute('href');
    await run('route({url:' + JSON.stringify(link) + '})');
    await flush();
    assert.equal(
      document.querySelector('#summaryRate .price-number').textContent,
      card.querySelector('.price-number').textContent
    );
  }
  // Explicit zero cap is applied and can be removed, without becoming a permanent zero filter.
  await run("route({url:'#api?task=chat&max_cost=0'})");
  await flush();
  assert.match(document.getElementById('catalogAppliedFilters').textContent, /تا ۰ تومان/);
  click(document.querySelector('[data-remove-filter=maxCost]'));
  await flush();
  assert.equal(run('state.maxCost'), null);
  // Pure state transitions keep privacy, clear incompatible task usage, and merge partial usage.
  assert.deepEqual(
    plain(
      run(
        "TorobChatCore.updateNeeds({task:'chat',access:'api',tools:true,no_retention:true,usage:{requests_day:4}}, {set:{access:'weights'}})"
      )
    ),
    { task: 'chat', access: 'weights', no_retention: true }
  );
  assert.deepEqual(
    plain(
      run(
        'TorobChatCore.updateNeeds({usage:{requests_day:4,input_tokens:20}},{set:{usage:{output_tokens:30}}})'
      )
    ).usage,
    { requests_day: 4, input_tokens: 20, output_tokens: 30 }
  );
  assert.equal(
    run(
      "TorobChatCore.updateNeeds({budget_toman:5,budget_period:'month'},{unset:['budget_toman']}).budget_period"
    ),
    undefined
  );
  // New catalog constraints search all records, not the three displayed cards.
  click(document.getElementById('chatbotClear'));
  choose('GPU برای مدل');
  choose('ویرایش شرایط');
  choose('SSH و حداقل ۲۴ GB');
  const gpuLink = document
    .querySelector('.chatbot-message:last-child .chatbot-links a')
    .getAttribute('href');
  assert.match(gpuLink, /ssh=1/);
  assert.match(gpuLink, /vram=24/);
  for (const p of run('catalogRows(HB.routeState(' + JSON.stringify(gpuLink) + '))'))
    assert.ok(p.vram >= 24 && p.offers.some((o) => o.ssh));
  choose('تنظیم مصرف و بودجه');
  for (const option of document.querySelectorAll('#chatbotUsageForm select option'))
    option.selected = option.value === 'heavy';
  document
    .getElementById('chatbotUsageForm')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.match(
    document.querySelector('.chatbot-message:last-child .chatbot-links a').getAttribute('href'),
    /rental=heavy/
  );
  // Explicit benchmark names resolve to canonical IDs, preserving requested order.
  const comparisonResult = run(
    `TorobChatCore.decide({}, {intent:'compare', compare_names:['GPT-4o mini','GPT-5 nano']}, {snapshot:()=>({products})}, HB)`
  );
  assert.match(comparisonResult.links[0].url, /picks=gpt-4o-mini%2Cgpt-5-nano/);
  const ambiguous = run(
    `TorobChatCore.decide({}, {intent:'compare', compare_names:['GPT-unknown']}, {snapshot:()=>({products})}, HB)`
  );
  assert.ok(!ambiguous.links[0].url.includes('GPT-unknown'));
  // A hard budget never crosses API/weights/GPU periods without a user choice.
  const wrongPeriod = run(
    `TorobChatCore.decide({task:'chat',access:'weights',budget_toman:100,budget_period:'month'}, {}, {}, HB)`
  );
  assert.ok(wrongPeriod.choices.some((c) => c.set?.budget_period === 'license'));
  const unresolvedGPU = run(`TorobChatCore.decide({task:'gpu',no_retention:true}, {}, {}, HB)`);
  assert.ok(unresolvedGPU.text.includes('نمی‌توان'));
  // File mode guidance, seller path and zero-result recovery remain usable without LLM.
  click(document.getElementById('chatbotClear'));
  choose('عرضه مدل خودم');
  assert.equal(
    document.querySelector('.chatbot-message:last-child .chatbot-links a').getAttribute('href'),
    '#publish'
  );
  assert.equal(timers.includes(650), false, 'Ready local guide has no presentation wait');
  // Opening and cancelling settings never rewrites history or the active choice mapping.
  click(document.getElementById('chatbotClear'));
  choose('GPU برای مدل');
  const historyBeforeEdit = document.getElementById('chatbotLog').innerHTML;
  const oldResultLink = document.querySelector('.chatbot-message:last-child .chatbot-card a');
  const oldURL = oldResultLink.getAttribute('href');
  choose('ویرایش شرایط');
  click(document.getElementById('chatbotSheetClose'));
  assert.equal(document.getElementById('chatbotLog').innerHTML, historyBeforeEdit);
  choose('تنظیم مصرف و بودجه');
  assert.ok(document.getElementById('chatbotUsageForm'));
  click(document.getElementById('chatbotSheetClose'));
  choose('ویرایش شرایط');
  choose('SSH و حداقل ۲۴ GB');
  assert.equal(
    oldResultLink.getAttribute('href'),
    oldURL,
    'Old results retain their original scope'
  );
  assert.equal(
    document.querySelector('#chatbotLog [data-chat-choice]'),
    null,
    'Only current replies are offered'
  );
  click(document.getElementById('chatbotExpand'));
  assert.equal(document.getElementById('chatbotExpand').getAttribute('aria-pressed'), 'true');
  click(document.getElementById('chatbotExpand'));
  assert.equal(document.getElementById('chatbotExpand').getAttribute('aria-pressed'), 'false');
  // Simulate served mode; assert parser is used, one result applies and stale replies cannot apply.
  run('window.TOROBAI_CATALOG=null');
  fetchHandler = async (url) => {
    assert.equal(url, '/api/chatbot/status');
    return { ok: true, json: async () => ({ available: true }) };
  };
  click(document.getElementById('chatbotClear'));
  run('window.TorobChat.open()');
  await flush();
  assert.equal(document.getElementById('chatbotInput').disabled, false);
  let release;
  fetchHandler = (_url, options) => {
    assert.equal(_url, '/api/chatbot/parse');
    const body = JSON.parse(options.body);
    assert.equal(body.text, 'برای کدنویسی API ارزون می‌خوام');
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  document.getElementById('chatbotInput').value = 'برای کدنویسی API ارزون می‌خوام';
  document
    .getElementById('chatbotForm')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.equal(document.getElementById('chatbotPending').hidden, false);
  choose('گفتار فارسی به متن');
  release({
    ok: true,
    json: async () => ({
      intent: 'find',
      set: { task: 'chat', access: 'api', usecase: 'coding' },
      unset: [],
      unresolved: []
    })
  });
  await flush();
  assert.ok(
    document.getElementById('chatbotContextText').textContent.includes('گفتار'),
    'New choice defeats stale parser reply'
  );
  let calls = 0;
  const log = document.getElementById('chatbotLog');
  Object.defineProperties(log, {
    scrollHeight: { value: 1400, configurable: true },
    clientHeight: { value: 400, configurable: true }
  });
  fetchHandler = async (_url, options) => {
    calls++;
    log.scrollTop = 180; // The user reads an older question while the request is pending.
    return {
      ok: true,
      json: async () => ({
        intent: 'find',
        set: {
          task: 'chat',
          access: 'api',
          usecase: 'coding',
          priority: 'cost',
          tools: true,
          persian: false
        },
        unset: [],
        unresolved: []
      })
    };
  };
  document.getElementById('chatbotInput').value =
    'API ارزان برای کدنویسی با ابزار؛ فارسی اختصاصی لازم نیست';
  document
    .getElementById('chatbotForm')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.equal(calls, 1);
  assert.equal(log.scrollTop, 180, 'Reply preserves reading position');
  assert.equal(document.getElementById('chatbotLatest').hidden, false);
  click(document.getElementById('chatbotLatest'));
  assert.equal(document.getElementById('chatbotLatest').hidden, true);
  assert.equal(document.getElementById('chatbotPending').hidden, true);
  assert.match(
    document.getElementById('chatbotLog').lastElementChild.textContent,
    /نتیجه‌ای در کاتالوگ پیدا نشد/
  );
  choose('دیدن مدل‌های بدون آزمون کدنویسی هم');
  const finalLink = document
    .querySelector('.chatbot-message:last-child .chatbot-links a')
    .getAttribute('href');
  assert.match(finalLink, /tools=1/);
  assert.match(finalLink, /sort=price/);
  assert.ok(!document.getElementById('chatbotLog').textContent.includes('<span'));
  // A pending reply can finish after dismissal without resetting the saved reading position.
  fetchHandler = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  document.getElementById('chatbotInput').value = 'دوباره بررسی کن';
  document
    .getElementById('chatbotForm')
    .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  log.scrollTop = 180;
  click(document.getElementById('chatbotClose'));
  release({ ok: true, json: async () => ({ intent: 'find', set: {}, unset: [], unresolved: [] }) });
  await flush();
  assert.equal(log.scrollTop, 180, 'Hidden conversation retains its scroll when a reply arrives');
  run('window.TorobChat.open()');
  assert.equal(log.scrollTop, 180);
  assert.equal(document.getElementById('chatbotLatest').hidden, false);
  console.log(
    'Chatbot: portable/served DOM, quote/destination parity, corrections, budget, GPU, seller, pending and stale-reply checks passed.'
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
