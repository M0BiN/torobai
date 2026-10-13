'use strict';
const { escape: esc, number: fa, safeURL, parseNumber, rate, filterProducts } = HB;
const portable = Boolean(window.TOROBAI_CATALOG);
const $ = (id) => document.getElementById(id);
const tasks = {
  transcription: 'گفتار به متن',
  translation: 'ترجمه',
  speech: 'متن به گفتار',
  ocr: 'متن از تصویر',
  extraction: 'استخراج اطلاعات',
  classification: 'تحلیل متن',
  chat: 'متن و گفتگو',
  embedding: 'جست‌وجوی معنایی',
  image: 'تولید تصویر',
  decision: 'تصمیم‌گیری',
  gpu: 'پردازنده گرافیکی'
};
const unitLabels = {
  tokens: 'هر میلیون توکن ورودی',
  input_tokens: 'هر میلیون توکن ورودی',
  minute: 'هر دقیقه صوت',
  characters: 'هر میلیون کاراکتر',
  image: 'هر تصویر',
  page: 'هر صفحه',
  request: 'هر درخواست',
  hourly_toman: 'هر ساعت',
  daily_toman: 'هر روز کامل',
  monthly_toman: 'قرارداد ماهانه'
};
const presetNames = { light: 'کم‌مصرف', standard: 'معمول', heavy: 'پرمصرف' };
const fieldInfo = {
  requests_day: ['درخواست در روز', 1000000],
  input_tokens: ['توکن ورودی هر درخواست', 1000000],
  output_tokens: ['توکن خروجی هر درخواست', 1000000],
  monthly_tokens: ['توکن در ماه', 1000000000],
  minutes: ['دقیقه صوت در ماه', 1000000],
  characters: ['کاراکتر در ماه', 1000000000],
  images: ['تصویر در ماه', 1000000],
  pages: ['صفحه در ماه', 1000000],
  monthly_requests: ['درخواست در ماه', 1000000],
  hours: ['ساعت هر نوبت', 744],
  sessions: ['تعداد نوبت', 31]
};
const paths = {
  plus: 'M12 5v14M5 12h14',
  chevron: 'm6 9 6 6 6-6',
  info: 'M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  download: 'M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5',
  translate: 'M3 5h12M9 3v2M5 5c0 7 7 10 7 10M13 5c0 7-8 11-8 11M14 21l4-10 4 10m-7-3h6',
  document: 'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6',
  scan: 'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M7 8h10M7 12h10M7 16h7',
  search: 'M21 21l-5-5 M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  compare: 'M8 3v18M16 3v18M4 7h8M12 17h8M5 12h6M13 8h6',
  arrow: 'M19 12H5m7-7-7 7 7 7',
  external: 'M7 17 19 5M9 5h10v10M5 9v10h10',
  chip: 'M7 7h10v10H7zM9 3v4m6-4v4M9 17v4m6-4v4M3 9h4m-4 6h4m10-6h4m-4 6h4',
  chat: 'M5 4h14v12H9l-4 4V4m4 4h6m-6 4h4',
  mic: 'M9 3h6v11H9zM5 10v3a7 7 0 0 0 14 0v-3M12 20v2',
  image: 'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M15 7h.01',
  layers: 'm3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4',
  decision: 'M5 4h5v5H5zM15 15h5v5h-5zM5 15h5v5H5zM7.5 9v6m0-3H17v3',
  filter: 'M4 7h16M7 12h10M10 17h4',
  check: 'm5 12 4 4L19 6',
  copy: 'M8 8h12v13H8zM16 8V3H3v13h5',
  close: 'm6 6 12 12M6 18 18 6',
  pulse: 'M2 12h4l3-7 5 14 3-7h5'
};
function icon(name, cls = '') {
  return /* HTML */ `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">
    <path d="${paths[name] || paths.layers}" />
  </svg>`;
}
function num(value, places = 0) {
  if(value==null)return '—';
  return /* HTML */ `<bdi class="num">${fa(value, places)}</bdi>`;
}
function money(value) {
  return `<bdi class="num price-number">${fa(value, value < 100 ? 2 : 0)}</bdi> <span class="currency">تومان</span>`;
}
function href(p, view = state) {
  const params = new URLSearchParams();
  if (
    view.provider &&
    [...p.offers, ...(p.weight_offers || [])].some((o) => o.seller_id === view.provider)
  )
    params.set('provider', view.provider);
  if (p.kind === 'gpu' && view.ssh) params.set('ssh', '1');
  if (p.kind === 'gpu' && view.rental && view.rental !== 'standard') params.set('rental', view.rental);
  if (p.kind === 'api' && view.access !== 'weights') for (const key of Object.keys(capabilityLabels)) if(view[key])params.set(key,'1');
  if (p.kind === 'api' && view.persian) params.set('from', 'fa');
  if (view.access === 'weights' && (p.weights_url || p.weight_offers?.length))
    params.set('access', 'weights');
  addUsageParams(params, view);
  return `#${p.kind}/${encodeURIComponent(p.id)}${params.size ? '?' + params : ''}`;
}

function external(url, text, cls = 'text-link') {
  return /* HTML */ `<a
    class="${cls}"
    href="${safeURL(url)}"
    target="_blank"
    rel="noopener noreferrer"
    >${text}${icon('external')}</a
  >`;
}
function asset(path) {
  return esc(window.TOROBAI_ASSETS?.[path] || '/static/' + path);
}
function logo(p, cls = '') {
  return p.logo
    ? `<img class="brand-logo ${cls}" src="${asset('brands/' + p.logo)}" alt="${esc(p.maker || p.name || '')}" loading="lazy">`
    : `<span class="brand-type ${cls}" dir="auto">${esc(p.maker === 'BAAI' ? 'BGE' : p.maker === 'Mapika' ? 'decider' : p.maker === 'Laya' ? 'laya' : (p.title || p.name || p.maker || 'مدل').split(' ')[0])}</span>`;
}
function theme(p) {
  return p.persian_specialist
    ? 'persian ' + p.task
    : p.kind === 'gpu'
      ? 'hardware'
      : p.task === 'decision'
        ? 'decision'
        : p.maker === 'Qwen'
          ? 'qwen'
          : p.maker === 'Google'
            ? 'google'
            : p.maker === 'DeepSeek'
              ? 'deepseek'
              : p.maker === 'Mistral'
                ? 'mistral'
                : p.task === 'image'
                  ? 'image'
                  : p.task === 'transcription' || p.task === 'speech'
                    ? 'audio'
                    : 'neutral';
}
function stage(p, large = false) {
  const graphic =
    p.kind === 'gpu'
      ? `<div class="gpu-board"><i></i><i></i><i></i><div class="gpu-core">${logo(p)}<span>${esc(p.title.replace('NVIDIA ', ''))}</span></div><div class="board-contacts"></div></div>`
      : `<div class="stage-orbit"></div><div class="stage-mark">${logo(p)}</div><span class="stage-spark spark-one">✳</span><span class="stage-spark spark-two">+</span>`;
  return /* HTML */ `<div class="product-stage ${theme(p)} ${large ? 'large' : ''}">
    <span class="stage-caption" dir="ltr"
      >${esc(p.kind === 'gpu' ? 'COMPUTE / NVIDIA' : p.task === 'decision' ? 'INPUT → DECISION' : p.persian_specialist ? 'فارسی / ' + tasks[p.task] : p.open_weights ? 'OPEN WEIGHTS' : 'MODEL / API')}</span
    >${graphic}<span class="stage-corner"
      >${p.kind === 'gpu' && p.vram ? num(p.vram) + ' GB' : icon(p.task === 'decision' ? 'decision' : p.task === 'image' ? 'image' : p.task === 'transcription' ? 'mic' : 'layers')}</span
    >
  </div>`;
}
let catalog,
  products = [],
  saved = [],
  comparison = [],
  recent = [],
  state = {},
  selected = null,
  activeEstimate = null;
let purchaseMode = 'api';
let activePreset = 'standard',
  catalogURL = '#api',
  version = 0,
  sellerSort = 'cost',
  sshOnly = false;
const estimateCache = new Map();
const pendingEstimates = new Map();
let storage;
let pendingNavigation = '';
try {
  storage = window.localStorage;
} catch {
  storage = null;
}
function persist() {
  let stored = true;
  try {
    if (!storage) throw new Error('Storage unavailable');
    storage.setItem('hb.saved', JSON.stringify(saved));
    storage.setItem('hb.compare', JSON.stringify(comparison));
    storage.setItem('torobai.recent', JSON.stringify(recent));
  } catch {
    stored = false;
  }
  $('savedCount').textContent = fa(saved.length);
  return stored;
}
function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($('toast').hidden = true), 3500);
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('کپی شد.');
  } catch {
    showDialog(
      'کپی متن',
      `<textarea readonly rows="6" aria-label="متن برای کپی">${esc(text)}</textarea>`
    );
  }
}
function shareText() {
  if (!portable)
    return selected
      ? new URL(href(selected, { ...state, ssh: sshOnly, access: purchaseMode }), location.href)
          .href
      : location.href;
  const p = selected;
  if (!p) return 'torobai — مقایسه مدل‌ها، API و GPU';
  const parts = ['torobai · ' + p.title, p.description, 'شناسه مدل: ' + (p.model_id || p.id)];
  const w = purchaseMode === 'weights' ? weightQuote(p).best : null;
  const best = activeEstimate?.offers.find(
    (o) =>
      o.estimate_toman != null &&
      (!selectedProvider() || o.seller_id === selectedProvider()) &&
      (!sshOnly || o.ssh === true)
  );
  if (w) parts.push('فایل مدل: ' + fa(w.estimate_toman) + ' تومان · ' + w.seller);
  else if (purchaseMode === 'api' && best)
    parts.push(
      'هزینه مصرف: ' + fa(best.estimate_toman) + ' تومان · ' + best.seller,
      'مبنای محاسبه: ' + usageText(p, activeEstimate.assumptions)
    );
  if (p.spec_source) parts.push('مشخصات مدل: ' + p.spec_source);
  return parts.join('\n');
}
function showDialog(title, body) {
  $('dialogBody').innerHTML = /* HTML */ `<h2 id="dialogTitle">${title}</h2>
    ${body}`;
  window.TorobMotion.dialog($('infoDialog'), true);
}
function closeDialog() { window.TorobMotion.dialog($('infoDialog'), false); }
function readState(hash = location.hash) {
  const view = HB.routeState(hash);
  if (!new URLSearchParams(hash.split('?')[1] || '').has('size')) {
    try { const n = Number(storage?.getItem('torobai.page-size')); if ([20,40,60].includes(n)) view.size=n; } catch {}
  }
  return view;
}
function filterURL(updates = {}) {
  return catalogFilterURL({ ...state, page: 1, ...updates });
}
function catalogFilterURL(s) {
  const params = new URLSearchParams();
  for (const key of [
    'task',
    'access',
    'publisher',
    'q',
    'maker',
    'provider',
    'open',
    'multiple',
    'priced',
    'ssh',
    'vram',
    'context',
    'json', 'tools', 'streaming', 'no_retention',
    'usecase', 'sort'
  ]) {
    const value = key === 'q' ? s.query : s[key];
    if (value && !(key === 'sort' && value === 'selected'))
      params.set(key, value === true ? '1' : value);
  }
  if (s.maxCost != null) params.set('max_cost', s.maxCost);
  if (s.rental && s.rental !== 'standard' && s.kind === 'gpu') params.set('rental', s.rental);
  if (s.page > 1) params.set('page', s.page);
  if (s.size && s.size !== 20) params.set('size', s.size);
  addUsageParams(params, s);
  return `#${s.saved ? 'saved' : s.persian && s.kind === 'api' ? 'fa' : s.kind}${params.size ? '?' + params : ''}`;
}
function addUsageParams(params, view) {
  if (view.requestMode === 'batch' && view.kind !== 'gpu' && view.access !== 'weights') params.set('mode', 'batch');
  if (view.usageUnit && Object.keys(view.usage || {}).length) {
    params.set('usage_unit', view.usageUnit);
    for (const [key, value] of Object.entries(view.usage)) params.set(key, value);
  }
}
function navigateFilters(updates) {
  return navigate(filterURL(updates));
}

function navigate(url) {
  // Re-selecting the active result page must not interrupt its smooth scroll.
  if (!pendingNavigation && ['api', 'fa', 'gpu', 'saved'].includes(state.path) &&
      url === filterURL({ page: state.page })) return;
  return route({ url, writeHistory: true });
}

function setNavigationBusy(busy) {
  $('navigationStatus').hidden = !busy;
  $('main').classList.toggle('is-navigating', busy);
  $('main').setAttribute('aria-busy', String(busy));
  // Keep navigation controls available: a newer choice must win immediately.
  document.querySelectorAll('.product-grid, .catalog-price-overview, #featuredOffer, #offerList')
    .forEach((node) => node.toggleAttribute('inert', busy));
}

function cancelNavigation() {
  if (!pendingNavigation) return;
  ++version;
  pendingNavigation = '';
  setNavigationBusy(false);
}

function restoreViewport(x, y) {
  const main = $('main');
  main.style.minHeight = '';
  const deficit = y + (window.innerHeight || 0) - document.documentElement.scrollHeight;
  if (deficit > 0) main.style.minHeight = Math.ceil(main.getBoundingClientRect().height + deficit) + 'px';
  window.scrollTo({ left: x, top: y, behavior: 'instant' });
}

