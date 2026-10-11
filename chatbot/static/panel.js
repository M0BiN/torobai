/* The guide UI. Pricing, catalog filters and navigation are supplied by app.js. */
window.TorobChat = (() => {
  'use strict';
  const C = TorobChatCore,
    esc = HB.escape;
  let host,
    panel,
    needs = {},
    unresolved = [],
    messages = [],
    lastCards = [];
  let choices = [],
    pending = null,
    requestVersion = 0,
    enabled = false;
  let statusChecked = false,
    lastText = '',
    returnFocus = null,
    destination = null;
  let resultRevision = 0,
    lastPage = '';
  const $ = (id) => document.getElementById(id);
  let sheetFocus = null,
    sheetChoices = [];
  const mark = `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M9 12c0-4 3-7 7-7h19c4 0 7 3 7 7v12c0 4-3 7-7 7h-8l-9 7v-7h-2c-4 0-7-3-7-7V12Z" fill="#273443"/><path d="M5 29c0-5 4-9 9-9h10c5 0 9 4 9 9v3c0 5-4 9-9 9H13l-8 4V29Z" fill="#EF725C"/><path d="M14 29h10M14 34h6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M18 14h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const icons = {
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    edit: '<path d="M12 5H5v14h14v-7M10 14l1-4L19 2l3 3-8 8-4 1Z"/>',
    expand: '<path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5"/>',
    send: '<path d="m5 12 7-7 7 7M12 5v14"/>',
    settings: '<path d="M4 7h16M4 17h16M9 4v6M15 14v6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    privacy: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>'
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

  function mount(application) {
    host = application;
    if (panel) return;
    panel = document.createElement('dialog');
    panel.id = 'chatbotPanel';
    panel.className = 'chatbot-panel';
    panel.setAttribute('aria-labelledby', 'chatbotTitle');
    panel.innerHTML = `
      <header class="chatbot-header"><span class="chatbot-emblem">${mark}</span><div class="chatbot-identity"><h2 id="chatbotTitle">همراه <bdi>torobai</bdi></h2><p>راهنمای انتخاب مدل و سرویس</p></div><button type="button" id="chatbotClear" class="chatbot-icon" aria-label="گفتگوی تازه" title="گفتگوی تازه">${icon('edit')}</button><button type="button" id="chatbotExpand" class="chatbot-icon chatbot-expand" aria-label="بزرگ کردن گفتگو" title="بزرگ کردن گفتگو" aria-pressed="false">${icon('expand')}</button><button type="button" id="chatbotClose" class="chatbot-icon" aria-label="بستن گفتگو" title="بستن گفتگو">${icon('close')}</button></header>
      <div id="chatbotContext" class="chatbot-context" hidden><button type="button" data-chat-command="edit">${icon('settings')}<span id="chatbotContextText"></span><span class="chatbot-context-edit">ویرایش</span></button></div>
      <div id="chatbotPageNotice" class="chatbot-page-notice" hidden><p>فیلترهای صفحه تغییر کرده. همین شرایط را در گفتگو هم استفاده کنیم؟</p><button type="button" data-chat-command="adopt">بله، استفاده کن</button><button type="button" data-chat-command="keep">با شرایط قبلی ادامه بده</button></div>
      <div class="chatbot-conversation"><div id="chatbotLog" class="chatbot-log" role="log" aria-label="متن گفتگو" aria-live="polite" aria-relevant="additions" tabindex="0"></div><button type="button" id="chatbotLatest" class="chatbot-latest" hidden>${icon('down')} پیام جدید</button></div>
      <div class="chatbot-bottom">
        <div id="chatbotPending" class="chatbot-pending" role="status" hidden><span class="chatbot-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>دارم درخواستت را بررسی می‌کنم</span><button id="chatbotStop" type="button">توقف</button></div>
        <div id="chatbotError" class="chatbot-error" role="alert" hidden></div>
        <div id="chatbotChoices" class="chatbot-choices" role="group" aria-label="پاسخ‌های پیشنهادی"></div>
        <form id="chatbotForm"><label for="chatbotInput" class="sr-only">پیامت را بنویس</label><textarea id="chatbotInput" maxlength="2000" rows="1" placeholder="بگو برای چه کاری مدل می‌خواهی…" disabled></textarea><button id="chatbotSend" type="submit" aria-label="ارسال پیام" disabled>${icon('send')}</button></form>
        <div class="chatbot-footnote"><p id="chatbotMode" class="chatbot-mode">با گزینه‌های آماده شروع کن.</p><button type="button" class="chatbot-privacy" data-chat-command="privacy" aria-label="حریم خصوصی گفتگو" title="حریم خصوصی گفتگو">${icon('privacy')}</button></div>
      </div>
      <dialog id="chatbotSheet" class="chatbot-sheet" aria-labelledby="chatbotSheetTitle"><header><div><span>همراه torobai</span><h3 id="chatbotSheetTitle"></h3></div><button type="button" id="chatbotSheetClose" class="chatbot-icon" aria-label="بازگشت به گفتگو">${icon('close')}</button></header><div id="chatbotSheetBody" class="chatbot-sheet-body"></div></dialog>`;
    document.body.append(panel);
    if ($('chatbotButton')) {
      $('chatbotButton').innerHTML = `${mark}<span>کمک به انتخاب</span>`;
      $('chatbotButton').addEventListener('click', open);
    }
    $('chatbotSheetClose').addEventListener('click', closeSheet);
    $('chatbotSheet').addEventListener('close', (event) => {
      event.stopPropagation();
      const target = sheetFocus?.isConnected
        ? sheetFocus
        : enabled
          ? $('chatbotInput')
          : $('chatbotChoices').querySelector('button');
      if (panel.open) target?.focus?.({ preventScroll: true });
    });
    $('chatbotExpand').addEventListener('click', () => {
      const expanded = panel.classList.toggle('is-expanded');
      $('chatbotExpand').setAttribute('aria-pressed', String(expanded));
      $('chatbotExpand').setAttribute(
        'aria-label',
        expanded ? 'اندازه معمول گفتگو' : 'بزرگ کردن گفتگو'
      );
      $('chatbotExpand').title = expanded ? 'اندازه معمول گفتگو' : 'بزرگ کردن گفتگو';
    });
    $('chatbotLatest').addEventListener('click', () => {
      const log = $('chatbotLog');
      if (log.scrollTo)
        log.scrollTo({
          top: log.scrollHeight,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        });
      else log.scrollTop = log.scrollHeight;
      $('chatbotLatest').hidden = true;
    });
    $('chatbotLog').addEventListener('scroll', () => {
      const log = $('chatbotLog');
      if (log.scrollHeight - log.scrollTop - log.clientHeight < 60)
        $('chatbotLatest').hidden = true;
    });
    $('chatbotClose').addEventListener('click', close);
    $('chatbotClear').addEventListener('click', clear);
    $('chatbotStop').addEventListener('click', () => stop(true));
    panel.addEventListener('close', (event) => {
      if (event.target === panel) returnFocus?.focus?.({ preventScroll: true });
    });
    panel.addEventListener('click', (event) => {
      if (event.target === panel) {
        const rect = panel.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          close();
      }
      const button = event.target.closest('[data-chat-choice]');
      if (button && !button.disabled)
        choose(
          ($('chatbotSheet').contains(button) ? sheetChoices : choices)[
            Number(button.dataset.chatChoice)
          ]
        );
      const remove = event.target.closest('[data-chat-remove]');
      if (remove) {
        stop();
        needs = C.updateNeeds(needs, { unset: [remove.dataset.chatRemove] });
        closeSheet();
        showDecision();
      }
      const command = event.target.closest('[data-chat-command]')?.dataset.chatCommand;
      if (command === 'retry') send(lastText, true);
      if (command === 'retry-status') {
        statusChecked = false;
        checkStatus();
      }
      if (command === 'usage') showUsage();
      if (command === 'edit') showEdit();
      if (command === 'close-sheet') closeSheet();
      if (command === 'privacy')
        showSheet(
          'حریم خصوصی گفتگو',
          '<p>این یک راهنمای هوشمند است. گفتگو فقط تا باز بودن این صفحه نگه داشته می‌شود؛ با بازخوانی یا شروع گفتگوی تازه پاک خواهد شد.</p><p>در گفتگوی متنی، پیام‌ها و اطلاعات لازم برای فهم درخواست به OpenRouter و ارائه‌دهنده مدل ارسال می‌شوند. کلید API، کد خصوصی یا دیتاست خودت را نفرست.</p>'
        );
      if (command === 'adopt') adoptPage();
      if (command === 'keep') {
        destination = null;
        $('chatbotPageNotice').hidden = true;
      }
      if (command === 'clear-unresolved') {
        unresolved = [];
        showDecision();
      }
      const link = event.target.closest('a[data-chat-link]');
      if (
        link &&
        link.hasAttribute('href') &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !event.altKey &&
        event.button === 0
      ) {
        event.preventDefault();
        event.stopPropagation();
        if (Number(link.dataset.chatRevision) !== host.snapshot().revision) {
          stop();
          showDecision();
          showError(
            'اطلاعات کاتالوگ تغییر کرده؛ پیشنهادها به‌روز شدند. دوباره گزینه را انتخاب کن.'
          );
          return;
        }
        destination = link.dataset.chatList || null;
        close();
        host.navigate(link.getAttribute('href'));
      }
    });
    $('chatbotForm').addEventListener('submit', (event) => {
      event.preventDefault();
      send($('chatbotInput').value);
    });
    $('chatbotInput').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        send($('chatbotInput').value);
      }
    });
    $('chatbotInput').addEventListener('input', () => {
      const input = $('chatbotInput');
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 104) + 'px';
    });
    panel.addEventListener('submit', (event) => {
      if (event.target.id === 'chatbotUsageForm') {
        event.preventDefault();
        applyUsage(event.target);
      }
    });
    lastPage = pageKey();
  }
  async function checkStatus() {
    if (statusChecked || window.TOROBAI_CATALOG) return;
    statusChecked = true;
    $('chatbotMode').textContent = 'بررسی دسترسی گفتگوی متنی…';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      let response;
      try {
        response = await fetch('/api/chatbot/status', {
          signal: controller.signal,
          cache: 'no-store'
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) throw new Error();
      enabled = (await response.json()).available === true;
    } catch {
      enabled = false;
      statusChecked = false;
    }
    updateComposer();
  }
  function updateComposer() {
    $('chatbotInput').disabled = !enabled;
    $('chatbotSend').disabled = !enabled || Boolean(pending);
    $('chatbotMode').innerHTML = enabled
      ? 'راهنمای هوشمند · برای خط بعد Shift + Enter'
      : 'گفتگوی متنی در دسترس نیست؛ گزینه‌ها فعال‌اند.' +
        (!window.TOROBAI_CATALOG
          ? ' <button type="button" data-chat-command="retry-status">بررسی دوباره</button>'
          : '');
  }
  function open() {
    if (!host || !panel) return;
    returnFocus = document.activeElement;
    if (!messages.length) showAnswer(C.welcome());
    if (resultRevision !== host.snapshot().revision && Object.keys(needs).length) showDecision();
    contextChanged();
    window.TorobMotion.dialog(panel, true);
    (enabled ? $('chatbotInput') : $('chatbotClose')).focus({ preventScroll: true });
    checkStatus();
    if (window.TOROBAI_CATALOG) updateComposer();
  }
  function close() {
    closeSheet();
    if (panel) window.TorobMotion.dialog(panel, false);
  }
  function clear() {
    stop();
    closeSheet();
    needs = {};
    unresolved = [];
    messages = [];
    lastCards = [];
    lastText = '';
    destination = null;
    $('chatbotLog').replaceChildren();
    $('chatbotLatest').hidden = true;
    $('chatbotInput').value = '';
    $('chatbotPageNotice').hidden = true;
    showAnswer(C.welcome());
  }
  function pageKey() {
    const s = host.snapshot().state;
    return ['api', 'fa', 'gpu', 'saved'].includes(s.path) ? host.listURL(s) : s.path;
  }
  function contextChanged() {
    if (!host || !panel) return;
    const key = pageKey();
    if (key !== lastPage) {
      if (pending) stop(true);
      if (destination && ['api', 'fa', 'gpu', 'saved'].includes(host.snapshot().state.path))
        $('chatbotPageNotice').hidden = key === destination;
      lastPage = key;
    }
  }
  function adoptPage() {
    stop();
    const s = host.snapshot().state;
    const keep = {};
    for (const k of [
      'task',
      'access',
      'query',
      'persian',
      'tools',
      'json',
      'streaming',
      'no_retention',
      'open',
      'ssh',
      'vram',
      'context',
      'usecase',
      'requestMode',
      'rental'
    ])
      if (s[k]) keep[k] = s[k];
    if (s.kind === 'gpu') keep.task = 'gpu';
    if (s.maxCost != null) {
      keep.budget_toman = s.maxCost;
      keep.budget_period =
        s.kind === 'gpu' ? 'rental' : s.access === 'weights' ? 'license' : 'month';
    }
    if (Object.keys(s.usage || {}).length) keep.usage = { ...s.usage };
    keep.priority = s.sort === 'price' ? 'cost' : 'balanced';
    needs = keep;
    destination = host.listURL(s);
    $('chatbotPageNotice').hidden = true;
    append('user', 'ادامه با شرایط صفحه فعلی');
    showDecision();
  }
  function append(role, text, html = '') {
    const log = $('chatbotLog'),
      nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 100;
    const item = document.createElement('article');
    item.className = 'chatbot-message ' + role;
    item.innerHTML = `<span class="chatbot-speaker">${role === 'user' ? 'شما' : 'همراه torobai'}</span><p dir="auto">${esc(text)}</p>${html}`;
    log.append(item);
    messages.push({ role, content: text.slice(0, 2000) });
    // Bound parser context, but keep the visible conversation until the user clears it.
    if (messages.length > 60) messages.shift();
    if (!panel.open) {
      $('chatbotLatest').hidden = messages.length < 2;
      return;
    }
    if (role === 'user' || nearBottom) {
      const lastQuestion = [...log.querySelectorAll('.user')].at(-1);
      const target =
        role === 'assistant' && lastQuestion
          ? lastQuestion.offsetTop - log.offsetTop - 12
          : log.scrollHeight;
      log.scrollTop = Math.max(0, Math.min(target, log.scrollHeight - log.clientHeight));
      $('chatbotLatest').hidden = true;
    } else {
      $('chatbotLatest').hidden = false;
    }
  }
  function showSheet(title, html) {
    if (!$('chatbotSheet').open) sheetFocus = document.activeElement;
    $('chatbotSheetTitle').textContent = title;
    $('chatbotSheetBody').innerHTML = html;
    window.TorobMotion.dialog($('chatbotSheet'), true);
    $('chatbotSheetClose').focus({ preventScroll: true });
  }
  function closeSheet() {
    if ($('chatbotSheet')?.open) window.TorobMotion.dialog($('chatbotSheet'), false);
  }
  function updateChips() {
    const chipHTML = Object.entries(needs)
      .filter(
        ([k, v]) =>
          v != null &&
          v !== false &&
          k !== 'budget_period' &&
          !(k === 'usage' && !Object.keys(v).length)
      )
      .map(([key, value]) => {
        let label = C.labels[key] || key;
        if (key === 'task') label = C.taskNames[value];
        if (key === 'access') label = value === 'api' ? 'API' : 'وزن‌ها';
        if (key === 'query') label = value;
        if (key === 'budget_toman') label = 'تا ' + HB.number(value) + ' تومان';
        if (key === 'priority')
          label = { cost: 'اولویت هزینه', quality: 'بررسی عملکرد', balanced: 'بررسی گزینه‌ها' }[
            value
          ];
        if (key === 'requestMode') label = value === 'batch' ? 'Batch' : 'پاسخ عادی';
        if (key === 'vram') label = HB.number(value) + ' GB در هر کارت';
        if (key === 'context') label = HB.number(value) + ' توکن ظرفیت متن';
        if (key === 'usage') label = 'مصرف تنظیم‌شده';
        if (key === 'rental')
          label = { light: '۸ ساعت', standard: '۲۴ ساعت', heavy: '۷۲ ساعت' }[value];
        return `<button type="button" data-chat-remove="${esc(key)}" aria-label="حذف ${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`;
      })
      .join('');
    const box = $('chatbotNeeds');
    if (box) box.innerHTML = chipHTML;
    const summary = [
      needs.usecase === 'coding' ? 'کدنویسی' : C.taskNames[needs.task],
      needs.task !== 'gpu' && needs.access ? (needs.access === 'api' ? 'API' : 'وزن‌ها') : '',
      needs.budget_toman != null ? 'تا ' + HB.number(needs.budget_toman) + ' تومان' : ''
    ].filter(Boolean);
    $('chatbotContextText').textContent = summary.join(' · ');
    $('chatbotContext').hidden = !summary.length;
    return chipHTML;
  }
  function showAnswer(result) {
    resultRevision = host.snapshot().revision;
    updateChips();
    // Choices live only in the composer; previous recommendations retain their own URLs.
    for (const el of $('chatbotLog').querySelectorAll('button[data-chat-command]'))
      el.disabled = true;
    choices = result.choices || [];
    $('chatbotChoices').innerHTML = choices
      .map((ch, i) => `<button type="button" data-chat-choice="${i}">${esc(ch.label)}</button>`)
      .join('');
    $('chatbotChoices').hidden = !choices.length;
    if (result.matches)
      lastCards = result.matches.map(({ product }) => ({
        id: product.id,
        title: product.title,
        task: product.task
      }));
    const linkData = `data-chat-link data-chat-revision="${resultRevision}" data-chat-list="${esc(result.view ? host.listURL(result.view) : '')}"`;
    const period =
      needs.access === 'weights'
        ? 'هزینه فایل یا مجوز'
        : needs.task === 'gpu'
          ? 'هزینه کل اجاره'
          : 'برآورد ماهانه';
    const cards = (result.matches || [])
      .map(({ product: p, quote: q }) => {
        const view = { ...result.view, provider: q?.seller_id || '' };
        return `<article class="chatbot-card"><a ${linkData} href="${esc(host.productURL(p, view))}">${host.logo(p)}<div class="chatbot-card-name"><h3 dir="auto">${esc(p.title)}</h3><span class="chatbot-seller">${q ? esc(q.seller) : 'شرایط در صفحه مدل'}</span></div><strong class="chatbot-price">${q ? host.money(q.estimate_toman) : 'استعلام'}</strong><span class="chatbot-card-arrow" aria-hidden="true">←</span></a></article>`;
      })
      .join('');
    const basis = (result.matches || [])
      .map(({ product: p }) => {
        const proof = needs.usecase === 'coding' && p.coding_evidence?.[0];
        const usage =
          needs.access !== 'weights' ? host.usageText(p, host.values(p, result.view)) : '';
        return `<li><b dir="auto">${esc(p.title)}</b>${proof ? ' · آزمون منتشرشده: ' + esc(proof.name) : ''}${usage ? '<br>' + esc(usage) : ''}</li>`;
      })
      .join('');
    const unresolvedHTML = unresolved.length
      ? `<div class="chatbot-unresolved"><b>این شروط هنوز تایید نشده‌اند:</b><ul>${unresolved.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><button type="button" data-chat-command="clear-unresolved">این شروط دیگر لازم نیست</button></div>`
      : '';
    const html =
      unresolvedHTML +
      (cards
        ? `<div class="chatbot-results"><div class="chatbot-result-heading"><span>پیشنهادها برای بررسی</span><span>${period} · تومان</span></div><div class="chatbot-cards">${cards}</div><details class="chatbot-basis"><summary>مبنای قیمت و جزئیات پیشنهادها</summary><div class="chatbot-basis-copy"><p>${esc(result.note || '')}</p>${result.assumptions ? `<p>${esc(result.assumptions)}</p>` : ''}<ul>${basis}</ul></div></details></div>`
        : result.note
          ? `<p class="chatbot-note">${esc(result.note)}</p>`
          : '') +
      (result.links?.length
        ? `<div class="chatbot-links">${result.links.map((link) => `<a ${linkData} href="${esc(link.url)}">${esc(link.label)} <span aria-hidden="true">←</span></a>`).join('')}</div>`
        : '');
    append('assistant', result.text, html);
  }
  function showDecision(parsed = { intent: 'find' }) {
    const result = C.decide(needs, parsed, host, HB, unresolved);
    if (result.infer) {
      needs = C.updateNeeds(needs, { set: result.infer });
      return showDecision({ ...parsed, question: null });
    }
    showAnswer(result);
  }
  function choose(ch) {
    if (!ch) return;
    stop();
    if (ch.intent === 'edit') return showEdit();
    if (ch.intent === 'usage') return showUsage();
    closeSheet();
    append('user', ch.label);
    if (ch.compound && needs.budget_toman != null)
      unresolved = [...unresolved, 'بودجه کل سامانه باید جدا از هزینه این بخش بررسی شود.'].slice(
        0,
        4
      );
    needs = C.updateNeeds(needs, ch);
    showDecision({ intent: ch.intent || 'find', help_topic: ch.help_topic });
  }
  function showEdit() {
    stop();
    sheetChoices = [
      { label: 'کاربرد دیگر', intent: 'tasks' },
      { label: 'ارزان‌ترین‌ها', set: { priority: 'cost' } },
      { label: 'بررسی عملکرد', set: { priority: 'quality' } },
      { label: 'تنظیم مصرف و بودجه', intent: 'usage' },
      ...(needs.task !== 'gpu'
        ? [
            { label: 'فراخوانی ابزار', set: { tools: true, access: 'api' } },
            { label: 'خروجی JSON', set: { json: true, access: 'api' } },
            { label: 'پردازش Batch', set: { requestMode: 'batch', access: 'api' } },
            { label: 'بدون نگهداری داده', set: { no_retention: true, access: 'api' } },
            { label: 'دریافت وزن‌ها', set: { access: 'weights' } },
            { label: 'API', set: { access: 'api' } }
          ]
        : [{ label: 'SSH و حداقل ۲۴ GB', set: { ssh: true, vram: 24 } }])
    ];
    showSheet(
      'شرایط انتخاب',
      `<p>هر شرطی را که لازم نداری بردار، یا یک شرط جدید انتخاب کن.</p><div id="chatbotNeeds" class="chatbot-needs">${updateChips()}</div><div class="chatbot-edit-choices">${sheetChoices.map((ch, i) => `<button type="button" data-chat-choice="${i}">${esc(ch.label)}</button>`).join('')}</div>`
    );
  }
  function showUsage() {
    stop();
    if (!needs.task || (needs.task !== 'gpu' && !needs.access)) return showDecision();
    const view = C.toView(needs, HB),
      product = host.snapshot().products.find((p) => p.task === needs.task);
    if (!product) return showDecision();
    const values = host.values(product, view);
    const period =
      needs.task === 'gpu' ? 'rental' : needs.access === 'weights' ? 'license' : 'month';
    const usage =
      needs.access === 'weights'
        ? ''
        : needs.task === 'gpu'
          ? `<label>مدت اجاره<select name="rental">${[
              ['light', '۸ ساعت'],
              ['standard', '۲۴ ساعت'],
              ['heavy', '۷۲ ساعت']
            ]
              .map(
                ([k, t]) =>
                  `<option value="${k}" ${view.rental === k ? 'selected' : ''}>${t}</option>`
              )
              .join('')}</select></label>`
          : host.usageInputs(
              Object.fromEntries((HB.usageFields[product.unit] || []).map((k) => [k, values[k]]))
            );
    showSheet(
      'مصرف و بودجه',
      `<p>قیمت‌ها با همین مصرف محاسبه می‌شوند. خالی گذاشتن بودجه یعنی محدودیتی نداری.</p><form id="chatbotUsageForm" data-period="${period}">${usage}<label>سقف هزینه ${period === 'month' ? 'ماهانه' : period === 'license' ? 'مجوز وزن‌ها' : 'کل اجاره'} (تومان)<input name="budget" inputmode="decimal" value="${needs.budget_toman ?? ''}" placeholder="بدون محدودیت"></label><p id="chatbotUsageError" role="alert" hidden></p><div class="chatbot-sheet-actions"><button type="submit">اعمال و دیدن پیشنهادها</button><button type="button" data-chat-command="close-sheet">انصراف</button></div></form>`
    );
  }

  function applyUsage(form) {
    const usage = {},
      unit = HB.taskUnits[needs.task];
    for (const key of needs.access === 'weights' ? [] : HB.usageFields[unit] || []) {
      const field = form.querySelector(`[name="${key}"]`),
        max = host.fieldInfo[key][1];
      const n = HB.parseNumber(field.value, max, key !== 'minutes');
      if (n == null) {
        $('chatbotUsageError').hidden = false;
        $('chatbotUsageError').textContent = 'مقدار مصرف را به صورت عدد معتبر وارد کن.';
        return;
      }
      usage[key] = n;
    }
    const value = form.querySelector('[name="budget"]').value.trim();
    const budget = value ? HB.parseNumber(value, 1e12, false) : null;
    if (value && budget == null) {
      $('chatbotUsageError').hidden = false;
      $('chatbotUsageError').textContent = 'سقف هزینه را به تومان وارد کن.';
      return;
    }
    stop();
    needs = C.updateNeeds(needs, {
      set: {
        usage,
        ...(needs.task === 'gpu' ? { rental: form.querySelector('[name="rental"]').value } : {}),
        ...(budget != null ? { budget_toman: budget, budget_period: form.dataset.period } : {})
      },
      unset: budget == null ? ['budget_toman', 'budget_period'] : []
    });
    closeSheet();
    const product = host.snapshot().products.find((p) => p.task === needs.task);
    const usageText =
      needs.access === 'weights'
        ? 'مجوز وزن‌ها'
        : host.usageText(product, host.values(product, C.toView(needs, HB)));
    append(
      'user',
      usageText +
        (budget != null ? '؛ سقف هزینه ' + HB.number(budget) + ' تومان.' : '؛ بدون محدودیت بودجه.')
    );
    showDecision();
  }
  function stop(notify = false) {
    ++requestVersion;
    if (panel) $('chatbotError').hidden = true;
    if (pending) {
      pending.abort();
      pending = null;
      if (notify) showError('دریافت پاسخ متوقف شد؛ می‌توانی دوباره تلاش کنی.', true);
    }
    if (panel) {
      $('chatbotPending').hidden = true;
      $('chatbotSend').disabled = !enabled;
    }
  }
  function showError(text, retry = false) {
    $('chatbotError').hidden = false;
    $('chatbotError').innerHTML =
      esc(text) +
      (retry ? '<button type="button" data-chat-command="retry">تلاش دوباره</button>' : '');
  }
  async function send(text, retry = false) {
    text = text.trim();
    if (!text || !enabled || pending) return;
    if (text.length > 2000) return showError('پیام را به کمتر از ۲۰۰۰ نویسه کوتاه کن.');
    stop();
    const serial = requestVersion,
      revision = host.snapshot().revision;
    const controller = new AbortController();
    pending = controller;
    lastText = text;
    const recent = messages.slice(-6);
    if (!retry) append('user', text);
    $('chatbotInput').value = '';
    $('chatbotInput').style.height = '';
    $('chatbotError').hidden = true;
    $('chatbotPending').hidden = false;
    $('chatbotSend').disabled = true;
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('/api/chatbot/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text,
          current: needs,
          recent,
          last_cards: lastCards,
          page: host.snapshot().state.path,
          unresolved
        })
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? 'درخواست‌ها زیاد شده‌اند؛ کمی بعد دوباره تلاش کن.'
            : 'پاسخ متنی آماده نشد. می‌توانی با گزینه‌ها ادامه بدهی.'
        );
      const parsed = await response.json();
      if (serial !== requestVersion) return;
      if (revision !== host.snapshot().revision)
        throw new Error(
          'کاتالوگ تغییر کرده؛ دوباره تلاش کن تا پیشنهادها با اطلاعات جدید ساخته شوند.'
        );
      if (!parsed || !C.fields || !parsed.set || !Array.isArray(parsed.unset))
        throw new Error('پاسخ معتبر دریافت نشد.');
      const reference = parsed.reference ? lastCards[parsed.reference - 1] : null;
      if (parsed.reference && !reference) throw new Error('گزینه قبلی پیدا نشد؛ نام مدل را بنویس.');
      needs = C.updateNeeds(needs, {
        ...parsed,
        set: {
          ...(reference ? { task: reference.task, query: reference.title } : {}),
          ...parsed.set
        }
      });
      unresolved = Array.isArray(parsed.unresolved) ? parsed.unresolved : [];
      if (parsed.question && !unresolved.includes(parsed.question))
        unresolved = [...unresolved, parsed.question].slice(0, 4);
      showDecision(parsed);
    } catch (error) {
      if (serial === requestVersion)
        showError(
          error.name === 'AbortError' ? 'دریافت پاسخ طول کشید؛ دوباره تلاش کن.' : error.message,
          true
        );
    } finally {
      clearTimeout(timer);
      if (serial === requestVersion) {
        pending = null;
        $('chatbotPending').hidden = true;
        $('chatbotSend').disabled = !enabled;
      }
    }
  }
  return { mount, open, contextChanged };
})();
