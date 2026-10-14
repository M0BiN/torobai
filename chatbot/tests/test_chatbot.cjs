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
  timers = [],
  scheduledTimers = new Map();
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
  TextEncoder,
  matchMedia: () => ({ matches: true }),
  setTimeout: (fn, delay) => {
    if (delay < 1000) return setTimeout(fn, delay);
    timers.push(delay);
    const id = 'timer-' + timers.length;
    scheduledTimers.set(id, { fn, delay });
    return id;
  },
  clearTimeout: (id) => {
    scheduledTimers.delete(id);
    clearTimeout(id);
  },
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
const expire = (delay) => {
  const entry = [...scheduledTimers].find(([, timer]) => timer.delay === delay);
  assert.ok(entry, 'Missing timer for ' + delay);
  scheduledTimers.delete(entry[0]);
  entry[1].fn();
};
const submit = (text) => {
  document.getElementById('chatbotInput').value = text;
  document.getElementById('chatbotForm').dispatchEvent(
    new window.Event('submit', { bubbles: true, cancelable: true })
  );
};
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
  assert.ok(cards.every((card) => /آزمون منتشرشده/.test(card.querySelector('.chatbot-card-reason').textContent)));
  assert.match(document.querySelector('.chatbot-criteria').textContent, /آزمون کدنویسی منتشرشده/);
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
  // One activity row follows real pending work; retry preserves the next draft and context.
  click(document.getElementById('chatbotClear'));
  const requests = [];
  fetchHandler = (_url, options) => {
    requests.push(JSON.parse(options.body));
    return new Promise((resolve) => { release = resolve; });
  };
  submit('مدل GPT-4o mini با API');
  const activity = document.getElementById('chatbotPending');
  const send = document.getElementById('chatbotSend');
  const input = document.getElementById('chatbotInput');
  assert.equal(activity.parentElement.id, 'chatbotLog');
  assert.equal(activity.hidden, false);
  assert.equal(activity.getAttribute('aria-hidden'), 'true');
  assert.equal(activity.querySelectorAll('.chatbot-typing > span').length, 3);
  assert.equal(document.getElementById('chatbotPendingText').hidden, true);
  assert.match(document.getElementById('chatbotStatus').textContent, /در حال نوشتن/);
  assert.equal(send.disabled, false);
  assert.equal(send.type, 'button');
  assert.equal(send.getAttribute('aria-label'), 'توقف دریافت پاسخ');
  const staleSlowHint = [...scheduledTimers.values()].find((timer) => timer.delay === 8000).fn;
  expire(8000);
  assert.match(activity.textContent, /پاسخ هنوز آماده نشده/);
  assert.equal(document.getElementById('chatbotPendingText').hidden, false);
  assert.equal(activity.querySelectorAll('.chatbot-typing > span').length, 3);
  input.value = 'پیش‌نویس بعدی من';
  const enter = new window.Event('keydown', { bubbles: true, cancelable: true });
  Object.assign(enter, { key: 'Enter', shiftKey: false, isComposing: false });
  input.dispatchEvent(enter);
  assert.equal(requests.length, 1, 'Enter while pending neither submits nor stops');
  assert.equal(activity.hidden, false);
  click(send);
  assert.equal(activity.hidden, true);
  assert.equal(input.value, 'پیش‌نویس بعدی من');
  assert.ok(log.lastElementChild.classList.contains('is-stopped'));
  const interrupted = log.innerHTML;
  release({ ok: true, json: async () => ({ intent: 'find', set: { task: 'gpu' }, unset: [], unresolved: [] }) });
  await flush();
  assert.equal(log.innerHTML, interrupted, 'Late success cannot replace a stopped turn');
  assert.equal(scheduledTimers.size, 0, 'Stop clears pending timers');
  const usersBeforeRetry = log.querySelectorAll('.user').length;
  click(log.querySelector('.chatbot-message:last-child [data-chat-command=retry]'));
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1].recent, requests[0].recent);
  assert.equal(log.querySelectorAll('.user').length, usersBeforeRetry);
  assert.equal(input.value, 'پیش‌نویس بعدی من');
  assert.equal(document.getElementById('chatbotPendingText').hidden, true, 'Retry starts with only the dots');
  release({ ok: true, json: async () => ({ intent: 'find', set: { query: 'GPT-4o mini', access: 'api' }, unset: [], unresolved: [] }) });
  await flush();
  assert.equal(activity.hidden, true);
  assert.equal(scheduledTimers.size, 0);
  assert.equal(send.type, 'submit');
  assert.equal(log.querySelectorAll('.is-stopped').length, 0, 'Retry settles the affected turn');
  assert.equal(input.value, 'پیش‌نویس بعدی من');
  const namedCards = [...log.lastElementChild.querySelectorAll('.chatbot-card h3')];
  assert.equal(namedCards.length, 1);
  assert.equal(namedCards[0].textContent, 'GPT-4o mini');
  const namedRoute = log.lastElementChild.querySelector('.chatbot-links a').getAttribute('href');
  assert.equal(new URLSearchParams(namedRoute.split('?')[1]).get('q'), 'GPT-4o mini');
  staleSlowHint();
  assert.equal(document.getElementById('chatbotStatus').textContent, '', 'An old hint cannot announce a settled reply');
  // A clarification belongs to the next question, not to unsupported catalog requirements.
  fetchHandler = async () => ({ ok: true, json: async () => ({
    intent: 'find', set: { budget_toman: 50000 }, unset: [], unresolved: [],
    question: 'این بودجه برای یک ماه است؟'
  }) });
  submit('بودجه من پنجاه هزار تومان است');
  await flush();
  assert.equal(log.lastElementChild.querySelector('.chatbot-unresolved'), null);
  choose('انتخاب با گزینه‌ها');
  choose('مصرف یک ماه');
  assert.equal(log.lastElementChild.querySelector('.chatbot-unresolved'), null);
  // Failures remain actionable and do not change the applied criteria or create hidden retries.
  const criteriaBeforeError = document.getElementById('chatbotContextText').textContent;
  for (const status of [429, 503, 413, 422]) {
    let count = 0;
    fetchHandler = async () => { count++; return { ok: false, status }; };
    submit('دوباره بررسی کن');
    await flush();
    assert.equal(count, 1);
    assert.equal(activity.hidden, true);
    assert.ok(log.lastElementChild.classList.contains('is-error'));
    assert.equal(document.getElementById('chatbotContextText').textContent, criteriaBeforeError);
    assert.equal(log.lastElementChild.querySelectorAll('.chatbot-recovery button:not(:disabled)').length, 2);
    assert.equal(scheduledTimers.size, 0);
  }
  fetchHandler = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error(), { name: 'AbortError' })));
  });
  submit('این بار منتظر می‌مانم');
  expire(25000);
  await flush();
  assert.match(log.lastElementChild.textContent, /دریافت پاسخ طول کشید/);
  assert.equal(activity.hidden, true);
  assert.equal(scheduledTimers.size, 0);
  fetchHandler = async () => ({ ok: true, json: async () => ({ invalid: true }) });
  submit('یک پاسخ دیگر');
  await flush();
  assert.match(log.lastElementChild.textContent, /پاسخ معتبر دریافت نشد/);
  // Editing an unverified requirement defeats a response created with the older requirement.
  fetchHandler = async () => ({ ok: true, json: async () => ({ intent: 'find', set: {}, unset: [], unresolved: ['پردازش داخل سازمان'] }) });
  submit('پردازش باید داخل سازمان باشد');
  await flush();
  const removeRequirement = log.lastElementChild.querySelector('[data-chat-command=clear-unresolved]');
  fetchHandler = () => new Promise((resolve) => { release = resolve; });
  submit('این شرط را دوباره بررسی کن');
  click(removeRequirement);
  assert.equal(log.lastElementChild.querySelector('.chatbot-unresolved'), null);
  assert.equal(removeRequirement.disabled, true);
  const afterRemoval = log.innerHTML;
  release({ ok: true, json: async () => ({ intent: 'find', set: {}, unset: [], unresolved: ['پردازش داخل سازمان'] }) });
  await flush();
  assert.equal(log.innerHTML, afterRemoval, 'Late response cannot restore a removed requirement');
  // UTF-8 byte limits still hold after several long failed Persian messages.
  click(document.getElementById('chatbotClear'));
  const bodies = [];
  fetchHandler = async (_url, options) => {
    assert.ok(Buffer.byteLength(options.body, 'utf8') <= 24000);
    bodies.push(JSON.parse(options.body));
    return { ok: false, status: 503 };
  };
  for (let i = 0; i < 8; i++) { submit('ی'.repeat(2000)); await flush(); }
  submit('حالا یک مدل پیشنهاد بده');
  await flush();
  assert.equal(bodies.length, 9, 'Old failed messages cannot block the next request');
  assert.ok(bodies.every((body) => body.recent.length <= 6));
  assert.ok(bodies.slice(-3).some((body) => body.recent.length < 6));
  // Explanations use the actual answer, including topics outside the old fixed menu.
  click(document.getElementById('chatbotClear'));
  fetchHandler = async () => ({ ok: true, json: async () => ({
    intent: 'answer', answer: 'KV cache برای نگهداری اطلاعات توکن‌های قبلی است. <img src=x onerror=alert(1)>',
    set: {}, unset: [], unresolved: []
  }) });
  submit('KV cache چه فرقی با وزن‌های مدل دارد؟');
  await flush();
  assert.match(log.lastElementChild.textContent, /KV cache/);
  assert.equal(log.lastElementChild.querySelector('img'), null);
  assert.equal(log.lastElementChild.querySelector('.chatbot-card'), null);
  // Hosting a named model uses the shared planner, not a search for its name among GPUs.
  fetchHandler = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.ok(body.recent.some((m) => m.role === 'assistant' && m.content.includes('KV cache')));
    return { ok: true, json: async () => ({
      intent: 'find', answer: 'حافظه به دقت وزن‌ها و تعداد درخواست‌های هم‌زمان بستگی دارد.',
      set: { task: 'gpu', ssh: true, inference: { model: 'qwen 3.6 27b' } }, unset: [], unresolved: []
    }) };
  };
  submit('کدام GPU می‌تواند qwen 3.6 27b را سرو کند؟');
  await flush();
  assert.equal(log.lastElementChild.querySelectorAll('.chatbot-memory tbody tr').length, 3);
  assert.match(log.lastElementChild.textContent, /۰٫۲۵ GiB/);
  choose('بررسی ۸ بیت');
  cards = [...log.lastElementChild.querySelectorAll('.chatbot-card')];
  assert.ok(cards.length > 0);
  const planURL = log.lastElementChild.querySelector('.chatbot-links a').getAttribute('href');
  const memory = run('gpuMemoryParts({parameters:27,bits:8,context:4096,concurrent:1,kv:0.25,overhead:2,margin:20})');
  assert.equal(new URLSearchParams(planURL.split('?')[1]).get('vram'), String(Math.ceil(memory.total)));
  assert.equal(new URLSearchParams(planURL.split('?')[1]).has('q'), false);
  for (const p of run('catalogRows(HB.routeState(' + JSON.stringify(planURL) + '))'))
    assert.ok(p.vram >= memory.total && p.offers.some((o) => o.ssh === true));
  const corrected = run("TorobChatCore.updateNeeds({task:'gpu',inference:{model:'Qwen3.6 27B',bits:8,context:8192,parameters:27}},{set:{inference:{bits:4}}})");
  assert.equal(corrected.inference.model, 'Qwen3.6 27B');
  assert.equal(corrected.inference.context, 8192);
  assert.equal(corrected.inference.bits, 4);
  const otherModel = run("TorobChatCore.updateNeeds({task:'gpu',inference:{model:'Qwen3.6 27B',parameters:27,bits:4}},{set:{inference:{model:'Qwen3.5 9B'}}})");
  assert.equal(otherModel.inference.parameters, undefined);
  assert.equal(run("gpuParameterGuess({title:'Example 2.4T A95B'})"), '2400');
  assert.equal(run("gpuParameterGuess({title:'Example 35B A3B'})"), '35');
  assert.equal(run("gpuParameterGuess({title:'Example 0.6B'})"), '0.6');
  // Unknown revisions ask for the total size instead of borrowing another model's size.
  fetchHandler = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.ok(body.recent.some((m) => m.role === 'assistant' &&
      m.content.includes(memory.total.toFixed(1) + ' GiB') && m.content.includes('سازگاری موتور')));
    return { ok: true, json: async () => ({
      intent: 'find', set: { inference: { model: 'Unlisted Example' } }, unset: [], unresolved: []
    }) };
  };
  submit('حالا برای Unlisted Example چطور؟');
  await flush();
  assert.match(log.lastElementChild.textContent, /تعداد کل پارامترها/);
  assert.equal(log.lastElementChild.querySelector('.chatbot-card'), null);
  assert.equal(scrolls.length > 0, true);
  console.log(
    'Chatbot: portable/served DOM, quote/destination parity, corrections, budget, GPU, seller, pending and stale-reply checks passed.'
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