function scrollToFirstResult() {
  const first = document.querySelector('#catalogResults .product-grid > .product-card') || $('catalogResults');
  if (!first) return;
  const header = document.querySelector('.site-header');
  const headerHeight = header && window.getComputedStyle?.(header).position === 'sticky'
    ? header.getBoundingClientRect().height : 0;
  const top = Math.max(0, first.getBoundingClientRect().top + (window.scrollY || 0) - headerHeight - 16);
  (first.querySelector('h2 a') || $('catalogResults')).focus({ preventScroll: true });
  window.scrollTo({ left: window.scrollX || 0, top,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

function restoreNavigationFocus(focused) {
  if (!focused || focused === document.body) return;
  if (focused.isConnected) return;
  const controls = [...$('main').querySelectorAll('a, button, input, select')];
  const replacement = focused.id ? $(focused.id) : controls.find((node) =>
    (focused.dataset.page && node.dataset.page === focused.dataset.page) ||
    (focused.getAttribute('href') && node.getAttribute('href') === focused.getAttribute('href')) ||
    ['data-bench-pick', 'data-bench-remove', 'data-bench-add', 'data-bench-chart', 'data-sort', 'data-toggle-filter', 'data-access-filter', 'data-remove-filter', 'name'].some((key) =>
      focused.hasAttribute(key) && node.getAttribute(key) === focused.getAttribute(key)));
  (replacement || $('catalogResults') || $('productTitle') || $('main')).focus({ preventScroll: true });
}

function toggleSave(id) {
  saved = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
  const stored = persist();
  document.querySelectorAll(`[data-save="${id}"]`).forEach((b) => {
    b.classList.toggle('is-saved', saved.includes(id));
    b.setAttribute('aria-pressed', String(saved.includes(id)));
  });
  if (state.saved) renderCatalog();
  toast(
    !stored
      ? 'تغییر فقط در همین صفحه نگه داشته شد؛ ذخیره مرورگر در دسترس نیست.'
      : saved.includes(id)
        ? 'در نشان‌شده‌های این مرورگر ذخیره شد.'
        : 'از نشان‌شده‌ها حذف شد.'
  );
}
function toggleCompare(id) {
  if (comparison.includes(id)) comparison = comparison.filter((x) => x !== id);
  else if (comparison.length < 3) comparison.push(id);
  else {
    toast('حداکثر سه محصول را مقایسه کنید؛ یکی را حذف کنید.');
    return;
  }
  if (!persist()) toast('مقایسه فقط در همین صفحه نگه داشته می‌شود؛ ذخیره مرورگر در دسترس نیست.');
  renderTray();
  document
    .querySelectorAll('[data-compare]')
    .forEach((b) => b.setAttribute('aria-pressed', String(comparison.includes(b.dataset.compare))));
  if (state.path === 'compare') renderComparison();
}
function comparisonURL() {
  const params = new URLSearchParams();
  addUsageParams(params, state);
  return '#compare' + (params.size ? '?' + params : '');
}
function renderTray() {
  const rows = comparison.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  $('compareTray').hidden = !rows.length || state.path === 'compare';
  $('compareTray').innerHTML = /* HTML */ `<div>
      <strong>مقایسه شما</strong><span>${num(rows.length)} از ${num(3)}</span>
    </div>
    <div class="tray-items">
      ${rows.map((p) => `<span>${logo(p)}<bdi>${esc(p.title)}</bdi><button data-compare="${p.id}" aria-label="حذف ${esc(p.title)}">×</button></span>`).join('')}
    </div>
    <a class="button primary" href="${comparisonURL()}">مقایسه ${icon('arrow')}</a>`;
}
function saveButton(p) {
  return /* HTML */ `<button
    class="icon-button save ${saved.includes(p.id) ? 'is-saved' : ''}"
    data-save="${p.id}"
    aria-label="نشان کردن ${esc(p.title)}"
    aria-pressed="${saved.includes(p.id)}"
  >
    ${icon('heart')}
  </button>`;
}
function compareButton(p) {
  return /* HTML */ `<button
    class="compare-button"
    data-compare="${p.id}"
    aria-pressed="${comparison.includes(p.id)}"
  >
    ${icon('compare')} مقایسه
  </button>`;
}
function priceLabel(p, r) {
  return unitLabels[r?.key] || unitLabels[p.unit] || 'با استعلام';
}
function sellerStack(p) {
  const ids = new Set();
  const sellers = (p.offers || []).filter((o) => !ids.has(o.seller_id) && ids.add(o.seller_id));
  const marks = sellers.filter((o) => o.seller_info?.logo).slice(0, 3);
  return `${marks.length ? `<span class="seller-stack" aria-hidden="true">${marks.map((o) => logo({ ...o.seller_info, name: o.seller })).join('')}</span>` : ''}<span>${sellers.length ? num(sellers.length) + ' ارائه‌دهنده' : 'دریافت مستقیم مدل'}</span>`;
}
function card(p, view = state) {
  const weights =
    (view.access === 'weights' && Boolean(p.weights_url || p.weight_offers?.length)) ||
    (!p.offers.length && (p.weight_offers?.length || p.weights_url));
  const quote = weights ? weightQuote(p) : catalogQuote(p, view);
  const r = !weights && quote.best ? rate(p, [{...quote.best, ...quote.best.effective_rates}]) : null;
  const total = !weights && quote.best;
  const amount = weights
    ? quote.best?.estimate_toman
    : total
      ? quote.best.estimate_toman
      : null;
  const label = weights
    ? p.weight_offers?.length
      ? 'خرید یک‌باره مجوز وزن‌ها'
      : 'طبق مجوز سازنده'
    : total
      ? p.kind === 'gpu'
        ? 'برای ۲۴ ساعت اجاره'
        : p.unit === 'tokens' ? 'هزینه مصرف انتخابی · ۳۰ روز' : usageText(p, catalogValues(p, view))
      : priceLabel(p, r);
  return `<article class="product-card" data-product-id="${p.id}">
    <div class="card-visual"><a href="${href(p, view)}" tabindex="-1" aria-hidden="true">${stage(p)}</a>${saveButton(p)}${p.persian_specialist ? '<span class="weight-tag">ویژه فارسی</span>' : p.open_weights ? '<span class="weight-tag">قابل دانلود</span>' : ''}</div>
    <div class="card-body"><div class="card-meta"><span>${tasks[p.task]}</span><bdi>${p.publisher_type ? (p.publisher_type === 'person' ? 'سازنده مستقل' : 'گروه و شرکت') : esc(p.maker)}</bdi></div>
    <h2><a href="${href(p, view)}" dir="auto">${esc(p.title)}</a></h2><p class="card-description">${esc(p.description)}</p>
    <div class="card-specs">${p.persian_specialist ? `<span>${esc(p.capability.language_detail)}</span>` : p.vram ? `<span>${num(p.vram)} گیگابایت / کارت</span>` : p.context ? `<span>ظرفیت متن <bdi>${Math.round(p.context / 1024)}K</bdi></span>` : ''}${p.license?.includes('NC') ? '<span class=restricted-license>مجوز غیرتجاری</span>' : ''}${p.kind === 'api' && p.offers.some(o=>o.batch?.supported) ? '<span class="batch-tag">Batch</span>' : ''}<span>${p.kind === 'gpu' ? 'اجاره سرور' : p.offers.length ? 'API' : ''}${p.offers.length && (p.weight_offers?.length || p.weights_url) ? ' + ' : ''}${p.weight_offers?.length ? 'خرید وزن‌ها' : p.weights_url ? 'دریافت وزن‌ها' : !p.offers.length ? esc(p.tags[0] || '') : ''}</span></div>
    <a class="card-price" href="${href(p, view)}">${amount != null ? `<small>${weights ? esc(p.maker) : 'از ' + esc(quote.best?.seller || r.offer.seller)}</small><strong>${weights && amount === 0 ? 'رایگان' : money(amount)}</strong><span>${label}</span>${!weights && p.unit === 'tokens' && r ? `<small class="card-output">ورودی ${money(r.value)} · خروجی ${money(r.offer.toman_output_m)}<br>هر میلیون توکن${view.requestMode === 'batch' ? ' · Batch' : ''}</small>` : ''}` : '<strong class="no-price">استعلام قیمت</strong><span>مشاهده شرایط عرضه</span>'}</a>
    ${p.offers.length && !weights ? `<button class="card-uptime" data-uptime-product="${p.id}">${uptimeMini(quote.best || p.offers[0])} پایداری <b>${uptimeValue(quote.best || p.offers[0])==null?'ثبت نشده':num(uptimeValue(quote.best || p.offers[0]), 2)+'٪'}</b><span>۳۰ روز ${icon('arrow')}</span></button>` : '<div class="local-execution">' + icon('chip') + ' اجرای مدل روی زیرساخت شما</div>'}
    <div class="card-bottom"><a class="card-sellers" href="${href(p, view)}">${weights ? 'مشاهده مجوز و شرایط دریافت' : sellerStack(p)} ${icon('arrow')}</a>${compareButton(p)}</div>
    </div></article>`;
}

function activeFilters() {
  const labels = {
    task: tasks[state.task],
    access: state.access === 'weights' ? 'اجرا با فایل مدل' : 'آنلاین با API',
    publisher: state.publisher === 'person' ? 'سازنده مستقل' : 'گروه و شرکت',
    maker: state.maker,
    provider: allSellers().find((x) => x.id === state.provider)?.name,
    open: 'وزن‌های منتشرشده',
    multiple: 'چند ارائه‌دهنده',
    priced: 'قیمت مشخص',
    ssh: 'دسترسی SSH',
    vram: 'حافظه ' + fa(state.vram) + '+ GB',
    context: 'ظرفیت متن ' + fa(state.context / 1000) + 'K+',
    query: state.query,
    usecase: state.usecase === 'coding' ? 'آزمون کدنویسی منتشرشده' : '',
    maxCost: state.maxCost != null ? 'تا ' + fa(state.maxCost) + ' تومان برای مصرف انتخابی' : '',
    requestMode: state.requestMode === 'batch' && state.access !== 'weights' ? 'درخواست دسته‌ای (Batch)' : ''
    ,...Object.fromEntries(Object.entries(capabilityLabels).map(([key,label])=>[key,state.access!=='weights'&&state[key]?label:'']))
  };
  return Object.entries(labels).filter(([key, text]) => (key === 'maxCost' ? state[key] != null : state[key]) && text);
}
function filterToggle(key, title) {
  return `<button class="filter-pill ${state[key] ? 'is-active' : ''}" data-toggle-filter="${key}" aria-pressed="${Boolean(state[key])}">${state[key] ? icon('check') : ''}${title}</button>`;
}
function appliedFilters() {
  const active = activeFilters();
  return active.length
    ? `<div class="active-filters">${active.map(([key, text]) => `<button data-remove-filter="${key}" aria-label="حذف فیلتر ${esc(text)}">${esc(text)} ${icon('close')}</button>`).join('')}<button class="clear-all" data-action="reset">حذف فیلترها</button></div>`
    : '';
}
function filters() {
  const active = activeFilters();
  return `<section class="filter-bar" aria-label="فیلتر محصولات"><div class="filter-shortcuts">${state.kind === 'gpu' ? filterToggle('ssh', 'دسترسی SSH') : filterToggle('open', 'وزن‌های منتشرشده')}${filterToggle('priced', 'قیمت مشخص')}<button class="filter-open" data-action="filters">${icon('filter')} فیلترها ${active.length ? `<b class="num">${fa(active.length)}</b>` : ''}</button></div></section>`;
}

function openFilters() {
  const pool = products.filter(
    (p) => p.kind === state.kind && (!state.persian || p.persian_specialist)
  );
  const makers = [...new Set(pool.map((p) => p.maker))];
  const providers = allSellers().filter((seller) =>
    pool.some((p) =>
      [...p.offers, ...(p.weight_offers || [])].some((o) => o.seller_id === seller.id)
    )
  );
  const check = (key, text) =>
    `<label class="filter-choice"><span>${text}</span><input type="checkbox" name="${key}" ${state[key] ? 'checked' : ''}></label>`;
  showDialog(
    'فیلتر محصولات',
    `<form id="filterForm" class="filter-form"><p>محصولات را بر اساس نیازتان فیلتر کنید.</p>
    <label>حداکثر هزینه برای ${state.access === 'weights' ? 'مجوز وزن‌ها' : state.kind === 'gpu' ? 'مدت اجاره انتخابی' : 'مصرف ماهانه انتخابی'} (تومان)<input name="maxCost" inputmode="decimal" value="${state.maxCost == null ? '' : esc(state.maxCost)}" placeholder="بدون سقف هزینه"></label>
    ${state.kind === 'api' && (!state.task || state.task === 'chat') ? `<label>ارزیابی کدنویسی<select name="usecase"><option value="">همه مدل‌ها</option value="coding" ${state.usecase === 'coding' ? 'selected' : ''}>دارای آزمون کدنویسی منتشرشده</option></select></label>` : ''}
    ${!state.task && state.kind === 'api' ? `<label>کاربرد برای مقایسه هزینه<select name="task"><option value="">انتخاب کاربرد</option>${taskChoices().map(([key,title])=>`<option value="${key}">${title}</option>`).join('')}</select></label>` : ''}
    <p id="filterError" class="form-error" role="alert" hidden></p>
    <div class="filter-form-grid"><label>سازنده<select name="maker"><option value="">همه سازنده‌ها</option>${makers.map((m) => `<option value="${esc(m)}" ${state.maker === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
    <label>ارائه‌دهنده<select name="provider"><option value="">همه ارائه‌دهندگان</option>${providers.map((v) => `<option value="${v.id}" ${state.provider === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>
    ${state.kind === 'api' && (!state.task || ['chat', 'embedding', 'decision'].includes(state.task)) ? `<label>ظرفیت متن (توکن)<select name="context">${[0, 32000, 128000, 256000].map((n) => `<option value="${n}" ${state.context === n ? 'selected' : ''}>${n ? fa(n / 1000) + ' هزار توکن' : 'بدون محدودیت'}</option>`).join('')}</select></label>` : state.kind === 'gpu' ? `<label>حافظه هر کارت<select name="vram">${[0, 16, 24, 32, 80].map((n) => `<option value="${n}" ${state.vram === n ? 'selected' : ''}>${n ? fa(n) + ' گیگابایت و بیشتر' : 'بدون محدودیت'}</option>`).join('')}</select></label>` : ''}</div>
    ${state.kind === 'api' ? `<label>نوع سازنده<select name="publisher"><option value="">همه سازنده‌ها</option><option value="person" ${state.publisher === 'person' ? 'selected' : ''}>شخص / توسعه‌دهنده مستقل</option><option value="company" ${state.publisher === 'company' ? 'selected' : ''}>گروه / شرکت</option></select></label>` : ''}<div class="filter-choices">${state.kind === 'api' ? check('open', 'وزن‌های منتشرشده') : check('ssh', 'دسترسی مستقیم SSH')}${state.access !== 'weights' ? check('multiple', state.kind === 'gpu' ? 'چند ارائه‌دهنده اجاره' : 'چند ارائه‌دهنده API') : ''}${check('priced', 'قیمت قابل محاسبه')}</div>
    ${state.kind==='api'&&state.access!=='weights'?'<h3>قابلیت‌های API در همین ارائه‌دهنده</h3>'+capabilityChecks():''}<div class="filter-actions"><button type="submit" class="button primary">نمایش نتایج ${icon('arrow')}</button><button type="button" class="button secondary" data-action="close-dialog">انصراف</button></div>
  </form>`
  );
}
function allSellers() {
  return [
    ...new Map(
      products
        .flatMap((p) => [...p.offers, ...(p.weight_offers || [])])
        .map((o) => [o.seller_id, { id: o.seller_id, ...o.seller_info }])
    ).values()
  ];
}
function renderProviders() {
  const sellers = allSellers().filter(s => searchMatches(s.name, state.query) &&
    (!state.service || sellerProducts(s.id).some(p => sellerHasService(p, s.id, state.service))));
  $('main').innerHTML =
    `<section class="catalog-heading"><div><p class="breadcrumb">torobai / ارائه‌دهندگان</p><h1>ارائه‌دهندگان</h1><p>محصول‌ها، تعرفه‌ها و شرایط هر عرضه‌کننده را یک‌جا ببینید.</p></div><span class="heading-stamp">${num(sellers.length)} ارائه‌دهنده</span></section>
    ${providerSearch('#providers', 'نام ارائه‌دهنده را جستجو کنید')}
    <div class="provider-grid">${sellers
      .map((seller) => {
        const covered = products.filter((p) =>
          [...p.offers, ...(p.weight_offers || [])].some((o) => o.seller_id === seller.id)
        );
        return `<article class="provider-card"><div class="provider-card-head">${logo(seller)}<div><h2 dir="auto"><a href="#providers/${seller.id}">${esc(seller.name)}</a></h2><span>${sellerServices(seller.id).join(' · ')}</span></div></div><div class="provider-facts"><span><b>${num(covered.length)}</b> محصول</span><span><b>${seller.min_credit_toman != null ? money(seller.min_credit_toman) : 'با استعلام'}</b> حداقل اعتبار API / اجاره</span></div><div class="provider-links"><a class="button primary" href="#providers/${seller.id}">محصول‌ها و شرایط ${icon('arrow')}</a>${seller.site ? external(seller.site, 'وب‌سایت') : ''}</div></article>`;
      })
      .join('')}</div>${!sellers.length ? '<div class="empty-state"><h2>ارائه‌دهنده‌ای پیدا نشد</h2><a class="button secondary" href="#providers">حذف فیلترها</a></div>' : ''}`;
  document.title = 'ارائه‌دهندگان | torobai';
}
function rememberProduct(id) {
  recent = [id, ...recent.filter((x) => x !== id)].slice(0, 12);
  persist();
}
function recentSection() {
  const rows = recent
    .slice(0, 4)
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);
  return rows.length
    ? `<section class="recent-section"><div class="section-heading"><h2>آخرین بازدیدهای شما</h2><a class="text-link" href="#recent">همه بازدیدها ${icon('arrow')}</a></div><div class="related-grid">${rows.map((p) => card(p)).join('')}</div></section>`
    : '';
}
function renderRecent() {
  const rows = recent.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  $('main').innerHTML =
    `<section class="catalog-heading"><div><p class="breadcrumb">torobai / بازدیدهای اخیر</p><h1>بازدیدهای اخیر</h1><p>محصول‌هایی که در این مرورگر دیده‌اید، به ترتیب آخرین بازدید.</p></div>${rows.length ? '<button class="button secondary" data-action="clear-recent">پاک کردن سابقه</button>' : ''}</section>${rows.length ? `<div class="product-grid">${rows.map((p) => card(p)).join('')}</div>` : '<div class="empty-state"><h2>هنوز محصولی ندیده‌اید</h2><a class="button primary" href="#api">دیدن مدل‌ها</a></div>'}`;
  document.title = 'بازدیدهای اخیر | torobai';
}
function reliabilityReport(p, offer) {
  if (offer.seller_id !== 'one' || offer.pricing_basis === 'planning_catalog') return null;
  const group = {
    OpenAI: 'openai',
    Anthropic: 'anthropic',
    Google: 'gemini',
    DeepSeek: 'deepseek'
  }[p.maker];
  return group ? catalog.reliability?.groups[group] : null;
}
function uptimeDate(value) {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(value + 'T12:00:00Z'));
}
function uptimeLevel(percent) {
  return percent === 100 ? 'full' : percent >= 99.5 ? 'high' : percent >= 98 ? 'fair' : 'low';
}
function uptimeSquares(o) {
  const report = catalog.presentation_reliability.offers[o.id];
  if(!report)return '<p class="small">سابقه پایداری برای این پیشنهاد ثبت نشده است.</p>';
  const days = report.daily;
  const labels = days.map((day) => `${uptimeDate(day.date)} · دسترس‌پذیری ${fa(day.percent, 2)}٪`);
  return `<div class="uptime-history" data-history-offer="${o.id}">
    <div class="uptime-calendar" dir="ltr" role="img" aria-label="پایداری روزانه ${esc(o.seller)}؛ میانگین ${fa(report.percent, 2)} درصد در ۳۰ روز؛ جزئیات متنی در ادامه">
      ${days.map((day, i) => `<span class="uptime-day uptime-${uptimeLevel(day.percent)}" data-date="${day.date}" data-percent="${day.percent}" data-tooltip="${esc(labels[i])}" aria-hidden="true"></span>`).join('')}
    </div>
    <div class="uptime-calendar-dates" dir="ltr"><time datetime="${days[0].date}" dir="rtl">${uptimeDate(days[0].date)}</time><span dir="rtl">هر مربع، یک روز</span><time datetime="${days.at(-1).date}" dir="rtl">${uptimeDate(days.at(-1).date)}</time></div>
    <details class="uptime-day-details"><summary>جزئیات روزها ${icon('arrow')}</summary><div class="uptime-day-list">${days.map((day) => `<div><time datetime="${day.date}">${uptimeDate(day.date)}</time><span class="uptime-day uptime-${uptimeLevel(day.percent)}" aria-hidden="true"></span><bdi>${fa(day.percent, 2)}٪</bdi></div>`).join('')}</div></details>
  </div>`;
}
function uptimeSection(p, id = '') {
  const offers = [...new Map(p.offers.map((o) => [o.seller_id, o])).values()];
  return `<section ${id ? `id="${id}"` : ''} class="uptime-section"><div class="section-heading"><div><span class="section-kicker">وضعیت دسترسی به سرویس</span><h2>پایداری سرویس</h2></div><span class="uptime-badge">${icon('pulse')} بازه ۳۰ روزه</span></div>
  <p class="uptime-intro">${p.kind === 'gpu' ? 'پایداری زیرساخت GPU؛ موجودی و کیفیت اجرای کار را جداگانه بررسی کنید.' : 'پایداری دسترسی به API این مدل؛ کیفیت پاسخ مدل جداگانه بررسی می‌شود.'}</p>
  ${offers.length ? `<div class="uptime-legend" aria-label="راهنمای رنگ مربع‌ها"><span><i class="uptime-full"></i>۱۰۰٪</span><span><i class="uptime-high"></i>۹۹٫۵ تا کمتر از ۱۰۰٪</span><span><i class="uptime-fair"></i>۹۸ تا کمتر از ۹۹٫۵٪</span><span><i class="uptime-low"></i>کمتر از ۹۸٪</span></div><div class="uptime-rows">${offers.map((o) => `<div class="uptime-row has-report"><div class="uptime-identity">${logo({ ...o.seller_info, name: o.seller })}<div><strong>${esc(o.seller)}</strong><small>${p.kind === 'gpu' ? 'زیرساخت GPU' : 'API همین مدل'}</small></div></div><div class="uptime-measure"><strong>${num(uptimeValue(o), 2)}<small>٪</small></strong><span>دسترس‌پذیری سرویس در ۳۰ روز</span></div>${uptimeSquares(o)}${o.seller_info.status_url ? `<div class="uptime-source">${external(o.seller_info.status_url, 'صفحه وضعیت ارائه‌دهنده')}</div>` : ''}</div>`).join('')}</div>` : '<div class="uptime-selfhost"><strong>اجرای محلی، بدون وابستگی به API</strong><p>وزن‌های مدل روی زیرساخت شما اجرا می‌شوند. پایداری به سرور و نحوه استقرار بستگی دارد.</p><a class="text-link" href="#gpu">انتخاب GPU</a></div>'}</section>`;
}

function collections() {
  return `<section class="seller-invitation"><div>${icon('layers')}<div><h2>مدل فارسی ساخته‌اید؟</h2><p>برای عرضه API یا فایل مدل، مشخصات و شرایط استفاده را ثبت کنید.</p></div></div><a class="button secondary" href="#publish">معرفی مدل ${icon('arrow')}</a></section>`;
}
function taskIcon(task) {
  return (
    {
      transcription: 'mic',
      speech: 'mic',
      translation: 'translate',
      ocr: 'scan',
      extraction: 'document',
      classification: 'decision',
      embedding: 'search',
      chat: 'chat',
      image: 'image',
      decision: 'decision'
    }[task] || 'layers'
  );
}
function taskChoices() {
  const pool = state.saved
    ? filterProducts(products, { saved: true }, saved)
    : filterProducts(products, {
        kind: state.kind,
        persian: state.persian,
        access: state.access
      });
  const order = state.persian
    ? [
        'transcription',
        'translation',
        'speech',
        'ocr',
        'extraction',
        'classification',
        'embedding',
        'chat',
        'image',
        'decision'
      ]
    : [
        'chat',
        'embedding',
        'image',
        'transcription',
        'speech',
        'decision',
        'translation',
        'ocr',
        'extraction',
        'classification'
      ];
  if (state.saved) order.push('gpu');
  return order
    .filter((k) => pool.some((p) => p.task === k) || state.task === k)
    .map((k) => [k, tasks[k]]);
}
function categorySelector() {
  if (state.kind !== 'api' || state.saved) return '';
  return `<section class="category-section" aria-label="انتخاب کاربرد"><nav class="category-tabs" tabindex="0" aria-label="دسته‌بندی مدل‌ها؛ برای دیدن همه گزینه‌ها افقی پیمایش کنید"><a href="${esc(filterURL({ task: '', sort: 'selected' }))}" ${!state.task ? 'aria-current="page"' : ''}>${icon('layers')}<span>همه مدل‌ها</span></a>${taskChoices()
    .map(
      ([key, title]) =>
        `<a href="${esc(filterURL({ task: key, usecase: key === 'chat' ? state.usecase : '', context: ['chat', 'embedding', 'decision'].includes(key) ? state.context : 0 }))}" ${state.task === key ? 'aria-current="page"' : ''}>${icon(taskIcon(key))}<span>${title}</span></a>`
    )
    .join('')}</nav></section>`;
}
function choosePriceTask(sort) {
  showDialog(
    'قیمت کدام کاربرد را مقایسه می‌کنید؟',
    `<p class="dialog-intro">${state.access === 'weights' ? 'فایل مدل را برای چه کاری می‌خواهید؟ قیمت مجوز مدل‌های همین کاربرد را کنار هم ببینید.' : 'تعرفه صوت، متن و تصویر واحدهای متفاوتی دارند. ابتدا کاربرد را انتخاب کنید؛ قیمت‌ها با مصرف یکسان مقایسه می‌شوند.'}</p><div class="task-picker">${taskChoices()
      .map(
        ([key, title]) =>
          `<a href="${esc(filterURL({ task: key, sort }))}">${icon(taskIcon(key))}<span>${title}</span>${icon('arrow')}</a>`
      )
      .join('')}</div>`
  );
}

function isPriceSort(view = state) {
  return ['price', 'price-desc'].includes(view.sort);
}
function catalogRows(view = state) {
  const estimates = Object.fromEntries(products.map(p => [p.id, {standard: catalogEstimate(p, view)}]));
  return filterProducts(products, view, saved, estimates).filter(p => {
    if (view.maxCost == null) return true;
    const price = catalogQuote(p, view).best?.estimate_toman;
    return price != null && HB.comparePrices(price, view.maxCost) <= 0;
  });
}
function catalogQuote(p, view = state) {
  if (view.access === 'weights' && p.kind === 'api' && (p.weights_url || p.weight_offers?.length))
    return weightQuote(p, view);
  const ids = new Set(
    p.offers
      .filter(
        (o) => (!view.provider || o.seller_id === view.provider) && (!view.ssh || o.ssh === true) && HB.offerMatches(o,view) && (view.requestMode !== 'batch' || o.batch?.supported === true)
      )
      .map((o) => o.id)
  );
  const rows = (catalogEstimate(p, view)?.offers || [])
    .filter((o) => ids.has(o.id) && o.estimate_toman != null)
    .sort((a, b) => HB.comparePrices(a.estimate_toman, b.estimate_toman));
  return { best: rows[0] || null, max: rows.at(-1)?.estimate_toman ?? null };
}
function usageText(p, values = catalogValues(p)) {
  if (p.kind === 'gpu') return `${fa(values.hours)} ساعت × ${fa(values.sessions)} نوبت`;
  if (p.unit === 'tokens')
    return `روزانه ${fa(values.requests_day)} درخواست · هر درخواست ${fa(values.input_tokens)} توکن ورودی و ${fa(values.output_tokens)} توکن خروجی${values.request_mode === 'batch' ? ' · Batch' : ''}`;
  const key = {
    input_tokens: 'monthly_tokens',
    minute: 'minutes',
    characters: 'characters',
    image: 'images',
    page: 'pages',
    request: 'monthly_requests'
  }[p.unit];
  return `${fa(values[key])} ${fieldInfo[key][0]}${values.request_mode === 'batch' ? ' · Batch' : ''}`;
}
function catalogPriceOverview(rows) {
  if (!isPriceSort()) return '';
  const priced = rows
    .map((p) => ({ p, quote: catalogQuote(p) }))
    .filter((x) => x.quote.best)
    .sort((a, b) => a.quote.best.estimate_toman - b.quote.best.estimate_toman);
  if (!priced.length)
    return '<p class="price-basis-note">برای این انتخاب، قیمت قابل مقایسه ثبت نشده است.</p>';
  const low = priced[0],
    high = priced.at(-1);
  return `<section class="catalog-price-overview" aria-label="بازه قیمت نتایج">
    <a href="${href(low.p)}"><span>ارزان‌ترین ${state.kind === 'gpu' ? 'GPU' : 'مدل'} در این فهرست</span><strong dir="auto">${esc(low.p.title)}</strong><b>${money(low.quote.best.estimate_toman)}</b></a>
    <a href="${href(high.p)}"><span>گران‌ترین ${state.kind === 'gpu' ? 'GPU' : 'مدل'} در این فهرست</span><strong dir="auto">${esc(high.p.title)}</strong><b>${money(high.quote.best.estimate_toman)}</b></a>
    <div><span>مبنای یکسان مقایسه</span><strong>${state.access === 'weights' ? 'دریافت وزن‌ها' : state.kind === 'gpu' ? 'اجاره ۲۴ ساعته' : 'مصرف انتخابی شما'}</strong><p>${state.access === 'weights' ? 'قیمت مجوز پایه؛ حقوق استفاده هر مدل را جدا بررسی کنید.' : usageText(low.p)}</p><small>مقایسه کمترین قیمت هر محصول؛ پیش از مالیات</small></div>
  </section>`;
}
function renderCatalog({ inPlace = false, syncURL = true } = {}) {
  $('main').classList.add('catalog-page');
  const featured = [
    'qwen3.8-27b',
    'gemma-4-31b',
    'gpt-5-mini',
    'claude-sonnet-4.5',
    'deepseek-v4-pro',
    'gemini-3.8-flash',
    'llama-3.3-70b',
    'qwen3-coder-30b'
  ];
  const rank = (p) =>
    !state.persian && p.kind === 'api' && featured.includes(p.id)
      ? featured.indexOf(p.id) - 100
      : (p.rank ?? 50);
  let rows = catalogRows(state);
  rows.sort((a, b) =>
    state.sort === 'name'
      ? a.title.localeCompare(b.title)
      : isPriceSort()
        ? HB.comparePrices(
            catalogQuote(a).best?.estimate_toman,
            catalogQuote(b).best?.estimate_toman,
            state.sort === 'price-desc'
          )
        : rank(a) - rank(b)
  );
  const paging = HB.paginate(rows, state.page, state.size);
  if (state.page !== paging.page) {
    state.page = paging.page;
    if (syncURL) try { window.history?.replaceState(null, '', filterURL({page: state.page})); } catch {}
  }
  const filtered = activeFilters().length > 0;
  const title = state.saved
    ? 'نشان‌شده‌های شما'
    : state.query
      ? `نتایج جستجوی «${esc(state.query)}»`
      : state.kind === 'gpu'
        ? 'اجاره GPU'
        : state.persian
          ? 'مدل‌های اختصاصی فارسی'
          : 'مدل‌ها و API';
  const wider =
    state.persian && state.query
      ? filterProducts(products, {
          ...state,
          persian: false,
          task: '',
          maker: '',
          provider: '',
          open: false,
          context: 0,
          publisher: '',
          access: '',
          priced: false,
          multiple: false
        }).filter((p) => !p.persian_specialist).length
      : 0;
  const otherKind = state.kind === 'gpu' ? 'api' : 'gpu';
  const otherMatches = state.query
    ? filterProducts(products, { kind: otherKind, query: state.query }).length
    : 0;
  const empty = `<div class="empty-state">${icon(state.saved ? 'heart' : 'search')}<h2>${state.saved && !saved.length ? 'هنوز محصولی نشان نکرده‌اید' : 'محصولی با این شرایط پیدا نشد'}</h2><p>${state.saved && !saved.length ? 'روی قلب کنار محصول بزنید تا اینجا نگه داشته شود.' : 'نام کوتاه‌تری جستجو کنید یا فیلترها را بردارید.'}</p><a class="button primary" href="${state.saved ? (saved.length ? '#saved' : '#api') : state.persian ? '#fa' : '#' + state.kind}">${state.saved ? (saved.length ? 'همه نشان‌شده‌ها' : 'انتخاب محصول') : 'دیدن همه نتایج'}</a></div>`;
  const markup =
    `<section class="catalog-heading catalog-heading-compact"><h1>${title}</h1>${state.persian ? '<span class="catalog-context">آموزش‌دیده یا تنظیم‌شده برای زبان فارسی</span>' : !state.saved && !state.query ? '<span class="catalog-context">مقایسه قیمت و خرید از عرضه‌کننده</span>' : ''}<a class="intro-help" href="#guide" data-action="guide">راهنمای انتخاب ${icon('arrow')}</a></section>
    ${categorySelector()}
    ${!state.saved ? `<div class="discovery-controls">${state.kind === 'api' ? accessFilters() : ''}${filters()}</div>` : ''}<div id="catalogAppliedFilters">${appliedFilters()}</div>
    ${wider ? `<div class="search-scope-note">${num(wider)} نتیجه دیگر در همه مدل‌ها پیدا شد. <a href="#api?q=${encodeURIComponent(state.query)}">جستجو در همه مدل‌ها ${icon('arrow')}</a></div>` : ''}
    ${otherMatches ? `<div class="search-scope-note">${num(otherMatches)} نتیجه در ${otherKind === 'gpu' ? 'اجاره GPU' : 'مدل‌ها'} پیدا شد. <a href="#${otherKind}?q=${encodeURIComponent(state.query)}">دیدن نتایج ${icon('arrow')}</a></div>` : ''}
    ${catalogUsagePanel()}
    <section class="catalog-results" id="catalogResults" tabindex="-1"><div class="results-toolbar"><p role="status" aria-live="polite"><strong>${num(rows.length)}</strong> ${state.saved ? 'محصول' : state.kind === 'gpu' ? 'پیکربندی' : 'مدل'}${state.task ? ' در ' + tasks[state.task] : ''}</p><div class="sort-options" role="group" aria-label="مرتب‌سازی محصولات"><span>مرتب‌سازی:</span>${[
      ['selected', 'پیشنهادی'],
      ['price', 'ارزان‌ترین'],
      ['price-desc', 'گران‌ترین'],
      ['name', state.kind === 'gpu' ? 'نام کارت' : 'نام مدل']
    ]
      .map(
        ([key, label]) =>
          `<button data-sort="${key}" aria-pressed="${state.sort === key}">${label}</button>`
      )
      .join(
        ''
      )}</div></div>${catalogPriceOverview(rows)}${rows.length ? `<div class="product-grid">${paging.rows.map((p) => card(p)).join('')}</div>${pagination(paging)}` : empty}${isPriceSort() ? `<p class="catalog-footnote">${state.access === 'weights' ? 'قیمت مجوز پایه نمایش داده می‌شود؛ حقوق استفاده و شرایط هر مدل را جدا بررسی کنید.' : 'قیمت‌ها با مصرف یکسان مقایسه می‌شوند. مدل‌های بدون قیمت در انتهای فهرست هستند.'}</p>` : ''}</section>
    <div id="catalogSecondary">${state.persian && !filtered ? collections() : ''}${!state.saved && !filtered ? recentSection() : ''}</div>`;
  if (inPlace) {
    const next = document.createElement('div');
    next.innerHTML = markup;
    // Keep the live form, focus and category rail; only replace dependent results.
    for (const id of ['catalogResults', 'catalogAppliedFilters', 'catalogSecondary'])
      $(id).replaceChildren(...next.querySelector('#' + id).childNodes);
    const controls = document.querySelector('.discovery-controls');
    if (controls) controls.innerHTML = next.querySelector('.discovery-controls').innerHTML;
    const links = next.querySelectorAll('.category-tabs a');
    document.querySelectorAll('.category-tabs a').forEach((link, index) =>
      link.setAttribute('href', links[index].getAttribute('href')));
    document.querySelector('.usage-caption').textContent = next.querySelector('.usage-caption').textContent;
  } else $('main').innerHTML = markup;
  window.TorobChat?.contextChanged();
  document.title = `${paging.pages > 1 ? 'صفحه ' + fa(paging.page) + ' · ' : ''}${state.saved ? 'نشان‌شده‌ها' : state.kind === 'gpu' ? 'اجاره GPU' : state.persian ? 'مدل‌های اختصاصی فارسی' : 'مدل‌ها و API'} | torobai`;
}

function catalogValues(p, view = state) {
  return {...scenario(p, p.kind === 'gpu' ? view.rental || 'standard' : 'standard'), ...(view.usageUnit === p.unit ? view.usage : {}),
    ...(p.kind === 'api' ? {request_mode: view.requestMode || 'instant'} : {})};
}
function localEstimate(p, values) {
  const base = catalog.estimates[p.id].standard;
  const assumptions = {...base.assumptions, ...values, days: 30};
  const offers = base.offers.map((o) => ({...o,
    ...HB.evaluatePlan(catalog.pricing_plans[o.id][assumptions.request_mode || 'instant'], assumptions),
    request_mode: assumptions.request_mode || 'instant'}));
  offers.sort((a,b) => HB.comparePrices(a.estimate_toman, b.estimate_toman));
  return {...base, assumptions, offers};
}
function catalogEstimate(p, view = state) {
  if (p.kind !== 'api') return catalog.estimates[p.id]?.[view.rental || 'standard'];
  const values = catalogValues(p, view);
  return cachedEstimate(p, 'custom', values) || cacheEstimate(p, 'custom', values, localEstimate(p, values));
}
function modeControl(mode, id) {
  return `<label class="request-mode">روش پردازش<select id="${id}" name="request_mode"><option value="instant" ${mode !== 'batch' ? 'selected' : ''}>عادی</option><option value="batch" ${mode === 'batch' ? 'selected' : ''}>دسته‌ای (Batch)</option></select></label>`;
}
function usageInputs(values) {
  return Object.entries(values).filter(([key]) => fieldInfo[key]).map(([key,v]) => `<label>${fieldInfo[key][0]}<input name="${key}" inputmode="${['minutes','hours'].includes(key) ? 'decimal' : 'numeric'}" value="${fa(v,2)}" maxlength="18" autocomplete="off"></label>`).join('');
}
function catalogUsagePanel() {
  if (state.kind !== 'api' || state.access === 'weights') return '';
  const unit = HB.taskUnits[state.task] || 'tokens';
  const p = {unit, kind:'api'};
  const values = catalogValues(p);
  return `<section class="catalog-usage" aria-label="تنظیم مصرف"><div class="usage-heading"><div><strong>قیمت برای مصرف شما</strong><span>${!state.task ? 'تنظیم مدل‌های متنی؛ سایر کاربردها مصرف متناسب خود را دارند.' : 'همه قیمت‌های این کاربرد با مصرف یکسان محاسبه می‌شوند.'}</span></div><span class="usage-period">۳۰ روز · تومان</span></div><form id="catalogUsageForm" data-unit="${unit}" class="catalog-usage-form">${usageInputs(values)}${modeControl(state.requestMode, 'catalogMode')}<button class="button primary" type="submit">اعمال مصرف</button><button class="text-link" type="button" data-action="reset-usage">مصرف پیش‌فرض</button><p class="form-error" id="catalogUsageError" role="alert" hidden></p><p id="catalogUsagePending" class="usage-pending" role="status" aria-live="polite" aria-atomic="true"></p></form><p class="usage-caption">${state.requestMode === 'batch' ? 'Batch برای کارهای بدون نیاز به پاسخ فوری است؛ فقط پیشنهادهای دارای تعرفه دسته‌ای مقایسه می‌شوند. زمان تحویل در صفحه مدل آمده است.' : 'مبلغ اصلی کارت، هزینه همین مصرف است. تعرفه ورودی و خروجی هم جدا نمایش داده می‌شود.'}</p></section>`;
}
function setCatalogBusy(form, busy) {
  form.dataset.updating = String(busy);
  form.setAttribute('aria-busy', String(busy));
  const button = form.querySelector('[type=submit]');
  button.disabled = busy;
  button.classList.toggle('is-loading', busy);
  button.setAttribute('aria-label', busy ? 'در حال محاسبه قیمت‌ها' : 'اعمال مصرف');
  form.querySelector('[data-action=reset-usage]').disabled = busy;
  $('catalogResults').setAttribute('aria-busy', String(busy));
  $('catalogResults').classList.toggle('is-updating', busy);
  $('catalogResults').toggleAttribute('inert', busy);
}
function markCatalogUsagePending(form) {
  cancelNavigation();
  if (form.dataset.updating === 'true') {
    ++version;
    setCatalogBusy(form, false);
  }
  $('catalogUsagePending').textContent = 'مصرف تغییر کرده؛ برای به‌روزرسانی قیمت‌ها «اعمال مصرف» را بزنید.';
}
async function applyCatalogUsage(form, reset = false) {
  if (!form || form.dataset.updating === 'true') return;
  const usage = reset ? {} : readUsage(form, 'catalogUsageError');
  if (!usage) return;
  cancelNavigation();
  const updates = { usageUnit: reset ? '' : form.dataset.unit, usage,
    requestMode: reset ? 'instant' : form.querySelector('[name=request_mode]').value };
  const request = ++version;
  const previousState = state;
  const focused = document.activeElement;
  const nextState = { ...state, ...updates, page: 1 };
  const needsCalculation = products.some((p) => p.kind === 'api' && !cachedEstimate(p, 'custom', catalogValues(p, nextState)));
  if (needsCalculation) setCatalogBusy(form, true);
  $('catalogUsageError').hidden = true;
  $('catalogUsagePending').textContent = needsCalculation ? 'در حال محاسبه قیمت‌ها…' : '';
  try {
    if (needsCalculation) await presentationPause(650);
    if (request !== version || $('catalogUsageForm') !== form) return;
    // Capture at commit: scrolling during loading must not be undone.
    const x = window.scrollX || 0, y = window.scrollY || 0;
    state = nextState;
    renderCatalog({ inPlace: true });
    catalogURL = filterURL();
    try { window.history?.replaceState(null, '', catalogURL); } catch {
      // File-origin restrictions must never fall back to hash navigation.
    }
    if (reset) {
      for (const [key, value] of Object.entries(scenario({unit:form.dataset.unit}, 'standard')))
        form.querySelector(`[name="${key}"]`).value = fa(value, 2);
      form.querySelector('[name=request_mode] option[value=instant]').selected = true;
    }
    renderTray();
    // Shorter Batch/empty results may need enough bottom space to retain the viewport.
    restoreViewport(x, y);
    $('catalogUsagePending').textContent = 'قیمت‌ها با مصرف انتخابی شما به‌روز شدند.';
  } catch {
    if (request !== version || $('catalogUsageForm') !== form) return;
    state = previousState;
    $('catalogUsagePending').textContent = '';
    $('catalogUsageError').hidden = false;
    $('catalogUsageError').textContent = 'به‌روزرسانی قیمت‌ها انجام نشد. دوباره اعمال مصرف را بزنید.';
  } finally {
    if (request === version && $('catalogUsageForm') === form) {
      setCatalogBusy(form, false);
      if (focused === form.querySelector('[type=submit]') && document.activeElement === document.body)
        focused.focus({ preventScroll: true });
    }
  }
}
function pagination(p) {
  if (p.pages <= 1 && state.size === 20) return '';
  const link = (n, label, cls='') => `<a class="${cls}" href="${esc(filterURL({page:n}))}" data-page="${n}" ${n === p.page ? 'aria-current="page"' : ''} aria-label="${cls ? label + '؛ ' : ''}صفحه ${fa(n)}">${label}</a>`;
  return `<nav class="pagination" aria-label="صفحه‌بندی نتایج"><div class="pagination-summary" role="status">نمایش ${num(p.start)} تا ${num(p.end)} از ${num(p.total)} نتیجه</div><div class="pagination-links" ${p.pages <= 1 ? 'hidden' : ''}>${p.page > 1 ? link(p.page-1, 'قبلی', 'page-direction') : '<span class="page-direction disabled" aria-disabled="true">قبلی</span>'}<div class="page-numbers">${p.numbers.map(n => n === 'gap' ? '<span class="page-gap" aria-hidden="true">…</span>' : link(n, fa(n))).join('')}</div>${p.page < p.pages ? link(p.page+1, 'بعدی', 'page-direction') : '<span class="page-direction disabled" aria-disabled="true">بعدی</span>'}</div><label class="page-size">تعداد در صفحه<select id="pageSize">${[20,40,60].map(n => `<option value="${n}" ${state.size===n ? 'selected' : ''}>${fa(n)}</option>`).join('')}</select></label>${p.pages > 7 ? `<form id="pageJump" data-max="${p.pages}"><label>رفتن به صفحه<input name="page" inputmode="numeric" value="${fa(p.page)}" aria-label="شماره صفحه"></label><button class="button secondary" type="submit">برو</button></form>` : ''}</nav>`;
}
function readUsage(form, errorID) {
  const values = {};
  for (const input of form.querySelectorAll('input[name]')) {
    const key = input.name;
    const value = parseNumber(input.value, fieldInfo[key][1], !['minutes','hours'].includes(key), key==='hours'?0.01:key==='sessions'?1:0);
    input.setAttribute('aria-invalid', String(value === null));
    if (value === null) {
      $(errorID).hidden = false;
      $(errorID).textContent = `${fieldInfo[key][0]}: مقدار معتبر تا ${fa(fieldInfo[key][1])} وارد کنید.`;
      input.focus(); return null;
    }
    values[key] = value;
  }
  $(errorID).hidden = true;
  return values;
}
function scenario(p, key) {
  return catalog.presets[p.unit]?.[key] || {};
}
function estimateKey(p, key = 'standard', values) {
  const inputs = { ...(values || scenario(p, key)) };
  if (p.kind === 'api') inputs.request_mode ||= 'instant';
  return JSON.stringify([p.id, Object.entries(inputs).sort(([a], [b]) => a.localeCompare(b))]);
}
function cachedEstimate(p, key = 'standard', values) {
  const id = estimateKey(p, key, values);
  if (estimateCache.has(id)) return estimateCache.get(id);
  // The initial catalog already includes all ordinary preset quotes.
  for (const preset of Object.keys(catalog.estimates[p.id] || {}))
    if (estimateKey(p, preset) === id) return catalog.estimates[p.id][preset];
  return null;
}
function cacheEstimate(p, key, values, result) {
  if (!result) throw new Error('اطلاعات این محصول در دسترس نیست.');
  estimateCache.set(estimateKey(p, key, values), result);
  if (estimateCache.size > 256) estimateCache.delete(estimateCache.keys().next().value);
  return result;
}
async function estimate(p, key = 'standard', values) {
  const ready = cachedEstimate(p, key, values);
  if (ready) return ready;
  const id = estimateKey(p, key, values);
  if (pendingEstimates.has(id)) return pendingEstimates.get(id);
  const revision = marketRevision;
  const calculation = (async () => {
    let result;
    if ((portable || marketState?.updates.length || marketState?.models.some(d=>d.status==='approved') || marketState?.proposals.some(d=>d.status==='approved'||d.published)) && values && p.kind === 'api') result = localEstimate(p, values);
    else {
      const response = await fetch('/api/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: p.id, ...(values || scenario(p, key)) })
      });
      if (!response.ok) throw new Error('محاسبه انجام نشد؛ ارتباط و مقدار مصرف را بررسی کنید.');
      result = await response.json();
    }
    return revision === marketRevision ? cacheEstimate(p, key, values, result) : result;
  })();
  pendingEstimates.set(id, calculation);
  try { return await calculation; }
  finally { if(pendingEstimates.get(id) === calculation) pendingEstimates.delete(id); }
}
function specRows(p) {
  if (p.kind === 'gpu')
    return [
      ['سازنده', p.maker],
      ['مدل کارت', p.title],
      ['حافظه هر کارت', p.vram ? fa(p.vram) + ' گیگابایت' : 'طبق پیکربندی'],
      ['نوع عرضه', 'اجاره GPU'],
      ['دسترسی و ذخیره‌سازی', 'در شرایط هر ارائه‌دهنده']
    ];
  const rows = [
    ['سازنده', p.maker],
    ['کاربرد', tasks[p.task]]
  ];
  if (p.capability)
    rows.push(['زبان', p.capability.language_detail], ['مدل پایه', p.capability.base_model]);
  if (p.version) rows.push(['نسخه مدل', p.version]);
  if (p.context) rows.push(['ظرفیت متن', fa(p.context) + ' توکن']);
  if (p.output_type) rows.push(['نوع خروجی', p.output_type]);
  rows.push(
    [
      'فایل مدل',
      p.weight_offers?.length ? 'خرید با مجوز' : p.weights_url ? 'دریافت از سازنده' : 'عرضه نشده'
    ],
    ['مجوز', p.license || 'طبق شرایط ارائه‌دهنده']
  );
  return rows;
}

function budgetPanel(p) {
  if (!(p.offers || []).length)
    return /* HTML */ `<aside class="budget-panel weight-panel">
      <span class="section-kicker">مسیر استفاده از مدل</span>
      <h2>روی زیرساخت خودتان اجرا کنید</h2>
      <p>وزن‌ها، مجوز و روش اجرا را از صفحه رسمی مدل دریافت کنید.</p>
      ${external(p.weights_url, 'دریافت مدل', 'button primary')}<a
        class="button secondary"
        href="#gpu"
        >انتخاب سرور ${icon('chip')}</a
      >
      <p class="small">هزینه زیرساخت و نگهداری، جدا از دریافت وزن‌هاست.</p>
    </aside>`;
  const values = activePreset === 'custom' ? catalogValues(p) : scenario(p, activePreset);
  return /* HTML */ `<aside class="budget-panel">
    <span class="section-kicker">برای مصرف شما</span>
    <h2>${p.kind === 'gpu' ? 'هزینه اجاره چقدر می‌شود؟' : 'ماهانه چقدر هزینه می‌کنید؟'}</h2>
    <div class="preset-switch">
      ${Object.keys(presetNames)
        .map(
          (k) =>
            `<button data-preset="${k}" aria-pressed="${k === activePreset}">${p.kind === 'gpu' ? fa(scenario(p, k).hours) + ' ساعت' : presetNames[k]}</button>`
        )
        .join('')}
    </div>
    ${portable && p.kind === 'gpu' ? `<dl class="fixed-scenario">${Object.entries(values).map(([k,v]) => `<div><dt>${fieldInfo[k][0]}</dt><dd>${num(v)}</dd></div>`).join('')}</dl>` : `<form id="budgetForm">${usageInputs(values)}${p.kind === 'api' ? modeControl(state.requestMode, 'detailMode') : ''}<button class="button primary" type="submit">محاسبه هزینه ${icon('arrow')}</button><p id="budgetError" class="form-error" role="alert" hidden></p></form>`}
    <p class="budget-note">
      ${p.kind === 'gpu' ? 'هر نوبت اجاره جدا حساب می‌شود. تعرفه ماهانه، قیمت ساعتی نیست.' : 'هزینه مصرف، پیش از مالیات و هزینه‌های جانبی. مبنای ماه، ۳۰ روز است.'}
    </p>
    <div id="budgetSummary"></div>
  </aside>`;
}
function batchTerms(o) {
  return o.batch?.supported ? `<p class="batch-terms"><b>Batch</b> · تحویل تا ${num(o.batch.completion_hours)} ساعت · حداکثر ${num(o.batch.max_requests)} درخواست در هر دسته${o.request_mode === 'batch' ? ' · تعرفه دسته‌ای فعال' : ''}</p>` : '';
}
function offerTerms(o, p) {
  const seller = o.seller_info;
  const unknown = 'اعلام نشده';
  const yes = (value) => (value == null ? unknown : value ? 'دارد' : 'ندارد');
  const pairs =
    p.kind === 'gpu'
      ? [
          ['نوع دسترسی', o.access || unknown],
          ['SSH', yes(o.ssh)],
          ['ماندگاری دیسک', yes(o.persistent_disk)],
          ['GPU / RAM / vCPU', `${o.gpu_count ?? '—'} / ${o.ram_gb ?? '—'} GB / ${o.vcpu ?? '—'}`],
          ['محل سرور', o.location || unknown],
          ['حداقل اجاره', o.min_hours ? fa(o.min_hours) + ' ساعت' : unknown]
        ]
      : [
          ['شناسه در سرویس', o.model_id || unknown],
          ['کانتکست سرویس', o.context ? fa(o.context) + ' توکن' : unknown],
          ['پاسخ جریانی', yes(o.streaming)],
          ['سقف درخواست', o.service_terms?.rate_limit || seller.rate_limit || unknown],
          ['انقضای اعتبار', seller.credit_expiry || unknown],
          ['محل پردازش', seller.processing_location || unknown]
        ];
  if (o.service_terms)
    pairs.push(
      ['شرایط استفاده', o.service_terms.use_scope],
      ['نگهداری داده', o.service_terms.privacy],
      ['پشتیبانی', o.service_terms.support]
    );
  pairs.push(
    ['مالیات', seller.tax_percent == null ? unknown : fa(seller.tax_percent) + ' درصد'],
    [
      'حداقل پرداخت اولیه',
      o.minimum_payment_toman == null
        ? 'مبلغ نهایی اعلام نشده'
        : fa(o.minimum_payment_toman) + ' تومان'
    ]
  );
  return /* HTML */ `<details class="offer-details">
    <summary>شرایط و مشخصات ${icon('filter')}</summary>
    <dl>
      ${pairs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd dir="auto">${esc(v)}</dd></div>`).join('')}
    </dl>
    ${o.note ? `<p>${esc(o.note)}</p>` : ''}
    <div class="source-links">
      ${o.source_url ? external(o.source_url, 'صفحه تعرفه') : ''}${o.docs_url ? external(o.docs_url, 'مستندات') : ''}
    </div>
  </details>`;
}
function offerRate(o, p) {
  o = {...o, ...o.effective_rates};
  const pair = (label, value) =>
    `<div class="unit-quote"><span>${label}</span><b>${money(value)}</b></div>`;
  if (p.kind === 'gpu') {
    const key = ['hourly_toman', 'daily_toman', 'monthly_toman'].find((k) => o[k] != null);
    return key ? pair(unitLabels[key], o[key]) : '<span class="muted">قیمت با استعلام</span>';
  }
  if (o.toman_input_m != null)
    return (
      pair('ورودی / میلیون توکن', o.toman_input_m) +
      (o.toman_output_m != null ? pair('خروجی / میلیون توکن', o.toman_output_m) : '')
    );
  return o.toman_unit != null
    ? pair(unitLabels[p.unit], o.toman_unit)
    : '<span class="muted">قیمت با استعلام</span>';
}
function syncDetailURL() {
  if (!selected) return;
  const next = href(selected, { ...state, ssh: sshOnly, access: purchaseMode });
  try {
    window.history?.replaceState(null, '', next);
  } catch {
    /* Some file-origin hosts restrict history; the selected offers remain usable. */
  }
}
function selectedProvider() {
  return state.provider || '';
}
function reliabilityBadge(p, o) {
  if(uptimeValue(o)==null)return '<span class="reliability-pending">پایداری: سابقه ثبت نشده</span>';
  return `<button class="reliability-pill has-data" data-uptime-product="${p.id}">${uptimeMini(o)} پایداری ${num(uptimeValue(o), 2)}٪ <span>۳۰ روز</span></button>`;
}

function renderFeatured(p, best, priced) {
  const target = $('featuredOffer');
  target.removeAttribute('data-offer-id');
  if (!best) {
    target.innerHTML = `<div class="featured-unpriced"><span>${icon(p.weights_url ? 'layers' : 'search')}</span><h2>${!p.offers.length && p.weights_url ? 'این مدل را دانلود و اجرا کنید' : state.requestMode === 'batch' ? 'پیشنهاد Batch قابل محاسبه نیست' : 'قیمت قابل محاسبه ثبت نشده'}</h2><p>${!p.offers.length ? 'فایل مدل و راهنمای اجرا در صفحه رسمی سازنده در دسترس است.' : state.requestMode === 'batch' ? 'مصرف را بررسی کنید یا تعرفه عادی را ببینید.' : 'میزان مصرف و شرایط فروشنده را بررسی کنید.'}</p>${!p.offers.length && p.weights_url ? external(p.weights_url, 'دانلود از صفحه رسمی', 'button primary') : state.requestMode === 'batch' ? '<button data-action="normal-mode" class="button secondary">نمایش تعرفه عادی</button>' : '<a href="#sellers" data-scroll="sellers" class="button secondary">مشاهده شرایط فروشنده‌ها</a>'}</div>`;
    return;
  }
  const maximum = Math.max(...priced.map((o) => o.estimate_toman));
  const values = activeEstimate.assumptions;
  target.innerHTML = `<div class="featured-topline"><span class="best-label">${icon('check')} ${priced.length > 1 ? 'ارزان‌ترین پیشنهاد' : p.kind === 'gpu' ? 'پیشنهاد اجاره' : 'تعرفه API'}</span><span>${num(priced.length)} قیمت قابل مقایسه</span></div>
    <div class="featured-provider">${logo({ ...best.seller_info, name: best.seller })}<div><small>${best.provider_role === 'creator' ? 'API سازنده مدل' : 'ارائه‌دهنده'}</small><h2>${sellerLink(best)}</h2></div>${reliabilityBadge(p, best)}</div>
    <div class="featured-price"><strong id="summaryRate">${money(best.estimate_toman)}</strong><span id="summaryRateUnit">${p.kind === 'gpu' ? 'برای مدت اجاره انتخابی' : 'هزینه مصرف ماهانه'}</span></div>
    ${priced.length > 1 && maximum !== best.estimate_toman ? `<div class="featured-range"><span>بازه قیمت برای همین مصرف</span><b>${money(best.estimate_toman)} <i>تا</i> ${money(maximum)}</b></div>` : ''}
    <div class="featured-unit-rates">${offerRate(best, p)}</div>${batchTerms(best)}
    ${sellerAction(p, best, 'button primary featured-buy')}
    <div class="featured-terms"><span>${best.minimum_credit_toman != null ? 'حداقل اعتبار: ' + money(best.minimum_credit_toman) : 'حداقل اعتبار: با استعلام'}</span>${p.kind === 'gpu' ? `<span>${best.ssh === true ? 'دسترسی SSH' : best.ssh === false ? 'بدون SSH' : 'SSH با استعلام'}</span>` : '<span>پرداخت تومانی</span>'}</div>
    <p class="featured-basis">${usageText(p, values)} · پیش از مالیات</p>
    ${offerComparisonButton(best)}${billBreakdown(p,best,values)}${offerEvidence(p, best)}${offerTerms(best, p)}`;
  target.dataset.offerId = best.id;
}
function renderOffers() {
  if (!selected || !$('offerList') || !activeEstimate) return;
  const p = selected;
  if (purchaseMode === 'weights') {
    renderWeightOffers(p);
    return;
  }
  const rows = activeEstimate.offers.filter(
    (o) =>
      (!sshOnly || o.ssh === true) && (!selectedProvider() || o.seller_id === selectedProvider()) && HB.offerMatches(o,state) && (state.requestMode !== 'batch' || o.batch?.supported === true)
  );
  const priced = rows
    .filter((o) => o.estimate_toman != null)
    .sort((a, b) => HB.comparePrices(a.estimate_toman, b.estimate_toman));
  const best = priced[0] || null;
  const remaining = rows.filter((o) => o.id !== best?.id);
  remaining.sort((a, b) =>
    sellerSort === 'credit'
      ? HB.comparePrices(a.minimum_credit_toman, b.minimum_credit_toman)
      : HB.comparePrices(a.estimate_toman, b.estimate_toman, sellerSort === 'cost-desc')
  );
  renderFeatured(p, best, priced);
  $('sellers').hidden = Boolean(best && !remaining.length);
  const priceTab = document.querySelector('.detail-tabs [data-price-section]');
  if (priceTab) {
    priceTab.textContent = $('sellers').hidden ? 'قیمت و شرایط' : 'قیمت فروشنده‌ها';
  }
  $('offerCount').textContent = fa(remaining.length);
  $('sellerSectionTitle').textContent = best ? 'سایر ارائه‌دهندگان' : 'ارائه‌دهندگان';
  $('offerList').innerHTML = remaining.length
    ? remaining
        .map(
          (o) => `<article class="offer-row" data-offer-id="${o.id}"><div class="offer-main">
    <div class="seller-identity"><div class="seller-heading">${logo({ ...o.seller_info, name: o.seller })}<div><h3>${sellerLink(o)}</h3><span>${p.kind === 'gpu' ? esc(o.service_type || 'اجاره GPU') : o.provider_role === 'creator' ? 'API سازنده مدل' : 'ارائه‌دهنده API'}</span></div></div>${reliabilityBadge(p, o)}<small>${o.minimum_credit_toman == null ? 'حداقل اعتبار: با استعلام' : 'حداقل اعتبار: ' + money(o.minimum_credit_toman)}</small></div>
    <div class="offer-rate">${offerRate(o, p)}${batchTerms(o)}</div>
    <div class="offer-total"><small>${p.kind === 'gpu' ? 'هزینه مدت انتخابی' : 'هزینه مصرف ماهانه'}</small>${o.estimate_toman == null ? `<p class="unpriced">${esc(o.estimate_reason || 'استعلام از فروشنده')}</p>` : `<strong>${money(o.estimate_toman)}</strong>`}${sellerAction(p, o, 'button secondary')}</div>
    </div>${offerComparisonButton(o)}${billBreakdown(p,o,activeEstimate.assumptions)}${offerEvidence(p, o)}${offerTerms(o, p)}</article>`
        )
        .join('')
    : `<div class="empty-state compact"><p>${best ? 'پیشنهاد دیگری با این شرایط ثبت نشده است.' : !p.offers.length ? 'برای این مدل مسیر دریافت وزن‌ها را انتخاب کنید.' : 'با این فیلتر، پیشنهادی پیدا نشد.'}</p></div>`;
  $('usageSummary').textContent = usageText(p, activeEstimate.assumptions);
  renderSellerCompareBar();
  document
    .querySelectorAll('.usage-strip [data-preset]')
    .forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.preset === activePreset)));
  const summary = $('budgetSummary');
  if (summary)
    summary.innerHTML = best
      ? `<div class="budget-result"><small>کمترین هزینه برای این مصرف</small><strong>${money(best.estimate_toman)}</strong><span>${esc(best.seller)}</span></div>`
      : '';
}
let detailPanelAnimation = null;
function selectDetailTab(key, animate = true, focus = false) {
  const tabs = [...document.querySelectorAll('.detail-tabs [role="tab"]')];
  const tab = tabs.find(el => el.dataset.detailTab === key) || tabs[0];
  if (!tab) return;
  const panel = $(tab.getAttribute('aria-controls'));
  const changed = tab.getAttribute('aria-selected') !== 'true';
  if (focus) tab.focus({ preventScroll: true });
  if (!changed && animate) return;
  detailPanelAnimation?.cancel();
  detailPanelAnimation = null;
  for (const el of tabs) {
    const active = el === tab;
    el.setAttribute('aria-selected', String(active));
    el.setAttribute('tabindex', active ? '0' : '-1');
    const content = $(el.getAttribute('aria-controls'));
    if (!active && content.contains(document.activeElement)) tab.focus({ preventScroll: true });
    content.hidden = !active;
  }
  if (changed && animate && !matchMedia('(prefers-reduced-motion: reduce)').matches && panel.animate) {
    detailPanelAnimation = panel.animate(
      [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }],
      { duration: 200, easing: 'ease-out' }
    );
  }
}
function renderDetail(p) {
  const activeTab = $('main').dataset.detailProduct === p.id
    ? document.querySelector('.detail-tabs [aria-selected="true"]')?.dataset.detailTab || 'prices'
    : 'prices';
  const offers = p.offers || [];
  const tabs = [['prices', purchaseMode === 'weights' ? 'فایل و شرایط دریافت' : 'قیمت فروشنده‌ها'],
    ...(purchaseMode === 'weights' ? [] : [['uptime', 'پایداری']]), ['performance', 'عملکرد'], ['specs', 'مشخصات'],
    ...(purchaseMode !== 'weights' && offers.length ? [['costs', 'مقایسه مصرف']] : [])];
  $('main').innerHTML =
    `<div class="detail-breadcrumb"><a href="${esc(catalogURL)}">torobai</a><span>/</span><a href="#${p.kind}">${p.kind === 'gpu' ? 'اجاره GPU' : 'مدل‌ها و API'}</a><span>/</span><span>${esc(p.title)}</span></div>
    <div class="detail-toolbar">${purchaseTabs(p)}${capabilityFilters()}</div>
    <div class="detail-offer-controls">${p.kind === 'gpu' ? `<div class="offer-filter"><label><input id="sshOffers" type="checkbox" ${sshOnly ? 'checked' : ''}> فقط دسترسی SSH</label><span>حافظه هر کارت و شرایط اجاره را بررسی کنید.</span></div>` : ''}
      ${selectedProvider() ? `<p class="provider-selection-note">فقط پیشنهادهای ارائه‌دهنده انتخابی نمایش داده می‌شوند. <a href="#${p.kind}/${p.id}" data-action="all-providers">نمایش همه ارائه‌دهندگان</a></p>` : ''}
    </div>
    <section class="product-overview">
      <div class="product-intro"><div class="intro-top">${stage(p)}<div class="intro-copy"><span class="section-kicker">${tasks[p.task]}</span><h1 tabindex="-1" id="productTitle" dir="auto">${esc(p.title)}</h1><p>${esc(p.description)}</p><div class="product-tags">${p.tags
        .slice(0, 2)
        .map((t) => `<span class="tag">${esc(t)}</span>`)
        .join('')}</div></div></div>
        <div class="intro-facts"><span>${p.persian_specialist ? 'زبان و کاربرد' : p.kind === 'gpu' ? 'حافظه هر کارت' : p.context ? 'ظرفیت متن' : 'مبنای تعرفه'}</span><strong>${p.persian_specialist ? esc(p.capability.language_detail) : p.kind === 'gpu' ? (p.vram ? num(p.vram) + ' GB' : 'بسته به پیکربندی') : p.context ? num(p.context) + ' توکن' : unitLabels[p.unit] || 'طبق شرایط عرضه'}</strong><span>${p.persian_specialist ? 'نسخه مدل' : 'تعداد ارائه‌دهندگان'}</span><strong>${p.persian_specialist ? esc(p.version) : num(new Set(offers.map((o) => o.seller_id)).size)}</strong></div>
        <div class="intro-actions">${saveButton(p)}${compareButton(p)}${watchButton(p)}<button class="text-link" data-action="share">${icon('external')} اشتراک‌گذاری</button>${p.weights_url ? external(p.weights_url, 'دانلود مدل و مجوز') : ''}</div>
        <p class="intro-note">${p.kind === 'gpu' ? 'نوع دسترسی، حافظه هر کارت و شرایط اجاره را در پیشنهاد فروشنده ببینید.' : purchaseMode === 'weights' ? 'مجوز فایل مدل با API متفاوت است. پیش از دریافت، حقوق استفاده و نیاز سخت‌افزاری را بررسی کنید.' : 'همه پیشنهادهای این صفحه برای همین مدل هستند؛ محدودیت‌ها و شرایط API ممکن است متفاوت باشد.'}</p><div class="referral-note">${icon('external')} مقایسه در torobai؛ خرید و دریافت سرویس از عرضه‌کننده</div>
      </div>
      <aside id="featuredOffer" class="featured-offer" aria-live="polite"><div class="offer-skeleton" role="status"><span class="skeleton-line short"></span><span class="skeleton-line"></span><span class="skeleton-line price"></span><span class="skeleton-button"></span><p>در حال آماده‌سازی پیشنهادها…</p></div></aside>
    </section>
    <div class="detail-tabs" role="tablist" aria-label="بخش‌های محصول">${tabs.map(([key, label]) => `<button type="button" role="tab" id="detail-tab-${key}" data-detail-tab="${key}" ${key === 'prices' ? 'data-price-section' : ''} aria-controls="detail-panel-${key}" aria-selected="${key === 'prices'}" tabindex="${key === 'prices' ? '0' : '-1'}">${label}</button>`).join('')}</div>
    <div class="detail-content"><div id="detail-panel-prices" class="detail-panel" role="tabpanel" aria-labelledby="detail-tab-prices" tabindex="0">
    <div class="usage-strip"><div><strong>مبنای مقایسه قیمت</strong><span id="usageSummary">${usageText(p)}</span></div>${
      offers.length
        ? `<div class="preset-switch">${Object.keys(presetNames)
            .map(
              (k) =>
                `<button data-preset="${k}" aria-pressed="${k === activePreset}">${p.kind === 'gpu' ? fa(scenario(p, k).hours) + ' ساعت' : presetNames[k]}</button>`
            )
            .join(
              ''
            )}</div><button class="text-link" data-action="usage">${portable && p.kind === 'gpu' ? 'جزئیات مصرف' : 'تنظیم مصرف'} ${icon('filter')}</button>`
        : '<span>استفاده از وزن‌های مدل روی سرور شخصی</span>'
    }</div>
    <div id="sellerCompareBar" class="seller-compare-bar" hidden></div><section id="sellers" class="seller-section"><div class="section-heading"><h2><span id="sellerSectionTitle">سایر ارائه‌دهندگان</span> <span id="offerCount" class="num"></span></h2>${offers.length ? '<label>مرتب‌سازی: <select id="sellerSort"><option value="cost">ارزان‌ترین</option><option value="cost-desc">گران‌ترین</option><option value="credit">کمترین اعتبار اولیه</option></select></label>' : ''}</div>
      <div id="offerList" aria-live="polite"><div class="loading-state"><span class="loader"></span><p>در حال آماده‌سازی قیمت‌ها…</p></div></div>
    </section>
    <details class="usage-details" id="usageDetails"><summary>${offers.length ? 'جزئیات و تنظیم مصرف' : 'راهنمای اجرای مدل'} ${icon('filter')}</summary>${budgetPanel(p)}</details>
    </div>
    ${purchaseMode !== 'weights' ? `<div id="detail-panel-uptime" class="detail-panel" role="tabpanel" aria-labelledby="detail-tab-uptime" tabindex="0" hidden>${uptimeSection(p, 'uptime')}</div>` : ''}
    <div id="detail-panel-performance" class="detail-panel" role="tabpanel" aria-labelledby="detail-tab-performance" tabindex="0" hidden>${benchmarkProductPanel(p)}</div>
    <div id="detail-panel-specs" class="detail-panel" role="tabpanel" aria-labelledby="detail-tab-specs" tabindex="0" hidden>
    ${modelProfile(p)}${p.kind==='api'?`<div class="product-extra-links"><a href="#samples?model=${p.id}" class="button secondary">نمونه‌های فارسی ${icon('arrow')}</a>${p.weights_url||p.weight_offers?.length?`<a class="button secondary" href="#gpu-match?model=${p.id}">GPU مناسب این مدل ${icon('chip')}</a>`:''}<a class="text-link" href="#studio?model=${p.id}">این مدل را عرضه می‌کنید؟</a></div>`:''}
    <section id="specs" class="spec-section"><div class="section-heading"><h2>مشخصات ${p.kind === 'gpu' ? 'GPU' : 'مدل'}</h2>${p.spec_source ? external(p.spec_source, 'منبع مشخصات') : ''}</div><dl class="spec-table">${specRows(
      p
    )
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd dir="auto">${esc(v)}</dd></div>`)
      .join(
        ''
      )}</dl>${p.model_id ? `<button class="model-id" data-copy="${esc(p.model_id)}"><code>${esc(p.model_id)}</code>${icon('copy')}</button>` : ''}<p class="small">${p.kind === 'gpu' ? 'حافظه چند کارت جداگانه، جای یک کارت با حافظه بیشتر را نمی‌گیرد. RAM و دیسک را در شرایط فروشنده ببینید.' : 'مشخصات بالا متعلق به مدل است. قابلیت‌ها و محدودیت‌های API را در سایت فروشنده بررسی کنید.'}</p></section>
    </div>
    ${purchaseMode !== 'weights' && offers.length ? '<div id="detail-panel-costs" class="detail-panel" role="tabpanel" aria-labelledby="detail-tab-costs" tabindex="0" hidden><section id="costs" class="cost-section"><div class="section-heading"><h2>هزینه در مصرف‌های مختلف</h2></div><div id="costChart" class="loading-state">در حال محاسبه…</div><p class="small">مبلغ‌ها پیش از مالیات و هزینه‌های جانبی هستند.</p></section></div>' : ''}</div>
    <section id="related" class="related-section"><div class="section-heading"><h2>مدل‌ها و محصولات مشابه</h2><a class="text-link" href="#${p.kind}${p.kind === 'api' ? '?task=' + p.task : ''}">مشاهده همه ${icon('arrow')}</a></div><div class="related-grid">${products
      .filter((x) => x.task === p.task && x.id !== p.id)
      .slice(0, 4)
      .map((p) => card(p, { access: purchaseMode === 'weights' ? 'weights' : '' }))
      .join('')}</div></section>`;
  $('main').dataset.detailProduct = p.id;
  selectDetailTab(activeTab, false);
  document.title = `${p.title} | torobai`;
  $('main').classList.toggle('weights-view', purchaseMode === 'weights');
}
async function renderCostChart(p, request) {
  if (!$('costChart')) return;
  try {
    const inputs = Object.keys(presetNames).map((key) => ({ key, values: p.kind === 'api' && state.requestMode === 'batch' ? {...scenario(p,key), request_mode:'batch'} : undefined }));
    const cached = inputs.map(({ key, values }) => cachedEstimate(p, key, values));
    const results = cached.every(Boolean) ? cached : await Promise.all(inputs.map(({ key, values }) => estimate(p, key, values)));
    if (request !== version) return;
    const cheapest = results.map(
      (data) =>
        data.offers
          .filter(
            (o) =>
              o.estimate_toman != null &&
              (!sshOnly || o.ssh === true) &&
              (!selectedProvider() || o.seller_id === selectedProvider())
          )
          .sort((a, b) => a.estimate_toman - b.estimate_toman)[0]
    );
    const max = Math.max(1, ...cheapest.map((o) => o?.estimate_toman || 0));
    $('costChart').className = 'cost-chart';
    $('costChart').innerHTML = cheapest
      .map(
        (o, i) =>
          `<div class="cost-column"><strong>${o ? money(o.estimate_toman) : 'قابل محاسبه نیست'}</strong><div class="bar-track"><div class="cost-bar" style="height:${o ? Math.max(2, (o.estimate_toman / max) * 100) : 0}%"></div></div><b>${p.kind === 'gpu' ? fa(scenario(p, Object.keys(presetNames)[i]).hours) + ' ساعت' : presetNames[Object.keys(presetNames)[i]]}</b><small>${Object.entries(
            scenario(p, Object.keys(presetNames)[i])
          )
            .slice(0, 1)
            .map(([k, v]) => fa(v) + ' ' + fieldInfo[k][0])
            .join('')}</small><span>${esc(o?.seller || '')}</span></div>`
      )
      .join('');
  } catch {
    if (request === version) $('costChart').innerHTML = '<p>محاسبه این بخش در دسترس نیست.</p>';
  }
}
function quoteError(message) {
  if (!$('featuredOffer')) return;
  $('featuredOffer').removeAttribute('data-offer-id');
  $('featuredOffer').innerHTML =
    `<div class="empty-state compact" role="alert"><h2>محاسبه قیمت انجام نشد</h2><p>${esc(message)}</p><button class="button primary" data-action="retry-estimate">تلاش دوباره</button></div>`;
  $('offerList').innerHTML =
    '<p class="pending-note">پس از محاسبه، پیشنهادها نمایش داده می‌شوند.</p>';
  $('offerList').removeAttribute('aria-busy');
  if ($('budgetSummary')) $('budgetSummary').innerHTML = '';
  const chart = $('costChart');
  if (chart?.classList.contains('loading-state')) {
    chart.className = 'cost-chart';
    chart.innerHTML = '<p>برای دیدن نمودار، محاسبه قیمت را دوباره انجام دهید.</p>';
  }
}
function presentationPause(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms)
  );
}
async function openProduct(id, request, prepared = null) {
  const alias=marketState?.merges.find(m=>m.id===id)?.target;
  const p = products.find((p) => p.id === (alias||id));
  if (!p || p.kind !== state.kind) {
    $('main').innerHTML =
      '<div class="empty-state"><h1>این محصول پیدا نشد</h1><a class="button primary" href="#api">بازگشت به مدل‌ها</a></div>';
    return;
  }
  selected = p;
  sellerCompare=[];
  purchaseMode =
    (state.access === 'weights' && (p.weight_offers?.length || p.weights_url)) ||
    (!p.offers.length && (p.weight_offers?.length || p.weights_url))
      ? 'weights'
      : 'api';
  rememberProduct(p.id);
  activePreset = p.kind === 'gpu' ? state.rental : state.usageUnit === p.unit && Object.keys(state.usage).length ? 'custom' : 'standard';
  sshOnly = p.kind === 'gpu' && state.ssh;
  sellerSort = 'cost';
  activeEstimate = null;
  renderDetail(p);
  if (!prepared) $('productTitle').focus({ preventScroll: true });
  try {
    if (purchaseMode === 'weights') {
      if (request === version) renderWeightOffers(p);
      return;
    }
    if (prepared?.error) throw prepared.error;
    const values = p.kind === 'api' && (activePreset === 'custom' || state.requestMode === 'batch') ? catalogValues(p) : undefined;
    const data = prepared ? prepared.data : cachedEstimate(p, activePreset, values) || await estimate(p, activePreset, values);
    if (request !== version) return;
    activeEstimate = data;
    renderOffers();
    renderCostChart(p, request);
  } catch (e) {
    if (request === version) quoteError(e.message);
  }
}
function renderComparison() {
  const rows = comparison.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  if (!rows.length) {
    $('main').innerHTML =
      '<div class="empty-state"><h1>مقایسه را از انتخاب مدل‌ها شروع کنید</h1><p>کنار هر محصول روی «مقایسه» بزنید.</p><a class="button primary" href="#api">انتخاب محصول</a></div>';
    return;
  }
  const same = rows.every((p) => p.task === rows[0].task && p.unit === rows[0].unit);
  const fields = [
    ['کاربرد', (p) => tasks[p.task]],
    ['سازنده', (p) => esc(p.maker)],
    [
      'حافظه متن / حافظه',
      (p) =>
        p.kind === 'gpu'
          ? p.vram
            ? num(p.vram) + ' GB / GPU'
            : 'با استعلام'
          : p.context
            ? num(p.context) + ' توکن'
            : 'طبق مستندات'
    ],
    ['خروجی', (p) => esc(p.output_type || tasks[p.task])],
    [
      'قابل دانلود و اجرای شخصی',
      (p) =>
        p.kind === 'gpu'
          ? '—'
          : p.weight_offers?.length
            ? 'با خرید مجوز'
            : p.weights_url
              ? 'دریافت طبق مجوز'
              : 'عرضه نشده'
    ],
    ['مجوز', (p) => esc(p.license || '—')],
    ['تخصص فارسی', (p) => (p.persian_specialist ? esc(p.capability.language_detail) : 'مدل عمومی')],
    [
      'وزن‌های تجاری / یک‌باره',
      (p) =>
        p.weight_offers?.length
          ? money(weightQuote(p).best.estimate_toman)
          : p.weights_url
            ? 'دریافت طبق مجوز سازنده'
            : 'عرضه نشده'
    ],
    [
      'تعرفه پیشنهاد منتخب',
      (p) => {
        const quote = catalogQuote(p, {...state, provider:'', ssh:false, access:''});
        const r = quote.best ? rate(p, [{...quote.best,...quote.best.effective_rates}]) : null;
        return r
          ? money(r.value) + `<small>${priceLabel(p, r)}</small>`
          : p.weights_url
            ? 'دریافت وزن‌ها'
            : 'با استعلام';
      }
    ],
    [
      same ? 'هزینه با مصرف یکسان' : 'هزینه برای مصرف نمونه هر کاربرد',
      (p) => {
        const quote = catalogQuote(p, {...state, provider:'', ssh:false, access:''});
        return quote.best
          ? money(quote.best.estimate_toman) + `<small>${esc(quote.best.seller)}</small>`
          : 'قابل محاسبه نیست';
      }
    ],
    ['مبنای محاسبه', (p) => usageText(p)],
    ['ارائه‌دهنده‌ها', (p) => num(new Set((p.offers || []).map((o) => o.seller_id)).size)],
    [
      'شرایط کلیدی',
      (p) =>
        p.kind === 'gpu' ? 'دسترسی، دیسک و دوره اجاره' : 'سقف درخواست، انقضای اعتبار و نسخه مدل'
    ]
  ];
  $('main').innerHTML = /* HTML */ `<section class="catalog-heading">
      <div>
        <p class="breadcrumb"><a href="${esc(catalogURL)}">torobai</a> / مقایسه</p>
        <h1>انتخاب‌ها را کنار هم ببینید.</h1>
        <p>
          ${same ? 'هزینه‌ها با مصرف یکسان محاسبه شده‌اند؛ قیمت مجوز فایل مدل جداست.' : 'این محصولات کاربرد یا واحد متفاوت دارند؛ قیمت‌ها رتبه‌بندی مستقیم نمی‌شوند.'}
        </p>
      </div>
      <a class="button secondary" href="${esc(catalogURL)}">افزودن انتخاب ${icon('arrow')}</a>
    </section>
    ${benchmarkComparisonLink(rows)}
    <div class="comparison-scroll">
      <table class="comparison-table">
        <thead>
          <tr>
            <th scope="col">${num(rows.length)} انتخاب</th>
            ${rows.map((p) => `<th scope="col"><button class="remove-compare" data-compare="${p.id}" aria-label="حذف ${esc(p.title)}">×</button>${stage(p)}<a class="compare-title" href="${href(p)}" dir="auto">${esc(p.title)}</a><p>${esc(p.description)}</p></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${fields.map(([label, fn]) => `<tr><th scope="row">${label}</th>${rows.map((p) => `<td>${fn(p)}</td>`).join('')}</tr>`).join('')}
          <tr>
            <th scope="row">ادامه انتخاب</th>
            ${rows.map((p) => `<td><a class="button primary" href="${href(p)}">مشاهده محصول ${icon('arrow')}</a></td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>`;
  document.title = 'مقایسه محصولات | torobai';
}
async function route({ url = location.hash || '#api', writeHistory = false } = {}) {
  if (pendingNavigation === url) return;
  cancelGPUMatch();
  const previousState = state;
  const nextState = readState(url);
  const catalogPage = (view) => ['api', 'fa', 'gpu', 'saved'].includes(view.path);
  const sameProduct = Boolean(selected && state.path === nextState.path);
  const sameDirectory = state.path === nextState.path && (['studio','manage','samples','gpu-match','benchmarks','watchlist','notifications'].includes(state.path) || state.path === 'providers' || state.path.startsWith('providers/'));
  const preserve = (catalogPage(state) && catalogPage(nextState)) || sameProduct || sameDirectory;
  const request = ++version;
  pendingNavigation = url;
  const usageForm = $('catalogUsageForm');
  if (usageForm?.dataset.updating === 'true') {
    setCatalogBusy(usageForm, false);
    $('catalogUsagePending').textContent = '';
  }
  if ($('listingForm')) rememberListing();
  if ($('infoDialog').open) closeDialog();
  const main = $('main');
  let rollback, viewport;
  try {
    setNavigationBusy(false);
    let prepared = null;
    if (sameProduct) {
      prepared = {};
      const p = selected;
      const weights = (nextState.access === 'weights' || !p.offers.length) && (p.weight_offers?.length || p.weights_url);
      const preset = p.kind === 'gpu' ? nextState.rental : nextState.usageUnit === p.unit && Object.keys(nextState.usage).length ? 'custom' : 'standard';
      const values = p.kind === 'api' && (preset === 'custom' || nextState.requestMode === 'batch') ? catalogValues(p, nextState) : undefined;
      if (!weights) {
        prepared.data = cachedEstimate(p, preset, values);
        if (!prepared.data) {
          setNavigationBusy(true);
          try { prepared.data = await estimate(p, preset, values); }
          catch (error) { prepared.error = error; }
        }
      }
    }
    if (request !== version) return;
    // Capture at commit, after any scrolling or focus movement during loading.
    viewport = { x: window.scrollX || 0, y: window.scrollY || 0 };
    const focused = document.activeElement;
    const rail = document.querySelector('.category-tabs, .bench-task-rail');
    const railLeft = rail?.scrollLeft || 0;
    rollback = { nodes: [...main.childNodes], className: main.className, minHeight: main.style.minHeight,
      title: document.title, selected, purchaseMode, activePreset, activeEstimate, sellerSort, sshOnly, catalogURL };
    main.style.minHeight = '';
    state = nextState;
    const rendered = renderRoute(request, url, prepared, preserve);
    if (request !== version) return;
    if (preserve) {
      const nextRail = document.querySelector('.category-tabs, .bench-task-rail');
      if (nextRail) nextRail.scrollLeft = railLeft;
      // A page-only change moves to its first card; filter/usage resets stay in place.
      const pageChanged = catalogPage(previousState) && catalogPage(state) &&
        previousState.path === state.path && previousState.page !== state.page &&
        filterURL({ ...previousState, page: 1 }) === filterURL({ ...state, page: 1 });
      if (pageChanged) scrollToFirstResult();
      else {
        restoreNavigationFocus(focused);
        restoreViewport(viewport.x, viewport.y);
      }
    }
    const targetURL = catalogPage(state) ? filterURL({ page: state.page }) : url;
    if (catalogPage(state)) catalogURL = targetURL;
    window.TorobChat?.contextChanged();
    try {
      if (writeHistory && location.hash !== targetURL) window.history?.pushState(null, '', targetURL);
      else if (location.hash !== targetURL) window.history?.replaceState(null, '', targetURL);
    } catch {
      // Keep the working screen on file-origin hosts; never trigger native hash navigation.
    }
    // Navigation is committed; independent product quotes keep their own skeleton.
    pendingNavigation = '';
    setNavigationBusy(false);
    await rendered;
  } catch {
    if (request !== version) return;
    state = previousState;
    if (rollback) {
      main.replaceChildren(...rollback.nodes);
      main.className = rollback.className;
      main.style.minHeight = rollback.minHeight;
      document.title = rollback.title;
      ({ selected, purchaseMode, activePreset, activeEstimate, sellerSort, sshOnly, catalogURL } = rollback);
      updateNavigation();
      restoreViewport(viewport.x, viewport.y);
    }
    toast('به‌روزرسانی صفحه انجام نشد. دوباره انتخاب کنید.');
  } finally {
    if (request === version) {
      pendingNavigation = '';
      setNavigationBusy(false);
    }
  }
}

function updateNavigation() {
  for (const id of ['faNav', 'publishNav', 'apiNav', 'gpuNav', 'providersNav', 'recentNav', 'benchmarksNav'])
    $(id)?.removeAttribute('aria-current');
  const current = state.path === 'benchmarks' ? 'benchmarksNav' :
    ['publish','studio'].includes(state.path)
      ? 'publishNav'
      : state.path === 'providers' || state.path.startsWith('providers/')
        ? 'providersNav'
        : state.path === 'recent'
          ? 'recentNav'
          : ['saved', 'requests', 'compare', 'watchlist', 'reports', 'manage', 'samples', 'gpu-match', 'notifications'].includes(state.path)
            ? ''
            : state.persian
              ? 'faNav'
              : state.kind === 'gpu'
                ? 'gpuNav'
                : 'apiNav';
  $(current)?.setAttribute('aria-current', 'page');
  window.TorobMotion.setOpen($('personalMenu'), false);
  $('searchInput').value = state.query;
}

function renderRoute(request, url, prepared, preserve) {
  window.TorobMotion.settle();
  cancelGPUMatch();
  $('main').classList.remove('weights-view', 'catalog-page');
  selected = null;
  updateNavigation();
  // Opening another destination starts at its heading, before asynchronous offers.
  if (!preserve) window.scrollTo({ top: 0, behavior: 'instant' });
  if (state.path === 'not-found') {
    $('main').innerHTML =
      '<div class="empty-state"><h1>این صفحه پیدا نشد</h1><p>آدرس را بررسی کنید یا به فهرست مدل‌ها برگردید.</p><a href="#api" class="button primary">دیدن مدل‌ها</a></div>';
    document.title = 'صفحه پیدا نشد | torobai';
  } else if (state.path === 'publish') renderPublisher();
  else if (state.path === 'requests') renderRequests();
  else if (state.path === 'watchlist') renderWatchlist();
  else if (state.path === 'reports') renderReports();
  else if (state.path === 'studio') renderStudio();
  else if (state.path === 'manage') renderManagement();
  else if (state.path === 'samples') renderSamples();
  else if (state.path === 'gpu-match') renderGPUMatcher();
  else if (state.path === 'benchmarks') renderBenchmarks();
  else if (state.path === 'notifications') renderNotifications();
  else if (state.path.startsWith('providers/')) renderProvider(state.path.split('/')[1]);
  else if (state.path.includes('/')) {
    const rendering = openProduct(state.path.split('/')[1], request, prepared);
    renderTray();
    return rendering;
  }
  else if (state.path === 'compare') renderComparison();
  else if (state.path === 'providers') renderProviders();
  else if (state.path === 'recent') renderRecent();
  else {
    catalogURL = url;
    renderCatalog({ syncURL: false });
  }
  if (request === version) renderTray();
}
async function changePreset(key) {
  if (!selected) return;
  cancelNavigation();
  const request = ++version,
    p = selected;
  activePreset = key;
  if (p.kind === 'gpu') { state.rental = key; syncDetailURL(); }
  const panel = document.querySelector('.budget-panel');
  panel.outerHTML = budgetPanel(p);
  const values = p.kind === 'api' && state.requestMode === 'batch' ? {...scenario(p,key), request_mode:'batch'} : undefined;
  const ready = cachedEstimate(p, key, values);
  if (!ready) {
    invalidateEstimate('در حال محاسبه مصرف انتخابی…');
    $('offerList').setAttribute('aria-busy', 'true');
  }
  try {
    if (p.kind === 'api') { state.usageUnit = p.unit; state.usage = scenario(p,key); syncDetailURL(); }
    const data = ready || await estimate(p, key, values);
    if (request !== version) return;
    activeEstimate = data;
    renderOffers();
    renderCostChart(p, request);
  } catch (e) {
    if (request === version) quoteError(e.message);
  } finally {
    if (request === version) $('offerList').removeAttribute('aria-busy');
  }
}
async function submitBudget(form) {
  if (!selected) return;
  const values = readUsage(form, 'budgetError');
  if (!values) return;
  cancelNavigation();
  if (selected.kind === 'api') {
    state.requestMode = form.querySelector('[name=request_mode]').value;
    if (state.requestMode === 'batch') values.request_mode = 'batch';
    state.usageUnit = selected.unit;
    state.usage = Object.fromEntries(Object.entries(values).filter(([key])=>fieldInfo[key]));
    syncDetailURL();
  }
  activePreset = 'custom';
  const request = ++version,
    p = selected;
  const ready = cachedEstimate(p, 'custom', values);
  if (!ready) invalidateEstimate('در حال محاسبه…');
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = !ready;
  $('budgetError').hidden = true;
  try {
    const data = ready || await estimate(p, 'custom', values);
    if (request !== version) return;
    activeEstimate = data;
    renderOffers();
    renderCostChart(p, request);
    toast('هزینه فروشنده‌ها با مصرف شما محاسبه شد.');
  } catch (e) {
    if (request === version) {
      quoteError(e.message);
      $('budgetError').textContent = e.message;
      $('budgetError').hidden = false;
    }
  } finally {
    if (request === version) submit.disabled = false;
  }
}
function guide() {
  if (window.TorobChat) {
    window.TorobMotion.setOpen($('personalMenu'), false);
    return window.TorobChat.open();
  }
  window.TorobMotion.setOpen($('personalMenu'), false);
  showDialog(
    'کدام روش استفاده مناسب شماست؟',
    `<div class="guide-grid"><section><span>${icon('chat')}</span><h3>آنلاین با API</h3><p>مدل روی سرور ارائه‌دهنده اجرا می‌شود. برنامه شما درخواست می‌فرستد و به اندازه مصرف هزینه می‌پردازید.</p><a href="#${state.persian ? 'fa' : 'api'}?access=api" class="text-link">دیدن مدل‌های دارای API ${icon('arrow')}</a></section><section><span>${icon('layers')}</span><h3>اجرا با فایل مدل</h3><p>وزن‌ها، فایل‌های آموزش‌دیده مدل هستند. آن‌ها را روی سرور خودتان اجرا می‌کنید؛ مجوز استفاده و هزینه سرور را هم در نظر بگیرید.</p><a href="#${state.persian ? 'fa' : 'api'}?access=weights" class="text-link">دیدن فایل‌های قابل دریافت ${icon('arrow')}</a></section></div><p class="guide-note">برای مقایسه قیمت، مدل‌هایی با کاربرد یکسان انتخاب کنید. ارزان‌تر بودن به معنی کیفیت بالاتر نیست.</p>`
  );
}

$('saveIcon').innerHTML = icon('heart');
$('guideButton').addEventListener('click', guide);
$('aboutButton').addEventListener('click', () =>
  showDialog(
    'روش مقایسه قیمت‌ها',
    '<p>torobai موتور جستجو و مقایسه پیشنهادهای عرضه‌کنندگان مدل، API و GPU است. خرید، پرداخت و دریافت سرویس با عرضه‌کننده انجام می‌شود. برای مدل‌های اختصاصی، ابتدا شرایط API یا مجوز وزن‌ها را بررسی کنید. درخواست‌های خرید در همین مرورگر نگه داشته می‌شوند؛ فایل درخواست را برای هماهنگی خرید به سازنده بدهید.</p><p>تعرفه مبنا، هزینه مصرف و حداقل شارژ سه مفهوم متفاوت‌اند. محاسبه‌ها هزینه جانبی یا کیفیت یکسان سرویس‌ها را تضمین نمی‌کنند.</p><p>وزن‌باز به معنی یکسان بودن مجوزها نیست؛ لینک مجوز و صفحه رسمی مدل را در مشخصات ببینید.</p>'
  )
);
$('closeDialog').addEventListener('click', () => closeDialog());
$('infoDialog').addEventListener('click', (e) => {
  if (e.target.closest('a[href^="#"]')) closeDialog();
});
$('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  closeSearchSuggestions();
  state = {
    ...state,
    kind: selected?.kind || state.kind,
    saved: false,
    sort: 'selected',
    access: '',
    publisher: '',
    task: '',
    maker: '',
    provider: '',
    open: false,
    multiple: false,
    ssh: false,
    priced: false,
    vram: 0,
    context: 0
    ,json:false, tools:false, streaming:false, no_retention:false, usecase:'', maxCost:null
  };
  navigateFilters({ query: $('searchInput').value.trim() });
});
document.addEventListener('click', (e) => {
  const detailTab = e.target.closest('.detail-tabs [data-detail-tab]');
  if (detailTab) {
    e.preventDefault();
    selectDetailTab(detailTab.dataset.detailTab);
    return;
  }
  if (e.target.closest('.skip-link')) {
    e.preventDefault();
    $('main').focus();
    $('main').scrollIntoView();
    return;
  }
  const sort = e.target.closest('[data-sort]');
  if (sort) {
    if (state.kind === 'api' && !state.task && ['price', 'price-desc'].includes(sort.dataset.sort))
      choosePriceTask(sort.dataset.sort);
    else navigateFilters({ sort: sort.dataset.sort });
    return;
  }
  const toggle = e.target.closest('[data-toggle-filter]');
  if (toggle) {
    navigateFilters({ [toggle.dataset.toggleFilter]: !state[toggle.dataset.toggleFilter] });
    return;
  }
  const remove = e.target.closest('[data-remove-filter]');
  if (remove) {
    navigateFilters({
      [remove.dataset.removeFilter]: remove.dataset.removeFilter === 'maxCost' ? null : '',
      ...(remove.dataset.removeFilter === 'task' ? { sort: 'selected', usecase: '' } : {})
    });
    return;
  }
  const uptime = e.target.closest('[data-uptime-product]');
  if (uptime) {
    const p = products.find((x) => x.id === uptime.dataset.uptimeProduct);
    showDialog(esc(p.title), uptimeSection(p));
    return;
  }

  const save = e.target.closest('[data-save]');
  if (save) {
    toggleSave(save.dataset.save);
    return;
  }
  const compare = e.target.closest('[data-compare]');
  if (compare) {
    toggleCompare(compare.dataset.compare);
    return;
  }
  const scroll = e.target.closest('[data-scroll]');
  if (scroll) {
    e.preventDefault();
    const panel = $(scroll.dataset.scroll)?.closest('.detail-panel');
    if (panel) selectDetailTab(panel.id.replace('detail-panel-', ''), false);
    $(scroll.dataset.scroll)?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start'
    });
    return;
  }
  const clipboard = e.target.closest('[data-copy]');
  if (clipboard) {
    copy(clipboard.dataset.copy);
    return;
  }
  const preset = e.target.closest('[data-preset]');
  if (preset) {
    changePreset(preset.dataset.preset);
    return;
  }
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'reset') {
    e.preventDefault();
    navigate(state.saved ? '#saved' : state.persian ? '#fa' : '#' + state.kind);
  }
  if (action === 'normal-mode' && selected) {
    const form = $('budgetForm');
    form.querySelector('[name=request_mode] option[value=instant]').selected = true;
    submitBudget(form);
  }
  if (action === 'reset-usage') applyCatalogUsage($('catalogUsageForm'), true);
  if (action === 'filters') openFilters();
  if (action === 'guide') {
    e.preventDefault();
    guide();
  }
  if (action === 'usage') {
    selectDetailTab('prices', false);
    window.TorobMotion.setOpen($('usageDetails'), true);
    $('usageDetails').scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'center'
    });
  }
  if (action === 'all-providers') {
    e.preventDefault();
    state.provider = '';
    document.querySelector('.provider-selection-note')?.remove();
    syncDetailURL();
    if (purchaseMode === 'weights') renderWeightOffers(selected);
    else {
      renderOffers();
      renderCostChart(selected, version);
    }
  }
  if (action === 'close-dialog') closeDialog();
  if (action === 'clear-recent') {
    recent = [];
    if (!persist()) toast('سابقه فقط در همین صفحه پاک شد؛ تغییر در مرورگر ذخیره نشد.');
    renderRecent();
  }
  if (action === 'retry') route();
  if (action === 'retry-estimate') {
    if (activePreset === 'custom' && $('budgetForm')) submitBudget($('budgetForm'));
    else changePreset(activePreset);
  }
  if (action === 'share') copy(shareText());
});
document.addEventListener('change', (e) => {
  if (e.target.dataset.filter) {
    const key = e.target.dataset.filter;
    navigateFilters({
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
    });
  }
  if (e.target.id === 'pageSize') {
    const size = Number(e.target.value);
    try { storage?.setItem('torobai.page-size', String(size)); } catch {}
    navigateFilters({size});
  }
  if (e.target.id === 'detailMode') {
    cancelNavigation();
    ++version;
    $('offerList')?.removeAttribute('aria-busy');
    e.target.closest('form').querySelector('[type=submit]').disabled = false;
    activePreset = 'custom';
    invalidateEstimate('روش پردازش تغییر کرده؛ محاسبه هزینه را بزنید.');
  }
  if (e.target.id === 'catalogMode') markCatalogUsagePending(e.target.closest('form'));
  if (e.target.id === 'sellerSort') {
    sellerSort = e.target.value;
    renderOffers();
  }
  if (e.target.id === 'sshOffers') {
    sshOnly = e.target.checked;
    state.ssh = sshOnly;
    syncDetailURL();
    renderOffers();
    renderCostChart(selected, version);
  }
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'catalogUsageForm') {
    e.preventDefault();
    applyCatalogUsage(e.target);
  }
  if (e.target.id === 'pageJump') {
    e.preventDefault();
    const page = parseNumber(e.target.querySelector('input').value, Number(e.target.dataset.max), true, 1);
    if (page) navigateFilters({page}); else toast('شماره صفحه را در محدوده نتایج وارد کنید.');
  }
  if (e.target.id === 'filterForm') {
    e.preventDefault();
    const form = e.target;
    const budget = form.querySelector('[name="maxCost"]');
    const maxCost = budget?.value.trim() ? parseNumber(budget.value, 1e12, false) : null;
    if (budget?.value.trim() && maxCost == null) { $('filterError').hidden = false; $('filterError').textContent = 'سقف هزینه را به تومان وارد کنید.'; return; }
    const task = form.querySelector('[name=task]')?.value || state.task;
    if (maxCost != null && state.kind === 'api' && !task) { $('filterError').hidden = false; $('filterError').textContent = 'برای مقایسه هزینه، کاربرد را انتخاب کنید.'; return; }
    const updates = {maxCost, task};
    for (const name of ['maker', 'provider', 'vram', 'context', 'publisher', 'usecase']) {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) updates[name] = input.value;
    }
    for (const name of ['open', 'ssh', 'multiple', 'priced',...Object.keys(capabilityLabels)]) {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) updates[name] = input.checked;
    }
    closeDialog();
    navigateFilters(updates);
  }

  if (e.target.id === 'budgetForm') {
    e.preventDefault();
    submitBudget(e.target);
  }
});
function invalidateEstimate(message) {
  if (!activeEstimate) return;
  activeEstimate = {
    ...activeEstimate,
    offers: activeEstimate.offers.map((o) => ({
      ...o,
      estimate_toman: null,
      estimate_reason: message
    }))
  };
  renderOffers();
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#catalogUsageForm')) markCatalogUsagePending(e.target.closest('form'));
  if (e.target.closest('#budgetForm')) {
    cancelNavigation();
    ++version;
    $('offerList')?.removeAttribute('aria-busy');
    e.target.closest('form').querySelector('[type=submit]').disabled = false;
    document
      .querySelectorAll('[data-preset]')
      .forEach((b) => b.setAttribute('aria-pressed', 'false'));
    activePreset = 'custom';
    invalidateEstimate('برای مصرف جدید، محاسبه را بزنید.');
    const summary = $('budgetSummary');
    if (summary)
      summary.innerHTML =
        '<p class="pending-note">مصرف تغییر کرده؛ برای به‌روزرسانی پیشنهادها، محاسبه را بزنید.</p>';
  }
});
// Retain real hrefs for sharing/new tabs; ordinary activation uses the in-place router.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button > 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  const link = e.target.closest('a[href^="#"]');
  if (!link || link.hasAttribute('download') || link.target === '_blank' ||
      link.matches('[data-action], [data-scroll], .skip-link')) return;
  const url = link.getAttribute('href');
  if (!/^#(?:api|fa|gpu|saved|recent|providers|compare|publish|requests|watchlist|reports|studio|manage|samples|gpu-match|benchmarks|notifications)(?:[/?]|$)/.test(url)) return;
  e.preventDefault();
  navigate(url);
});
try { window.history.scrollRestoration = 'manual'; } catch {}
window.addEventListener('hashchange', () => {
  if (catalog) route();
});
document.addEventListener('keydown', (e) => {
  const tab = e.target.closest?.('.detail-tabs [role="tab"]');
  if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(tab);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 :
      (index + (e.key === 'ArrowLeft' ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault();
    selectDetailTab(tabs[next].dataset.detailTab, true, true);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    $('searchInput').focus();
  }
});
async function start() {
  try {
    if (window.TOROBAI_CATALOG) catalog = window.TOROBAI_CATALOG;
    else {
      const response = await fetch('/api/catalog');
      if (!response.ok) throw new Error();
      catalog = await response.json();
    }
    products = catalog.products;
    initMarket();
    const known = products.map((p) => p.id);
    saved = HB.readIDs(storage, 'hb.saved', known);
    comparison = HB.readIDs(storage, 'hb.compare', known, 3);
    recent = HB.readIDs(storage, 'torobai.recent', known, 12);
    $('searchSuggestions').innerHTML = products
      .map((p) => `<option value="${esc(p.title)}"></option>`)
      .join('');
    persist();
    await route();
    window.TorobChat?.mount({
      snapshot: () => ({products, state, revision: marketRevision}),
      rows: catalogRows, quote: catalogQuote, values: catalogValues, usageText,
      listURL: catalogFilterURL, productURL: href, navigate, money, logo,
      tasks, usageFields: HB.usageFields, fieldInfo, usageInputs,
      parameterGuess: gpuParameterGuess, memoryParts: gpuMemoryParts,
    });
  } catch {
    $('main').innerHTML =
      '<div class="empty-state"><h1>دریافت کاتالوگ انجام نشد</h1><p>ارتباط را بررسی کنید و دوباره تلاش کنید.</p><button class="button primary" id="retryCatalog">تلاش دوباره</button></div>';
    $('retryCatalog').addEventListener('click', start);
  }
}
function uptimeMini(offer) {
  if(!catalog.presentation_reliability.offers[offer.id])return '';
  const days = catalog.presentation_reliability.offers[offer.id].daily.slice(-4);
  return `<span class="uptime-mini" aria-hidden="true">${days.map((d) => `<i class="uptime-${uptimeLevel(d.percent)}"></i>`).join('')}</span>`;
}
function uptimeValue(offer) {
  return catalog.presentation_reliability.offers[offer.id]?.percent ?? null;
}
function accessFilters() {
  return `<div class="access-filter" role="group" aria-label="روش استفاده از مدل"><span>نوع دسترسی:</span>${[
    ['', 'همه'],
    ['api', 'دسترسی API'],
    ['weights', 'فایل مدل']
  ]
    .map(
      ([key, label]) =>
        `<button data-access-filter="${key}" aria-pressed="${state.access === key}">${label}</button>`
    )
    .join('')}</div>`;
}

function weightQuote(p, view = {}) {
  const rows = (p.weight_offers || [])
    .filter((w) => w.price_toman != null && w.availability !== 'unavailable' && (!view.provider || w.seller_id === view.provider))
    .sort((a, b) => a.price_toman - b.price_toman);
  const w = rows[0];
  return {
    best: w
      ? { ...w, estimate_toman: w.price_toman }
      : p.weights_url && !view.provider
        ? { estimate_toman: 0, seller: p.maker }
        : null,
    max: rows.at(-1)?.price_toman ?? (p.weights_url ? 0 : null)
  };
}
function purchaseTabs(p) {
  if (p.kind === 'gpu') return '';
  const hasWeights = p.weights_url || p.weight_offers?.length;
  return `<nav class="purchase-tabs" aria-label="روش دریافت این مدل">${p.offers.length ? `<a href="${esc(href(p, { ...state, access: '' }))}" aria-current="${purchaseMode === 'api' ? 'page' : 'false'}" title="${p.offers.every(o => o.access_scope === 'noncommercial') ? 'دسترسی پژوهشی' : 'پرداخت به اندازه مصرف'}">${icon('chat')}<span>دسترسی API</span><b class="tab-count" aria-label="${fa(p.offers.length)} پیشنهاد">${num(p.offers.length)}</b></a>` : ''}${hasWeights ? `<a href="${esc(href(p, { ...state, access: 'weights', provider: p.weight_offers?.some(w => w.seller_id === state.provider) ? state.provider : '' }))}" aria-current="${purchaseMode === 'weights' ? 'page' : 'false'}" title="دریافت فایل و اجرا روی زیرساخت خودتان">${icon('layers')}<span>${p.weight_offers?.length ? 'خرید وزن‌ها' : 'دریافت وزن‌ها'}</span></a>` : ''}</nav>`;
}
function accessNotice(o) {
  return o.access_note
    ? `<p class="offer-access-note ${o.access_scope === 'noncommercial' ? 'noncommercial' : ''}">${esc(o.access_note)}</p>`
    : '';
}
function sellerAction(p, o, cls = 'button primary') {
  if (o.request_only)
    return `${accessNotice(o)}<button class="${cls}" data-inquire="${p.id}" data-deal="${o.id}" data-mode="api">درخواست دسترسی API ${icon('arrow')}</button>`;
  return external(
    o.source_url,
    o.availability === 'unavailable'
      ? 'بررسی موجودی در ' + esc(o.seller)
      : p.kind === 'gpu'
        ? 'اجاره از ' + esc(o.seller)
        : 'خرید از ' + esc(o.seller),
    cls
  );
}
function licenseDetails(w) {
  return `<dl class="license-facts"><div><dt>مدت مجوز</dt><dd>${esc(w.license_term)}</dd></div><div><dt>استفاده تجاری</dt><dd>${w.commercial_use ? 'مجاز' : 'غیرمجاز'}</dd></div><div><dt>تغییر و تنظیم مدل</dt><dd>${w.modification ? 'مجاز' : 'با توافق جداگانه'}</dd></div><div><dt>بازفروش وزن‌ها</dt><dd>${w.redistribution ? 'طبق قرارداد' : 'مجاز نیست'}</dd></div><div><dt>انحصار</dt><dd>${w.exclusive ? 'انحصاری' : 'غیرانحصاری'}</dd></div><div><dt>داده آموزشی همراه مدل</dt><dd>${w.includes_training_data ? 'دارد' : 'خیر'}</dd></div></dl>`;
}
function renderWeightOffers(p) {
  $('sellers').hidden = false;
  const rows = (p.weight_offers || [])
    .filter(
      (w) => w.price_toman != null && w.availability !== 'unavailable' && (!selectedProvider() || w.seller_id === selectedProvider())
    )
    .sort((a, b) => a.price_toman - b.price_toman);
  const w = rows[0];
  const target = $('featuredOffer');
  target.removeAttribute('data-offer-id');
  target.removeAttribute('data-weight-offer-id');
  if (!w && (p.weight_offers?.length || selectedProvider())) {
    target.innerHTML =
      '<div class="empty-state compact"><h2>مجوزی با این انتخاب پیدا نشد</h2><p>برای دیدن شرایط دریافت فایل، فیلتر ارائه‌دهنده را بردارید.</p><button class="button secondary" data-action="all-providers">نمایش همه ارائه‌دهندگان</button></div>';
    $('sellers').hidden = true;
    return;
  }
  if (w) {
    target.dataset.weightOfferId = w.id;
    target.innerHTML = `<div class="featured-topline"><span class="best-label">${icon('layers')} خرید وزن‌های مدل</span><span>${esc(w.license_name)}</span></div><div class="featured-provider">${logo({ ...w.seller_info, name:w.seller })}<div><small>عرضه‌کننده</small><h2>${sellerLink(w)}</h2></div></div><div class="featured-price"><strong>${money(w.price_toman)}</strong><span>پرداخت یک‌باره · مجوز غیرانحصاری</span></div>${licenseDetails(w)}<button class="button primary featured-buy" data-inquire="${p.id}" data-deal="${w.id}" data-mode="weights">درخواست خرید وزن‌ها ${icon('arrow')}</button><p class="featured-basis">فایل مدل و مجوز استفاده دریافت می‌کنید؛ مالکیت مدل و داده آموزشی منتقل نمی‌شود.</p>${offerEvidence(p, w, "weights")}`;
  } else {
    target.innerHTML = `<div class="featured-topline"><span class="best-label">${icon('layers')} وزن‌های منتشرشده</span></div><h2>دریافت از سازنده</h2><div class="featured-price"><strong>رایگان</strong><span>طبق مجوز ${esc(p.license)}</span></div><p>${esc(p.capability?.limitations || 'شرایط مجوز و راهنمای اجرای مدل را پیش از استفاده بخوانید.')}</p>${external(p.weights_url, 'مشاهده فایل‌ها و مجوز', 'button primary featured-buy')}<div class="local-execution">${icon('chip')} اجرای محلی؛ هزینه سرور جداست</div>`;
  }
  $('sellerSectionTitle').textContent = 'فایل‌ها و شرایط دریافت';
  const priceTab = document.querySelector('[data-price-section]');
  if (priceTab) priceTab.textContent = 'فایل و شرایط دریافت';
  $('offerCount').textContent = '';
  $('offerList').innerHTML = w
    ? `<div class="delivery-grid"><div>${icon('layers')}<h3>آنچه دریافت می‌کنید</h3><p>${esc(w.format)}</p><small>${esc(w.delivery)}</small></div><div>${icon('chip')}<h3>نیاز سخت‌افزاری</h3><p>${esc(w.requirements)}</p><a href="#gpu?ssh=1" class="text-link">انتخاب سرور مناسب ${icon('arrow')}</a></div><div>${icon('chat')}<h3>پشتیبانی و نسخه‌ها</h3><p>${esc(w.support)}</p><small>${esc(w.updates)}</small></div></div>${rows
        .slice(1)
        .map(
          (other) =>
            `<article class="weight-license"><h3>${sellerLink(other)}</h3><strong>${money(other.price_toman)}</strong>${licenseDetails(other)}<button class="button secondary" data-inquire="${p.id}" data-deal="${other.id}" data-mode="weights">درخواست خرید</button>${offerEvidence(p, other, "weights")}</article>`
        )
        .join('')}`
    : `<div class="delivery-grid"><div><h3>مجوز استفاده</h3><p>${esc(p.license)}</p></div><div><h3>فایل و راهنمای اجرا</h3>${external(p.weights_url, 'مخزن سازنده')}</div><div><h3>اجرای محلی</h3><p>${esc(p.capability?.hardware || 'نیاز سخت‌افزاری را در راهنمای مدل بررسی کنید.')}</p></div></div>`;
}
function modelProfile(p) {
  const c = p.capability;
  if (!c) return '';
  return `<section class="model-profile"><div class="section-heading"><div><span class="section-kicker">شناسنامه مدل فارسی</span><h2>کاربرد و شرایط مدل</h2></div><span class="publisher-chip">${p.publisher_type === 'person' ? 'سازنده مستقل' : 'گروه و شرکت'} · ${esc(p.maker)}</span></div><div class="profile-grid"><div><span>مدل پایه و روش آموزش</span><h3 dir="auto">${esc(c.base_model)}</h3><p>${esc(c.training_method)}</p></div><div><span>زبان و دامنه کاربرد</span><h3>${esc(c.language_detail)}</h3><p>${esc(p.description)}</p></div><div><span>داده آموزشی</span><p>${esc(c.training_data)}</p></div><div><span>حریم خصوصی</span><p>${esc(c.privacy)}</p></div></div>${c.input_example ? `<details class="model-example"><summary>نمونه ورودی و خروجی ${icon('arrow')}</summary><div class="example-pair"><div><span>ورودی نمونه</span><p dir="auto">${esc(c.input_example)}</p></div><div><span>قالب خروجی نمونه</span><p dir="auto">${esc(c.output_example)}</p></div></div><p class="small">این نمونه برای آشنایی با کاربرد است؛ اجرای زنده روی فایل شما نیست.</p></details>` : ''}<div class="profile-note"><strong>ارزیابی و محدودیت‌ها</strong><p>${esc(c.limitations)}</p><p>${esc(c.evaluation)}</p></div></section>`;
}
function localRecords(key) {
  try {
    const a = JSON.parse(storage?.getItem(key) || '[]');
    return Array.isArray(a)
      ? a
          .filter(
            (x) =>
              x &&
              typeof x === 'object' &&
              typeof x.id === 'string' &&
              (key !== 'torobai.requests' ||
                (['api', 'weights'].includes(x.access) &&
                  typeof x.product_id === 'string' &&
                  x.terms &&
                  typeof x.terms === 'object' &&
                  !Array.isArray(x.terms) &&
                  Number.isFinite(
                    x.access === 'weights'
                      ? x.terms.price_toman
                      : (x.terms.toman_input_m ?? x.terms.toman_unit)
                  )))
          )
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
function saveRecords(key, records) {
  try {
    if (!storage) throw new Error();
    storage.setItem(key, JSON.stringify(records));
    return true;
  } catch {
    toast('ذخیره در مرورگر ممکن نشد. فایل را دانلود کنید تا اطلاعات از دست نرود.');
    return false;
  }
}
function downloadRecord(filename, data, readable = false) {
  const url = URL.createObjectURL(
    new Blob([readable ? '\ufeff' + data : JSON.stringify(data, null, 2)], {
      type: readable ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8'
    })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function requestText(r) {
  const t = {...r.terms, ...r.terms.effective_rates};
  const unit = unitLabels[r.unit || t.unit] || 'واحد ثبت‌شده';
  const rateText =
    r.access === 'weights'
      ? `${fa(t.price_toman)} تومان / یک‌باره\nمجوز: ${t.license_name}\nمدت: ${t.license_term}\nاستفاده تجاری: ${t.commercial_use ? 'مجاز' : 'غیرمجاز'}\nتغییر مدل: ${t.modification ? 'مجاز' : 'نیازمند توافق'}\nبازنشر: ${t.redistribution ? 'طبق قرارداد' : 'غیرمجاز'}\nتحویل: ${t.format}\nسخت‌افزار: ${t.requirements}\nپشتیبانی: ${t.support}`
      : `تعرفه: ${fa(t.toman_input_m ?? t.toman_unit)} تومان / ${unit}${t.toman_output_m != null ? '\nخروجی: ' + fa(t.toman_output_m) + ' تومان / میلیون توکن' : ''}`;
  return `درخواست ${r.access === 'weights' ? 'خرید مجوز فایل مدل' : 'دسترسی API'}\nمدل: ${r.title}\nنسخه: ${r.version}\nعرضه‌کننده: ${r.seller}\nمتقاضی: ${r.organization}\nکاربرد: ${r.purpose}\n\n${rateText}${r.estimate_toman != null && r.usage_text ? '\nهزینه برای مصرف انتخابی: ' + fa(r.estimate_toman) + ' تومان\nمبنای محاسبه: ' + r.usage_text : ''}${t.request_mode === 'batch' ? '\nپردازش: Batch · تحویل تا ' + fa(t.batch.completion_hours) + ' ساعت · حداکثر ' + fa(t.batch.max_requests) + ' درخواست در هر دسته' : ''}${t.access_note ? '\nمحدودیت دسترسی: ' + t.access_note : ''}${t.service_terms ? '\nشرایط استفاده: ' + t.service_terms.use_scope + '\nسقف درخواست: ' + (t.service_terms.rate_limit || 'با استعلام') + '\nنگهداری داده: ' + t.service_terms.privacy : ''}\n\nوضعیت: ${r.status === 'exported_only' ? 'فایل درخواست؛ ارسال نشده' : 'ذخیره در مرورگر؛ ارسال نشده'}\nشناسه: ${r.id}\nتاریخ: ${r.created_at}\nقیمت نهایی و شرایط باید با عرضه‌کننده تایید شوند.\n`;
}
let requestDraft = null;
function inquiry(productID, mode, dealID, existing = null) {
  const p =
    products.find((x) => x.id === productID) ||
    (existing && {
      id: existing.product_id,
      title: existing.title,
      version: existing.version,
      kind: 'api',
      unit: existing.unit || existing.terms.unit
    });
  if (!p) return;
  const quote = selected?.id === p.id ? activeEstimate?.offers.find((x) => x.id === dealID) : null;
  const deal =
    existing?.terms ||
    (mode === 'weights'
      ? p.weight_offers.find((x) => x.id === dealID)
      : quote || p.offers.find((x) => x.id === dealID));
  if (!deal) return;
  requestDraft = existing || {
    id: 'req-' + Date.now(),
    product_id: p.id,
    title: p.title,
    version: p.version || p.model_id,
    unit: p.unit,
    access: mode,
    deal_id: deal.id,
    seller: deal.seller,
    terms: deal,
    ...(quote?.estimate_toman != null && mode === 'api'
      ? {
          estimate_toman: quote.estimate_toman,
          scenario: { ...activeEstimate.assumptions },
          usage_text: usageText(p, activeEstimate.assumptions)
        }
      : {}),
    status: 'saved_locally',
    created_at: new Date().toISOString()
  };
  showDialog(
    existing ? 'ویرایش درخواست' : 'درخواست ' + (mode === 'weights' ? 'خرید وزن‌ها' : 'دسترسی API'),
    `<form id="requestForm" data-product="${esc(p.id)}" data-mode="${esc(mode)}" data-deal="${esc(deal.id)}" class="request-form"><div class="request-product"><strong>${esc(requestDraft.title)}</strong><span>${esc(deal.seller)} · ${esc(requestDraft.version)}</span></div>${mode === 'weights' ? `<p class="request-price">${money(deal.price_toman)} · ${esc(deal.license_name)}</p>${licenseDetails(deal)}` : offerRate(deal, p) + batchTerms(deal) + accessNotice(deal) + offerTerms(deal, p)}${requestDraft.estimate_toman != null ? `<p class="request-price">هزینه مصرف انتخابی: ${money(requestDraft.estimate_toman)}</p><p class="small">${esc(requestDraft.usage_text)}</p>` : ''}<label>نام شما یا سازمان<input name="organization" maxlength="100" required autocomplete="organization" value="${esc(existing?.organization || '')}"></label><label>برای چه کاری به مدل نیاز دارید؟<textarea name="purpose" rows="3" maxlength="1000" required placeholder="کاربرد، حجم کار و نیازهای خود را توضیح دهید.">${esc(existing?.purpose || '')}</textarea></label><label class="request-check"><input name="terms" type="checkbox" required> شرایط ${mode === 'weights' ? 'مجوز و دریافت فایل' : 'مصرف و نگهداری داده'} را بررسی کرده‌ام.</label><p class="small">${existing ? 'قیمت و شرایط همان درخواست اولیه حفظ می‌شود. ' : ''}این درخواست در مرورگر ذخیره می‌شود. می‌توانید فایل آن را برای ارسال به ارائه‌دهنده دریافت کنید.</p><p id="requestError" class="form-error" role="alert" hidden></p><button type="submit" class="button primary">${existing ? 'ذخیره تغییرات' : 'ذخیره درخواست'} ${icon('arrow')}</button><button type="button" class="button secondary" data-download-request>دریافت متن بدون ذخیره</button></form>`
  );
}
function requestFromForm(form) {
  if (!requestDraft || requestDraft.deal_id !== form.dataset.deal) return;
  const organization = form.querySelector('[name=organization]').value.trim();
  const purpose = form.querySelector('[name=purpose]').value.trim();
  if (!organization || !purpose || !form.querySelector('[name=terms]').checked) {
    $('requestError').hidden = false;
    $('requestError').textContent = 'نام، کاربرد و تایید شرایط را کامل کنید.';
    return;
  }
  return { ...requestDraft, organization, purpose, updated_at: new Date().toISOString() };
}
function submitRequest(form) {
  const record = requestFromForm(form);
  if (!record) return;
  const records = localRecords('torobai.requests').filter((r) => r.id !== record.id);
  if (!saveRecords('torobai.requests', [record, ...records].slice(0, 100))) return;
  closeDialog();
  if (state.path === 'requests') renderRequests();
  else navigate('#requests');
  toast('درخواست ذخیره شد؛ هنوز برای ارائه‌دهنده ارسال نشده است.');
}
function requestPrice(r) {
  if (r.access === 'weights') return money(r.terms.price_toman) + ' · یک‌باره';
  if (r.estimate_toman != null) return money(r.estimate_toman) + ' · مصرف انتخابی';
  return (
    money(r.terms.toman_input_m ?? r.terms.toman_unit) +
    ' / ' +
    (unitLabels[r.unit || r.terms.unit] || 'واحد ثبت‌شده')
  );
}
function renderRequests() {
  document.title = 'درخواست‌های من | torobai';
  const records = localRecords('torobai.requests');
  $('main').innerHTML =
    `<section class="catalog-heading"><div><p class="breadcrumb">torobai / درخواست‌ها</p><h1>درخواست‌های من</h1><p>درخواست‌های ذخیره‌شده در این مرورگر؛ فایل هر درخواست را برای سازنده بفرستید.</p></div><a href="#api" class="button secondary">انتخاب مدل</a></section>${records.length ? `<div class="request-list">${records.map((r) => `<article><div><span class="draft-badge">ذخیره‌شده · ارسال نشده</span><h2 dir="auto">${esc(r.title)}</h2><p>${r.access === 'weights' ? 'خرید وزن‌ها' : 'دسترسی API'} · ${esc(r.seller)}</p><p>${esc(r.purpose)}</p><p class="request-price">${requestPrice(r)}</p><small>متقاضی: ${esc(r.organization)} · نسخه ${esc(r.version)}</small></div><div class="request-actions"><button class="button secondary" data-edit-request="${esc(r.id)}">مشاهده و ویرایش</button><button class="button primary" data-request-text="${esc(r.id)}">دریافت متن درخواست</button><button class="text-link" data-export-request="${esc(r.id)}">دریافت فایل JSON</button><button class="text-link" data-delete-request="${esc(r.id)}">حذف</button></div></article>`).join('')}</div>` : '<div class="empty-state"><h2>هنوز درخواستی ذخیره نکرده‌اید</h2><p>در صفحه مدل، پیشنهاد API یا مجوز فایل را انتخاب کنید.</p><a href="#api" class="button primary">انتخاب مدل</a></div>'}`;
}
let listingStep = 1,
  listingDraft = {};
const taskUnits = HB.taskUnits;
function readListing(form) {
  const d = { ...listingDraft };
  for (const el of form.querySelectorAll('[name]'))
    d[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
  d.unit = taskUnits[d.task];
  return d;
}
function listingFields(d) {
  const input = (name, label, placeholder = '', value = '') =>
    `<label>${label}<input name="${name}" value="${esc(d[name] ?? value)}" placeholder="${esc(placeholder)}" maxlength="${name === 'description' ? 240 : 150}"></label>`;
  const area = (name, label, placeholder) =>
    `<label class="full">${label}<textarea name="${name}" rows="3" maxlength="1200" placeholder="${esc(placeholder)}">${esc(d[name] || '')}</textarea></label>`;
  const check = (name, label) =>
    `<label class="request-check"><input type="checkbox" name="${name}" ${d[name] ? 'checked' : ''}>${label}</label>`;
  return `<fieldset data-listing-step="1"><legend tabindex="-1">مدل و سازنده</legend><div class="listing-grid">${input('title', 'نام مدل', 'مثلا آوانویس فارسی')}${input('publisher', 'نام سازنده یا شرکت')}<label>نوع سازنده<select name="publisher_type"><option value="person" ${d.publisher_type === 'person' ? 'selected' : ''}>شخص / توسعه‌دهنده مستقل</option><option value="company" ${d.publisher_type === 'company' ? 'selected' : ''}>گروه / شرکت</option></select></label><label>کاربرد اصلی<select name="task">${Object.entries(
    tasks
  )
    .filter(([k]) => k !== 'gpu')
    .map(([k, t]) => `<option value="${k}" ${d.task === k ? 'selected' : ''}>${t}</option>`)
    .join(
      ''
    )}</select></label>${input('version', 'نسخه مدل', 'مثلا 1.0', '1.0')}${input('base_model', 'مدل پایه', 'نام مدل پایه یا «آموزش از ابتدا»')}${input('base_license', 'مجوز مدل پایه', 'نام مجوز یا مجوز اختصاصی سازنده')}${input('language_detail', 'زبان، لهجه یا جهت ترجمه', 'مثلا فارسی محاوره‌ای')}${input('description', 'کاربرد در یک جمله', 'چه کاری برای خریدار انجام می‌دهد؟')}${area('training_data', 'داده آموزشی و منبع آن', 'نوع داده، منبع و اجازه استفاده را توضیح دهید؛ اطلاعات شخصی یا داده خام ننویسید.')}${area('limitations', 'محدودیت‌ها و ارزیابی', 'آزمون روی چه داده‌ای انجام شده؟ کجا انتظار خطا دارید؟')}${input('source_url', 'لینک مستندات یا کارت مدل (اختیاری)', 'https://...')}</div>${check('data_rights', 'مجوز مدل پایه و حق استفاده از داده، عرضه مدل به این روش را اجازه می‌دهند.')}</fieldset>
  <fieldset data-listing-step="2" hidden><legend tabindex="-1">روش عرضه و شرایط خرید</legend><div class="listing-access">${check('api', 'دسترسی API')}${check('weights', 'خرید وزن‌های مدل')}</div><div class="listing-api-fields"><h3>تعرفه API</h3><p class="small" id="listingUnitHint"></p><div class="listing-grid">${input('api_rate', 'تعرفه مصرف (تومان)', 'مثلا ۱۲۵۰')}${input('output_rate', 'تعرفه خروجی / میلیون توکن (فقط متن)', 'مثلا ۴۵۰۰۰')}${check('batch', 'پردازش دسته‌ای (Batch) ارائه می‌کنم.')}<div class="listing-batch-fields full"><div class="listing-grid">${input('batch_rate', 'تعرفه Batch (تومان، همان واحد API)')}${input('batch_output_rate', 'خروجی Batch / میلیون توکن')}${input('batch_hours', 'حداکثر زمان تحویل (ساعت)', 'مثلا ۲۴')}${input('batch_max_requests', 'سقف درخواست در هر دسته', 'مثلا ۱۰۰۰۰')}</div></div>${area('privacy', 'نگهداری داده در API', 'محل پردازش و مدت نگهداری ورودی و خروجی را مشخص کنید.')}</div></div><div class="listing-weight-fields"><h3>فروش وزن‌ها</h3><div class="listing-grid">${input('weights_price', 'قیمت یک‌باره مجوز (تومان)', 'مثلا ۱۸۰۰۰۰۰۰')}<label>نوع مجوز<select name="license"><option value="commercial" ${d.license === 'commercial' ? 'selected' : ''}>تجاری، غیرانحصاری، یک سازمان</option><option value="research" ${d.license === 'research' ? 'selected' : ''}>فقط پژوهشی، غیرانحصاری</option></select></label>${input('format', 'فایل‌های تحویلی', 'Safetensors، کد اجرا و راهنما')}${input('hardware', 'نیاز سخت‌افزاری', 'مثلا GPU با ۸ گیگابایت حافظه')}${input('support', 'پشتیبانی و به‌روزرسانی', 'مثلا ۳۰ روز راه‌اندازی؛ نسخه اصلی جدا')}</div><div class="listing-access">${check('modification', 'خریدار اجازه تغییر و تنظیم مدل را دارد.')}${check('redistribution', 'بازنشر یا فروش مجدد وزن‌ها مجاز است.')}</div><p class="small">مجوز برای همین نسخه است. انتقال مالکیت انحصاری و فروش داده آموزشی به قرارداد جداگانه نیاز دارد.</p></div></fieldset>
  <fieldset data-listing-step="3" hidden><legend tabindex="-1">پیش‌نمایش و ذخیره</legend><div id="listingPreview"></div><p class="small">این پیش‌نویس در مرورگر شما ذخیره می‌شود. با دریافت فایل، اطلاعات را برای بررسی و ثبت در بازار آماده کنید.</p></fieldset>`;
}
function renderPublisher(draft) {
  listingDraft = draft ||
    localRecords('torobai.listing.work')[0] ||
    (Object.keys(listingDraft).length ? listingDraft : null) || {
      id: 'listing-' + Date.now(),
      task: 'transcription',
      publisher_type: 'person',
      api: true,
      weights: true,
      license: 'commercial',
      modification: true
    };
  listingStep = 1;
  const drafts = localRecords('torobai.listings');
  $('main').innerHTML =
    `<section class="catalog-heading"><div><p class="breadcrumb">torobai / عرضه مدل</p><h1>معرفی مدل برای عرضه</h1><p>مدل شخصی یا شرکتی شما می‌تواند با API، وزن‌ها یا هر دو روش عرضه شود.</p></div><a href="#api" class="text-link">بازگشت به مدل‌ها ${icon('arrow')}</a></section><div class="publisher-layout"><section class="listing-editor"><ol class="listing-steps"><li data-step-mark="1">۱ <span>مدل و سازنده</span></li><li data-step-mark="2">۲ <span>تعرفه و مجوز</span></li><li data-step-mark="3">۳ <span>پیش‌نمایش</span></li></ol><div class="draft-recovery"><span id="draftRecoveryStatus">تغییرات فرم در همین مرورگر نگه داشته می‌شود.</span><button type="button" data-new-listing>فرم جدید</button></div><form id="listingForm" novalidate>${listingFields(listingDraft)}<p id="listingError" class="form-error" role="alert" hidden></p><div class="listing-actions"><button type="button" class="button secondary" data-listing-back>مرحله قبل</button><button type="submit" class="button primary" id="listingNext">ادامه ${icon('arrow')}</button><button type="button" class="text-link" data-export-current>دریافت فایل پیش‌نویس</button></div></form></section><aside class="publisher-aside"><h2>اطلاعات لازم برای خریدار</h2><p>خریدار باید بداند مدل چه کاری انجام می‌دهد، چگونه آموزش دیده و دقیقا چه چیزی تحویل می‌گیرد.</p><ul><li>مدل پایه و نسخه مشخص</li><li>نمونه و معیار ارزیابی روی فارسی</li><li>منبع داده و حق عرضه مدل</li><li>تعرفه روشن یا مجوز وزن‌ها</li><li>شرایط نگهداری داده و پشتیبانی</li></ul><div class="seller-note">داده خصوصی، کلید API و فایل وزن‌ها را در این فرم وارد نکنید.</div><h3>پیش‌نویس‌های شما</h3><a class="text-link" href="#manage">ثبت درخواست بررسی مدل جدید</a>${drafts.length ? drafts.map((d) => `<div class="draft-item"><strong dir="auto">${esc(d.title)}</strong><small>${esc(d.version)} · ${esc(d.publisher)}</small><div><button data-edit-draft="${esc(d.id)}">ویرایش</button><button data-export-draft="${esc(d.id)}">دریافت فایل</button><button data-delete-draft="${esc(d.id)}">حذف</button></div></div>`).join('') : '<p class="small">اولین مدل را ثبت کنید؛ پیش‌نویس‌های شما اینجا می‌مانند.</p>'}</aside></div>`;
  updateListingStep();
  document.title = 'ثبت مدل فارسی | torobai';
}
function rememberListing() {
  const f = $('listingForm');
  if (!f) return;
  listingDraft = readListing(f);
  const saved = saveRecords('torobai.listing.work', [
    { ...listingDraft, id: listingDraft.id || 'listing-' + Date.now() }
  ]);
  const status = $('draftRecoveryStatus');
  if (status)
    status.textContent = saved
      ? 'تغییرات فرم در همین مرورگر نگه داشته شد.'
      : 'ذخیره خودکار ممکن نشد؛ پیش از خروج، فایل پیش‌نویس را دریافت کنید.';
}
function focusListingStep() {
  document.querySelector(`[data-listing-step="${listingStep}"] legend`)?.focus();
}
function updateListingStep() {
  document
    .querySelectorAll('[data-listing-step]')
    .forEach((el) => (el.hidden = Number(el.dataset.listingStep) !== listingStep));
  document
    .querySelectorAll('[data-step-mark]')
    .forEach((el) =>
      el.setAttribute(
        'aria-current',
        Number(el.dataset.stepMark) === listingStep ? 'step' : 'false'
      )
    );
  document.querySelector('[data-listing-back]').hidden = listingStep === 1;
  document.querySelector('[data-export-current]').hidden = false;
  $('listingNext').textContent = listingStep === 3 ? 'ذخیره پیش‌نویس' : 'ادامه';
  $('listingError').hidden = true;
  const f = $('listingForm'),
    d = readListing(f);
  document.querySelector('.listing-api-fields').hidden = !d.api;
  document.querySelector('.listing-weight-fields').hidden = !d.weights;
  document.querySelector('.listing-batch-fields').hidden = !d.api || !d.batch;
  f.querySelector('[name=batch_output_rate]').closest('label').hidden = d.unit !== 'tokens';
  $('listingUnitHint').textContent = 'مبنای تعرفه: ' + (unitLabels[d.unit] || '');
  f.querySelector('[name=output_rate]').closest('label').hidden = d.unit !== 'tokens';
  if (listingStep === 3) $('listingPreview').innerHTML = listingReview(d);
}
function listingReview(d) {
  return `<div class="listing-preview"><span class="draft-badge">پیش‌نمایش آگهی</span><h2 dir="auto">${esc(d.title)}</h2><p>${esc(d.description)}</p><div class="product-tags"><span class="tag">${tasks[d.task]}</span><span class="tag">${esc(d.language_detail)}</span><span class="tag">نسخه ${esc(d.version)}</span></div><p>${esc(d.publisher)} · ${d.publisher_type === 'person' ? 'سازنده مستقل' : 'گروه / شرکت'}</p><div class="preview-prices">${d.api ? `<div><span>API / ${unitLabels[d.unit]}</span><strong>${money(parseNumber(d.api_rate, 1e12))}</strong>${d.unit === 'tokens' ? `<small>خروجی: ${money(parseNumber(d.output_rate, 1e12))} / میلیون توکن</small>` : ''}</div>` : ''}${d.weights ? `<div><span>مجوز فایل مدل / یک‌باره</span><strong>${money(parseNumber(d.weights_price, 1e12))}</strong><small>${d.license === 'commercial' ? 'تجاری' : 'پژوهشی'} · غیرانحصاری</small></div>` : ''}</div>${d.api && d.batch ? `<div class="batch-terms"><b>Batch</b> · ${money(parseNumber(d.batch_rate,1e12))} / ${unitLabels[d.unit]}${d.unit === 'tokens' ? ' · خروجی ' + money(parseNumber(d.batch_output_rate,1e12)) + ' / میلیون توکن' : ''} · تحویل تا ${esc(d.batch_hours)} ساعت · ${esc(d.batch_max_requests)} درخواست در هر دسته</div>` : ''}<dl class="spec-table"><div><dt>مدل پایه و مجوز</dt><dd dir="auto">${esc(d.base_model)} · ${esc(d.base_license)}</dd></div><div><dt>داده آموزشی</dt><dd>${esc(d.training_data)}</dd></div><div><dt>محدودیت و ارزیابی</dt><dd>${esc(d.limitations)}</dd></div>${d.weights ? `<div><dt>تحویل و اجرا</dt><dd>${esc(d.format)} · ${esc(d.hardware)}</dd></div><div><dt>حقوق استفاده</dt><dd>تغییر مدل: ${d.modification ? 'مجاز' : 'نیازمند توافق'} · بازنشر وزن‌ها: ${d.redistribution ? 'مجاز' : 'غیرمجاز'}</dd></div>` : ''}</dl></div>`;
}
function submitListing(form) {
  const d = readListing(form),
    error = HB.validateListing(d, listingStep);
  if (error) {
    $('listingError').textContent = error;
    $('listingError').hidden = false;
    $('listingError').scrollIntoView({ block: 'nearest' });
    return;
  }
  listingDraft = d;
  if (listingStep < 3) {
    listingStep++;
    rememberListing();
    updateListingStep();
    focusListingStep();
    return;
  }
  const record = {
    ...d,
    id: d.id || 'listing-' + Date.now(),
    status: 'draft',
    saved_at: new Date().toISOString(),
    schema_version: 1
  };
  const all = localRecords('torobai.listings');
  if (
    !saveRecords(
      'torobai.listings',
      [record, ...all.filter((x) => x.id !== record.id)].slice(0, 100)
    )
  )
    return;
  saveRecords('torobai.listing.work', [record]);
  renderPublisher(record);
  toast('پیش‌نویس ذخیره شد؛ می‌توانید آن را ویرایش یا دریافت کنید.');
}
// Local authoring/request actions never send messages or claim remote publication.
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-download-request]')) {
    const record = requestFromForm($('requestForm'));
    if (record)
      downloadRecord(
        'torobai-request-' + record.id + '.txt',
        requestText({ ...record, status: 'exported_only' }),
        true
      );
  }
  const editRequest = e.target.closest('[data-edit-request]');
  if (editRequest) {
    const r = localRecords('torobai.requests').find(
      (x) => x.id === editRequest.dataset.editRequest
    );
    if (r) inquiry(r.product_id, r.access, r.deal_id, r);
  }
  const textExport = e.target.closest('[data-request-text]');
  if (textExport) {
    const r = localRecords('torobai.requests').find((x) => x.id === textExport.dataset.requestText);
    if (r) downloadRecord('torobai-request-' + r.id + '.txt', requestText(r), true);
  }
  if (e.target.closest('[data-new-listing]')) {
    if (saveRecords('torobai.listing.work', [])) {
      listingDraft = {};
      renderPublisher();
    }
  }
  const access = e.target.closest('[data-access-filter]');
  if (access) navigateFilters({ access: access.dataset.accessFilter });
  const ask = e.target.closest('[data-inquire]');
  if (ask) inquiry(ask.dataset.inquire, ask.dataset.mode, ask.dataset.deal);
  if (e.target.closest('[data-listing-back]')) {
    listingDraft = readListing($('listingForm'));
    listingStep = Math.max(1, listingStep - 1);
    updateListingStep();
    focusListingStep();
  }
  if (e.target.closest('[data-export-current]')) {
    const d = readListing($('listingForm'));
    downloadRecord('torobai-model-draft.json', {
      ...d,
      status: 'draft',
      schema_version: 1,
      complete: !HB.validateListing(d, 3)
    });
  }
  for (const [attr, key, kind] of [
    ['draft', 'torobai.listings', 'model'],
    ['request', 'torobai.requests', 'request']
  ]) {
    const ex = e.target.closest(`[data-export-${attr}]`);
    if (ex) {
      const d = localRecords(key).find((x) => x.id === ex.getAttribute('data-export-' + attr));
      if (d) downloadRecord('torobai-' + kind + '-' + d.id + '.json', d);
    }
    const del = e.target.closest(`[data-delete-${attr}]`);
    if (
      del &&
      saveRecords(
        key,
        localRecords(key).filter((x) => x.id !== del.getAttribute('data-delete-' + attr))
      )
    ) {
      if (attr === 'draft') {
        if (listingDraft.id === del.getAttribute('data-delete-draft')) {
          saveRecords('torobai.listing.work', []);
          listingDraft = {};
        }
        renderPublisher();
      } else renderRequests();
    }
  }
  const edit = e.target.closest('[data-edit-draft]');
  if (edit) {
    const d = localRecords('torobai.listings').find((x) => x.id === edit.dataset.editDraft);
    if (d) renderPublisher(d);
  }
});
document.addEventListener('change', (e) => {
  if (e.target.closest('#listingForm')) {
    rememberListing();
    updateListingStep();
  }
});
document.addEventListener('input', (e) => {
  if (e.target.closest('#listingForm')) rememberListing();
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'listingForm') {
    e.preventDefault();
    submitListing(e.target);
  }
  if (e.target.id === 'requestForm') {
    e.preventDefault();
    submitRequest(e.target);
  }
});

// Seller discovery keeps product identity separate from each supply offer.
function searchMatches(text, query) {
  const normalize = value => String(value).toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\s\u200c]+/g, ' ').trim();
  return normalize(text).includes(normalize(query));
}
function sellerProducts(id) {
  return products.filter(p => [...p.offers, ...(p.weight_offers || [])].some(o => o.seller_id === id));
}
function sellerHasService(p, id, service) {
  return service === 'weights' ? p.weight_offers?.some(o => o.seller_id === id) :
    p.kind === service && p.offers.some(o => o.seller_id === id);
}
function sellerServices(id) {
  return [['api', 'API'], ['weights', 'مجوز وزن‌ها'], ['gpu', 'اجاره GPU']]
    .filter(([key]) => sellerProducts(id).some(p => sellerHasService(p, id, key))).map(([, label]) => label);
}
function providerSearch(path, placeholder) {
  return `<form id="providerSearch" data-path="${esc(path)}" class="provider-search"><label>${icon('search')}<input name="query" aria-label="${placeholder}" placeholder="${placeholder}" maxlength="80" value="${esc(state.query)}"></label><label class="service-select">نوع عرضه<select name="service"><option value="">همه</option>${[['api','API'],['weights','مجوز وزن‌ها'],['gpu','اجاره GPU']].map(([key,label])=>`<option value="${key}" ${state.service === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label><button class="button primary" type="submit">جستجو</button>${state.query || state.service ? `<a class="text-link" href="${esc(path)}">حذف فیلترها</a>` : ''}</form>`;
}
function sellerLink(o) {
  return `<a class="seller-profile-link" href="#providers/${esc(o.seller_id)}">${esc(o.seller)} ${icon('arrow')}</a>`;
}
function recordDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) || !Number.isFinite(Date.parse(value))) return '';
  return new Intl.DateTimeFormat('fa-IR', {year:'numeric', month:'short', day:'numeric', timeZone:'UTC'}).format(new Date(value));
}
function offerEvidence(p, o, mode = 'api') {
  const date = o.listing_basis === 'fictional_scenario' || o.pricing_basis === 'planning_catalog' ? '' : recordDate(o.observed_at);
  return `<div class="offer-evidence"><span>${date ? 'تاریخ ثبت تعرفه: ' + date : 'قیمت نهایی را از عرضه‌کننده بپرسید'}</span><a href="#providers/${esc(o.seller_id)}">پروفایل و شرایط</a><button data-report-product="${p.id}" data-report-offer="${o.id}" data-report-mode="${mode}">گزارش مغایرت</button></div>`;
}
function renderProvider(id) {
  const seller = allSellers().find(s => s.id === id);
  if (!seller) {
    $('main').innerHTML = '<div class="empty-state"><h1>ارائه‌دهنده پیدا نشد</h1><a class="button secondary" href="#providers">همه ارائه‌دهندگان</a></div>';
    document.title = 'ارائه‌دهنده پیدا نشد | torobai';
    return;
  }
  const covered = sellerProducts(id);
  const rows = covered.filter(p => searchMatches(p.title + ' ' + p.description + ' ' + p.maker, state.query) && (!state.service || sellerHasService(p, id, state.service)));
  const terms = [
    ['نوع عرضه', sellerServices(id).join('، ')],
    ['حداقل اعتبار API / اجاره', seller.min_credit_toman != null ? money(seller.min_credit_toman) : 'با استعلام'],
    ['مالیات', seller.tax_percent != null ? (seller.tax_percent ? num(seller.tax_percent) + '٪ جدا از مبلغ مصرف' : 'طبق تعرفه ثبت‌شده، بدون مالیات افزوده') : 'طبق شرایط عرضه‌کننده'],
    ['اعتبار شارژ', esc(seller.credit_expiry || 'طبق شرایط هر سرویس')],
    ['محل پردازش', esc(seller.processing_location || 'در شرایط هر پیشنهاد بررسی شود')]
  ];
  $('main').innerHTML = `<div class="detail-breadcrumb"><a href="#providers">ارائه‌دهندگان</a><span>/</span><span>${esc(seller.name)}</span></div>
    <section class="seller-profile-head"><div class="seller-profile-identity">${logo(seller)}<div><span class="section-kicker">${seller.publisher_type === 'person' ? 'عرضه‌کننده مستقل' : 'ارائه‌دهنده خدمات و مدل'}</span><h1 dir="auto">${esc(seller.name)}</h1><p>${num(covered.length)} محصول · ${sellerServices(id).join(' · ')}</p></div></div><div class="profile-actions">${seller.site ? external(seller.site, 'رفتن به وب‌سایت', 'button primary') : '<a class="button secondary" href="#providerProducts" data-scroll="providerProducts">دیدن پیشنهادها</a>'}${seller.status_url ? external(seller.status_url, 'وضعیت رسمی سرویس') : ''}</div></section>
    <div class="provider-layout"><aside class="seller-conditions"><details ${!matchMedia('(max-width: 800px)').matches ? 'open' : ''}><summary>شرایط عرضه‌کننده ${icon('filter')}</summary><dl>${terms.map(([key, value])=>`<div><dt>${key}</dt><dd>${value}</dd></div>`).join('')}</dl>${seller.terms_note ? `<p>${esc(seller.terms_note)}</p>` : ''}${seller.terms_url ? external(seller.terms_url, 'تعرفه و شرایط در منبع') : ''}${seller.sla_url ? external(seller.sla_url, 'تعهد سطح خدمت (SLA)') : ''}<div class="seller-trust-note"><strong>پایداری با اعتبار فروشنده فرق دارد</strong><p>مربع‌های پایداری مربوط به دسترسی سرویس هستند. برای خرید، شرایط پشتیبانی، نگهداری داده و بازگشت وجه را جداگانه بررسی کنید.</p></div></details></aside>
    <section id="providerProducts" class="provider-products"><div class="section-heading"><h2>محصول‌های ${esc(seller.name)}</h2><span>${num(rows.length)} محصول</span></div>${providerSearch('#providers/' + id, 'جستجو در محصولات این ارائه‌دهنده')}<p class="small">هزینه API با مصرف معمول و اجاره با ۲۴ ساعت محاسبه شده است. در صفحه محصول، مصرف را تغییر دهید و همه عرضه‌کنندگان را مقایسه کنید.</p>
    <div class="provider-offers">${rows.map(p => {
      const quote = catalogQuote(p, {provider:id, requestMode:'instant'}).best;
      const weights = (p.weight_offers || []).filter(w=>w.seller_id === id);
      const api = state.service !== 'weights' && p.offers.some(o=>o.seller_id === id);
      const files = (!state.service || state.service === 'weights') && weights.length;
      return `<article class="provider-product"><div class="provider-product-title">${logo(p)}<div><h3 dir="auto"><a href="${href(p, {provider:id,access:!api && files ? 'weights' : ''})}">${esc(p.title)}</a></h3><p>${tasks[p.task]}${p.version ? ' · نسخه ' + esc(p.version) : ''}</p></div></div><div class="provider-product-prices">${api ? `<div><span>${p.kind === 'gpu' ? '۲۴ ساعت اجاره' : 'API · مصرف معمول'}</span><strong>${quote ? money(quote.estimate_toman) : 'نیاز به استعلام'}</strong></div>` : ''}${files ? `<div><span>مجوز وزن‌ها · یک‌باره، از</span><strong>${money(Math.min(...weights.map(w=>w.price_toman)))}</strong></div>` : ''}</div><div class="provider-product-actions"><a class="button secondary" href="${href(p, {provider:id,access:!api && files ? 'weights' : ''})}">پیشنهاد این عرضه‌کننده</a><a class="text-link" href="${href(p, {access:!api && files ? 'weights' : ''})}">مقایسه همه عرضه‌کنندگان ${icon('arrow')}</a></div></article>`;
    }).join('') || '<div class="empty-state"><h3>محصولی با این انتخاب پیدا نشد</h3><p>عبارت جستجو یا نوع عرضه را تغییر دهید.</p></div>'}</div></section></div>`;
  document.title = `${seller.name}؛ محصولات و شرایط | torobai`;
}

// Watch entries retain the exact comparison basis. They compare local snapshots,
// never manufacture market history or promise a notification delivery service.
function watchRecords() {
  return localRecords('torobai.watchlist').filter(r => {
    if (!['api','gpu'].includes(r.kind) || typeof r.product_id !== 'string' || !/^[a-z0-9._-]+$/.test(r.product_id) ||
      typeof r.title !== 'string' || !['api','weights'].includes(r.access) || typeof r.url !== 'string' || r.url.length > 1500 ||
      !Number.isFinite(r.amount) || r.amount < 0 || !recordDate(r.created_at) ||
      typeof r.version !== 'string' || typeof r.seller !== 'string' || typeof r.usage_text !== 'string') return false;
    const view = readState(r.url);
    return r.url.startsWith('#' + r.kind + '/' + r.product_id) && view.path === r.kind + '/' + r.product_id &&
      (view.access === 'weights' ? 'weights' : 'api') === r.access;
  });
}
function watchButton(p) {
  return `<button class="text-link" data-watch="${p.id}">${icon('pulse')} پیگیری قیمت</button>`;
}
function watchQuote(p, view) {
  if (view.access === 'weights') {
    const rows = (p.weight_offers || []).filter(w=>w.availability !== 'unavailable' && (!view.provider || w.seller_id === view.provider)).sort((a,b)=>a.price_toman-b.price_toman);
    return rows[0] ? {...rows[0], estimate_toman:rows[0].price_toman} : !view.provider && p.weights_url ? {estimate_toman:0,seller:p.maker} : null;
  }
  if (p.kind !== 'gpu') return catalogQuote(p, view).best;
  return (catalog.estimates[p.id]?.[view.rental || 'standard']?.offers || [])
    .filter(o=>(!view.provider || o.seller_id === view.provider) && (!view.ssh || o.ssh) && o.estimate_toman != null)
    .sort((a,b)=>HB.comparePrices(a.estimate_toman,b.estimate_toman))[0] || null;
}
function watchSnapshot(p, url) {
  if (!p) return null;
  const view = readState(url), quote = watchQuote(p, view);
  if (!quote) return null;
  return {product_id:p.id, kind:p.kind, title:p.title, access:view.access === 'weights' ? 'weights' : 'api', url,
    amount:quote.estimate_toman, seller:quote.seller, version:String(p.version || p.model_id || p.title),
    usage_text:view.access === 'weights' ? 'مجوز وزن‌ها · پرداخت یک‌باره' : usageText(p, p.kind === 'gpu' ? scenario(p, view.rental) : catalogValues(p, view)),
    created_at:new Date().toISOString()};
}
let watchDraft = null;
function openWatch(id) {
  const p = products.find(p=>p.id === id);
  if (!p || selected?.id !== id) return;
  if (p.kind === 'gpu' && !presetNames[activePreset]) {
    toast('برای پیگیری قیمت، یکی از بازه‌های آماده اجاره را انتخاب کنید.'); return;
  }
  if (purchaseMode !== 'weights' && !activeEstimate?.offers.some(o=>o.estimate_toman != null)) {
    toast('ابتدا مصرف را محاسبه کنید تا قیمت قابل پیگیری باشد.'); return;
  }
  const view = {...state, access:purchaseMode, rental:activePreset};
  const snapshot = watchSnapshot(p, href(p, view));
  if (!snapshot) { toast('با این شرایط قیمت قابل پیگیری وجود ندارد.'); return; }
  watchDraft = {id:'watch-' + Date.now(), ...snapshot};
  showDialog('پیگیری قیمت ' + esc(p.title), `<div class="watch-preview"><p>کمترین هزینه برای همین مدل و همین شرایط نگه داشته می‌شود تا در مراجعه بعد، تغییر قیمت را ببینید.</p><strong class="watch-amount">${money(snapshot.amount)}</strong><p>${esc(snapshot.seller)} · ${esc(snapshot.usage_text)}</p><p class="small">این پیگیری در همین مرورگر است؛ پس از ذخیره می‌توانید قیمت هدف و اعلان داخل سایت یا مرورگر را تنظیم کنید.</p><button class="button primary" data-save-watch>افزودن به پیگیری‌ها</button><a class="text-link" href="#watchlist">پیگیری‌های من ${icon('arrow')}</a></div>`);
}
function renderWatchlist() {
  observeWatchPrices();
  const records = watchRecords();
  $('main').innerHTML = `<section class="catalog-heading"><div><p class="breadcrumb">torobai / پیگیری قیمت</p><h1>پیگیری قیمت</h1><p>قیمت فعلی کاتالوگ در برابر قیمت ذخیره‌شده شما؛ با مدل، نوع دریافت و مصرف یکسان.</p></div><a class="button secondary" href="#api">انتخاب مدل</a></section><p class="tracking-note">پیگیری‌ها در همین مرورگر نگه داشته می‌شوند. تاریخچه از زمان شروع پیگیری ثبت می‌شود؛ نوع اعلان و قیمت هدف را برای هر مورد تنظیم کنید.</p><div class="watch-list">${records.map(r=>{
    const p = products.find(p=>p.id === r.product_id), current = watchSnapshot(p, r.url);
    const sameVersion = current?.version === r.version;
    const difference = current && sameVersion ? (Math.round(current.amount * 100) - Math.round(r.amount * 100)) / 100 : null;
    const delta = !p ? 'این مدل در کاتالوگ فعلی موجود نیست' : !current ? 'قیمت قابل محاسبه موجود نیست' : !sameVersion ? 'نسخه مدل تغییر کرده؛ مقایسه قیمت متوقف شد' : difference === 0 ? 'بدون تغییر قیمت' : `${money(Math.abs(difference))} ${difference < 0 ? 'کاهش' : 'افزایش'}`;
    return `<article class="watch-row"><div class="watch-identity"><h2 dir="auto"><a href="${esc(r.url)}">${esc(p?.title || r.title)}</a></h2><p>${esc(r.usage_text)}</p><small>ثبت شما: ${recordDate(r.created_at)} · نسخه ${esc(r.version)}</small></div><div class="watch-prices"><div><span>قیمت ذخیره‌شده</span><strong>${money(r.amount)}</strong><small>${esc(r.seller)}</small></div><div><span>قیمت فعلی کاتالوگ</span><strong>${current ? money(current.amount) : 'نامشخص'}</strong><small>${current ? esc(current.seller) : 'شرایط محصول را بررسی کنید'}</small></div><p class="price-change ${difference < 0 ? 'price-down' : difference > 0 ? 'price-up' : ''}">${delta}</p>${current && r.seller !== current.seller ? '<small>ارزان‌ترین عرضه‌کننده تغییر کرده است.</small>' : ''}</div><div class="watch-actions"><a class="button secondary" href="${esc(r.url)}">مشاهده پیشنهادها</a>${current ? `<button class="text-link" data-refresh-watch="${esc(r.id)}">ثبت قیمت فعلی به‌عنوان مبنا</button>` : ''}<button class="text-link" data-watch-history="${esc(r.id)}">تاریخچه قیمت</button><button class="text-link" data-watch-policy="${esc(r.id)}">تنظیم اعلان</button><button class="text-link" data-export-watch="${esc(r.id)}">دریافت فایل پیگیری</button><button class="text-link" data-delete-watch="${esc(r.id)}">حذف پیگیری</button></div></article>`;
  }).join('') || '<div class="empty-state"><h2>هنوز قیمتی را پیگیری نمی‌کنید</h2><p>در صفحه مدل یا GPU، «پیگیری قیمت» را انتخاب کنید.</p><a class="button primary" href="#api">دیدن مدل‌ها</a></div>'}</div>`;
  document.title = 'پیگیری قیمت | torobai';
}

const reportReasons = {price:'قیمت یا تعرفه متفاوت است', availability:'این سرویس در دسترس نیست', model:'مدل یا نسخه مطابقت ندارد', terms:'شرایط API یا مجوز متفاوت است', link:'لینک عرضه‌کننده درست نیست'};
let reportDraft = null;
function reportRecords() {
  return localRecords('torobai.reports').filter(r=>typeof r.product_id === 'string' && typeof r.title === 'string' &&
    typeof r.seller === 'string' && typeof r.offer_id === 'string' && Object.hasOwn(reportReasons,r.reason) &&
    typeof r.detail === 'string' && r.detail.length <= 1200 && typeof r.url === 'string' && recordDate(r.created_at));
}
function reportText(r) {
  return `گزارش مغایرت\nمدل: ${r.title}\nعرضه‌کننده: ${r.seller}\nشناسه پیشنهاد: ${r.offer_id}\nنوع: ${reportReasons[r.reason]}\nتوضیحات: ${r.detail || '—'}\nمنبع: ${r.url || '—'}\nتاریخ: ${r.created_at}\nوضعیت: ذخیره در مرورگر؛ ارسال نشده\n`;
}
function openReport(productId, offerId, mode, previous = null) {
  const p = products.find(p=>p.id === productId);
  const o = p && [...p.offers, ...(p.weight_offers || [])].find(o=>o.id === offerId);
  if (!previous && !o) return;
  reportDraft = previous || {id:'report-' + Date.now(), product_id:p.id, title:p.title, seller:o.seller, offer_id:o.id, access:mode, url:safeURL(o.source_url || '') === '#' ? '' : o.source_url, created_at:new Date().toISOString()};
  showDialog('گزارش مغایرت', `<form id="reportForm" class="request-form"><div class="request-product"><strong dir="auto">${esc(reportDraft.title)}</strong><span>${esc(reportDraft.seller)}</span></div><label>چه چیزی متفاوت است؟<select name="reason">${Object.entries(reportReasons).map(([key, value])=>`<option value="${key}" ${(reportDraft.reason || 'price') === key ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label>توضیحات شما<textarea name="detail" maxlength="1200" rows="4" placeholder="مثلا تعرفه ورودی در سایت عرضه‌کننده تغییر کرده است.">${esc(reportDraft.detail || '')}</textarea></label><p class="small">گزارش در این مرورگر ذخیره می‌شود. متن آن را برای ارسال به پشتیبانی دریافت کنید؛ ذخیره به معنی ارسال نیست.</p><p id="reportError" class="form-error" role="alert" hidden></p><div class="filter-actions"><button type="submit" class="button primary">ذخیره گزارش</button><button type="button" class="button secondary" data-download-report-form>دریافت متن گزارش</button></div></form>`);
}
function readReport(form) {
  if (!reportDraft) return null;
  const reason = form.querySelector('[name=reason]').value;
  const detail = form.querySelector('[name=detail]').value.trim();
  if (!Object.hasOwn(reportReasons,reason) || detail.length > 1200) {
    $('reportError').hidden = false; $('reportError').textContent = 'نوع مغایرت و توضیحات را بررسی کنید.'; return null;
  }
  return {...reportDraft, reason, detail, updated_at:new Date().toISOString()};
}
function renderReports() {
  const records = reportRecords();
  $('main').innerHTML = `<section class="catalog-heading"><div><p class="breadcrumb">torobai / گزارش‌های من</p><h1>گزارش‌های مغایرت</h1><p>گزارش‌های ذخیره‌شده در این مرورگر؛ متن هر گزارش را برای ارسال به پشتیبانی دریافت کنید.</p></div></section><div class="request-list">${records.map(r=>`<article><div><span class="draft-badge">${reportDecision(r.id).label}</span><h2 dir="auto">${esc(r.title)}</h2><p>${esc(r.seller)} · ${reportReasons[r.reason]}</p><p class="report-description">${esc(r.detail)}</p>${reportDecision(r.id).note?`<p class="review-reply">پاسخ بررسی: ${esc(reportDecision(r.id).note)}</p>`:''}<small>${recordDate(r.created_at)}</small></div><div class="request-actions"><button class="button secondary" data-edit-report="${esc(r.id)}">مشاهده و ویرایش</button><button class="button primary" data-export-report="${esc(r.id)}">دریافت متن گزارش</button><button class="text-link" data-delete-report="${esc(r.id)}">حذف</button></div></article>`).join('') || '<div class="empty-state"><h2>گزارشی ذخیره نکرده‌اید</h2><p>کنار هر پیشنهاد، «گزارش مغایرت» را انتخاب کنید.</p><a class="button secondary" href="#api">دیدن مدل‌ها</a></div>'}</div>`;
  document.title = 'گزارش‌های مغایرت | torobai';
}
document.addEventListener('submit', e => {
  if (e.target.id === 'providerSearch') {
    e.preventDefault();
    const params = new URLSearchParams(), form = e.target;
    const query = form.querySelector('[name=query]').value.trim().slice(0,80);
    const service = form.querySelector('[name=service]').value;
    if (query) params.set('q',query);
    if (['api','weights','gpu'].includes(service)) params.set('service',service);
    navigate(form.dataset.path + (params.size ? '?' + params : ''));
  }
  if (e.target.id === 'reportForm') {
    e.preventDefault(); const r = readReport(e.target);
    if (r && saveRecords('torobai.reports', [r,...reportRecords().filter(x=>x.id !== r.id)].slice(0,100))) {
      closeDialog(); toast('گزارش در مرورگر ذخیره شد؛ هنوز ارسال نشده است.');
      if (state.path === 'reports') renderReports();
    }
  }
});
document.addEventListener('click', e => {
  const report = e.target.closest('[data-report-offer]');
  if (report) openReport(report.dataset.reportProduct, report.dataset.reportOffer, report.dataset.reportMode);
  const watch = e.target.closest('[data-watch]');
  if (watch) openWatch(watch.dataset.watch);
  if (e.target.closest('[data-save-watch]') && watchDraft) {
    const records = watchRecords().filter(r=>r.url !== watchDraft.url);
    if (saveRecords('torobai.watchlist', [watchDraft,...records].slice(0,100))) {
      closeDialog(); toast('قیمت با همین شرایط به پیگیری‌های شما اضافه شد.'); watchDraft = null; observeWatchPrices();
    }
  }
  if (e.target.closest('[data-download-report-form]')) {
    const r = readReport($('reportForm'));
    if (r) downloadRecord('torobai-report.txt', reportText(r).replace('ذخیره در مرورگر؛ ارسال نشده','فایل گزارش؛ ارسال نشده'), true);
  }
  for (const action of ['edit','export','delete']) {
    const control = e.target.closest(`[data-${action}-report]`);
    if (!control) continue;
    const id = control.getAttribute(`data-${action}-report`), records = reportRecords(), r = records.find(x=>x.id === id);
    if (!r) continue;
    if (action === 'edit') openReport(r.product_id,r.offer_id,r.access,r);
    if (action === 'export') downloadRecord('torobai-report.txt',reportText(r),true);
    if (action === 'delete' && saveRecords('torobai.reports',records.filter(x=>x.id !== id))) renderReports();
  }
  for (const action of ['refresh','export','delete']) {
    const control = e.target.closest(`[data-${action}-watch]`);
    if (!control) continue;
    const id = control.getAttribute(`data-${action}-watch`), records = watchRecords(), r = records.find(x=>x.id === id);
    if (!r) continue;
    if (action === 'export') downloadRecord('torobai-price-watch.json',r);
    if (action === 'delete' && saveRecords('torobai.watchlist',records.filter(x=>x.id !== id))) renderWatchlist();
    if (action === 'refresh') {
      const snapshot = watchSnapshot(products.find(p=>p.id === r.product_id),r.url);
      if (snapshot && saveRecords('torobai.watchlist',records.map(x=>x.id === id ? {id,...snapshot} : x))) {
        renderWatchlist(); toast('قیمت فعلی به‌عنوان مبنای جدید ثبت شد.');
      }
    }
  }
});

start();
