'use strict';
// Buyer tools and a browser-local publishing workspace share the same catalog.
const capabilityLabels = {
  json: 'خروجی JSON',
  tools: 'فراخوانی ابزار',
  streaming: 'پاسخ جریانی',
  no_retention: 'بدون نگهداری داده'
};
let marketBase,
  marketState,
  proposalDraftId = '',
  importPreview = null,
  sellerCompare = [],
  marketRevision = 0;
const tariffKeys = [
  'toman_input_m',
  'toman_output_m',
  'toman_unit',
  'toman_input_long_m',
  'toman_output_long_m',
  'price_toman',
  'hourly_toman',
  'daily_toman'
];
const emptyMarket = () => ({
  version: 1,
  proposals: [],
  models: [],
  updates: [],
  merges: [],
  decisions: [],
  policies: [],
  history: [],
  notifications: [],
  samples: [],
  audit: []
});
const cloneMarket = (value) => JSON.parse(JSON.stringify(value));
function readMarket() {
  try {
    const value = JSON.parse(storage?.getItem('torobai.market.v18') || 'null');
    if (!value || value.version !== 1) return emptyMarket();
    const result = emptyMarket();
    for (const key of Object.keys(result).filter((k) => k !== 'version'))
      result[key] = Array.isArray(value[key])
        ? value[key]
            .filter(
              (x) => x && typeof x === 'object' && !Array.isArray(x) && typeof x.id === 'string'
            )
            .slice(0, key === 'history' ? 2000 : 300)
        : [];
    result.history = result.history.filter(
      (h) =>
        typeof h.watch_id === 'string' &&
        recordDate(h.at) &&
        (h.amount === null || (Number.isFinite(h.amount) && h.amount >= 0)) &&
        typeof h.version === 'string' &&
        typeof h.seller === 'string'
    );
    result.policies = result.policies.filter(
      (p) =>
        ['site', 'browser'].includes(p.channel) &&
        (p.target == null || (Number.isFinite(p.target) && p.target >= 0))
    );
    return result;
  } catch {
    return emptyMarket();
  }
}
function writeMarket(next, message = '') {
  try {
    if (!storage) throw Error();
    storage.setItem('torobai.market.v18', JSON.stringify(next));
    marketState = next;
    if (message) toast(message);
    return true;
  } catch {
    toast('ذخیره انجام نشد؛ فضای مرورگر را بررسی کنید و فایل پشتیبان بگیرید.');
    return false;
  }
}
function marketAudit(next, action, target) {
  next.audit.unshift({
    id: 'audit-' + Date.now() + '-' + next.audit.length,
    action,
    target,
    at: new Date().toISOString()
  });
  next.audit = next.audit.slice(0, 200);
}
function marketInput(form, name) {
  return (form.querySelector(`[name="${name}"]`)?.value || '').trim();
}
function marketError(id, text) {
  const node = $(id);
  if (node) {
    node.textContent = text;
    node.hidden = false;
  }
}
function capabilityChecks(view = state) {
  return `<div class="capability-checks">${Object.entries(capabilityLabels)
    .map(
      ([key, label]) =>
        `<label><input type="checkbox" name="${key}" ${view[key] ? 'checked' : ''}>${label}</label>`
    )
    .join('')}</div>`;
}
function capabilityFilters() {
  if (!selected || selected.kind !== 'api' || purchaseMode === 'weights') return '';
  const count = Object.keys(capabilityLabels).filter(key => state[key]).length;
  return `<details class="offer-capability-filter" data-disclosure-popover><summary aria-controls="apiCapabilityPanel" aria-expanded="false">${icon('filter')}<span>قابلیت‌های API</span>${count ? `<b class="filter-count" aria-label="${fa(count)} فیلتر فعال">${num(count)}</b>` : ''}</summary><div id="apiCapabilityPanel" class="capability-panel" data-disclosure-panel><div class="capability-panel-heading"><strong>سرویس چه قابلیت‌هایی داشته باشد؟</strong><span>فقط پیشنهادهای مطابق انتخاب شما</span></div><form id="offerCapabilityForm">${capabilityChecks()}<div class="capability-actions"><button class="button primary" type="submit">اعمال فیلتر</button><button type="button" class="text-link" data-clear-capabilities>پاک کردن</button></div></form><p class="small">پشتیبانی باید در همین سرویس ثبت شده باشد؛ اطلاعات نامشخص وارد نتایج نمی‌شود.</p></div></details>`;
}
function attachCapabilities() {
  for (const p of catalog.products) {
    for (const o of p.offers)
      o.capabilities = { ...catalog.marketplace.capabilities[o.id], ...o.capabilities };
    for (const entry of Object.values(catalog.estimates[p.id] || {}))
      for (const o of entry.offers)
        o.capabilities = p.offers.find((x) => x.id === o.id)?.capabilities || {};
  }
}
function tariffPlan(p, o, mode = 'instant') {
  if (o.availability === 'unavailable') return { reason: 'این پیشنهاد در دسترس نیست.' };
  const rates = mode === 'batch' ? o.batch : o;
  if (!rates || (mode === 'batch' && !rates.supported))
    return { reason: 'تعرفه Batch برای این پیشنهاد ثبت نشده است.' };
  const plan = cloneMarket(catalog.marketplace.flat_plans[p.unit]);
  for (const term of plan.terms) {
    const n = rates[term.rate_key];
    if (!Number.isFinite(n)) return { reason: 'تعرفه کامل نشده است.' };
    term.rate = String(n);
  }
  plan.rates = Object.fromEntries(
    ['toman_input_m', 'toman_output_m', 'toman_unit'].map((k) => [k, rates[k] ?? null])
  );
  if (p.unit === 'tokens' && o.context)
    plan.checks.push({
      fields: ['input_tokens', 'output_tokens'],
      max: o.context,
      reason: 'مصرف از ظرفیت سرویس بیشتر است.'
    });
  return plan;
}
function proposalError(d, base = marketBase) {
  if (!/^[a-z0-9-]+$/.test(d.id) || !recordDate(d.updated_at))
    return 'شناسه یا تاریخ پیشنهاد معتبر نیست.';
  const p = base.products.find((p) => p.id === d.product_id);
  if (!p || p.kind !== 'api') return 'مدل معتبر را از فهرست انتخاب کنید.';
  if (!['api', 'weights'].includes(d.access)) return 'نوع عرضه را مشخص کنید.';
  if (typeof d.seller !== 'string' || !d.seller.trim() || d.seller.length > 100)
    return 'نام عرضه‌کننده را وارد کنید.';
  if (d.source_url && safeURL(d.source_url) === '#') return 'لینک باید با https شروع شود.';
  if (typeof d.terms !== 'string' || d.terms.trim().length < 10 || d.terms.length > 1500)
    return 'شرایط عرضه را کامل و کوتاه بنویسید.';
  for (const key of ['rate', ...(d.access === 'api' && p.unit === 'tokens' ? ['output'] : [])])
    if (!Number.isFinite(d[key]) || d[key] < 0 || d[key] > 1e12) return 'تعرفه معتبر وارد کنید.';
  if (
    d.access === 'weights' &&
    (!['commercial', 'research'].includes(d.license) || !d.format || !d.hardware)
  )
    return 'مجوز، فایل‌های تحویلی و سخت‌افزار لازم را مشخص کنید.';
  if (
    d.access === 'api' &&
    d.batch &&
    (![d.batch_rate, ...(p.unit === 'tokens' ? [d.batch_output] : [])].every(
      (n) => Number.isFinite(n) && n >= 0 && n <= 1e12
    ) ||
      !Number.isInteger(d.batch_hours) ||
      d.batch_hours < 1 ||
      d.batch_hours > 168 ||
      !Number.isInteger(d.batch_max) ||
      d.batch_max < 1 ||
      d.batch_max > 1e6)
  )
    return 'تعرفه و زمان تحویل Batch را کامل کنید.';
  if (
    !Number.isFinite(d.credit) ||
    d.credit < 0 ||
    d.credit > 1e12 ||
    !Number.isFinite(d.tax) ||
    d.tax < 0 ||
    d.tax > 100
  )
    return 'حداقل اعتبار و درصد مالیات معتبر نیست.';
  return '';
}
function offerFromProposal(d, p) {
  const sellerId =
    d.seller_id && allSellers().some((s) => s.id === d.seller_id) ? d.seller_id : 'local-' + d.id;
  const known = allSellers().find((s) => s.id === sellerId);
  const seller = {
    ...known,
    name: known?.name || d.seller,
    min_credit_toman: d.credit,
    tax_percent: d.tax,
    site: d.source_url || null,
    terms_note: d.terms
  };
  const common = {
    id: 'local-' + d.id,
    product_id: p.id,
    seller_id: sellerId,
    seller: seller.name,
    seller_info: seller,
    source_url: d.source_url || null,
    price_status: 'provider_declared',
    listing_basis: 'local_workspace',
    observed_at: d.updated_at.slice(0, 10),
    availability: d.available ? 'available' : 'unavailable'
  };
  if (d.access === 'weights')
    return {
      ...common,
      price_toman: d.rate,
      license_name: d.license === 'commercial' ? 'مجوز تجاری یک سازمان' : 'مجوز پژوهشی',
      license_term: 'طبق شرایط عرضه‌کننده',
      commercial_use: d.license === 'commercial',
      modification: Boolean(d.modification),
      redistribution: Boolean(d.redistribution),
      exclusive: false,
      includes_training_data: false,
      format: d.format,
      requirements: d.hardware,
      support: d.terms,
      updates: 'طبق توافق',
      delivery: 'هماهنگی دریافت فایل با عرضه‌کننده',
      billing: 'one_time'
    };
  const key = p.unit === 'tokens' || p.unit === 'input_tokens' ? 'toman_input_m' : 'toman_unit';
  return {
    ...common,
    kind: 'api',
    unit: p.unit,
    model_id: p.model_id || p.id,
    request_only: !d.source_url,
    context: p.context || null,
    [key]: d.rate,
    toman_output_m: p.unit === 'tokens' ? d.output : null,
    streaming: d.streaming === true,
    minimum_credit_toman: d.credit,
    minimum_payment_toman: billTotal(d.credit, d.tax),
    capabilities: {
      json: d.json === true,
      tools: d.tools === true,
      streaming: d.streaming === true,
      no_retention: d.no_retention === true,
      basis: 'provider_declared'
    },
    service_terms: {
      privacy: d.no_retention ? 'بدون نگهداری ورودی و خروجی، طبق اظهار عرضه‌کننده' : d.terms,
      use_scope: d.terms,
      support: d.terms
    },
    batch: d.batch
      ? {
          supported: true,
          [key]: d.batch_rate,
          toman_output_m: d.batch_output,
          completion_hours: d.batch_hours,
          max_requests: d.batch_max
        }
      : { supported: false }
  };
}
function updateError(row, base = catalog) {
  const p = base.products.find((p) =>
    [...p.offers, ...(p.weight_offers || [])].some((o) => o.id === row.id)
  );
  if (!p) return 'شناسه پیشنهاد پیدا نشد.';
  if (!['available', 'unavailable', 'unknown'].includes(row.availability))
    return 'وضعیت عرضه معتبر نیست.';
  if (
    typeof row.observed_at !== 'string' ||
    !recordDate(row.observed_at) ||
    Date.parse(row.observed_at) > Date.now() + 86400000
  )
    return 'تاریخ ثبت معتبر نیست.';
  const supplied = tariffKeys.filter((k) => row[k] != null);
  if (supplied.some((k) => !Number.isFinite(row[k]) || row[k] < 0 || row[k] > 1e12))
    return 'مبلغ باید عددی بین صفر و یک تریلیون باشد.';
  const weights = p.weight_offers?.some((o) => o.id === row.id);
  if (weights && supplied.some((k) => k !== 'price_toman'))
    return 'قیمت وزن‌ها فقط در price_toman ثبت می‌شود.';
  const o = [...p.offers, ...(p.weight_offers || [])].find((o) => o.id === row.id);
  const allowed = weights
    ? ['price_toman']
    : p.kind === 'gpu'
      ? catalog.marketplace.gpu_plans[o.id]?.standard.terms.map((t) => t.rate_key) || []
      : p.unit === 'tokens'
        ? [
            'toman_input_m',
            'toman_output_m',
            ...(o.long_context_threshold ? ['toman_input_long_m', 'toman_output_long_m'] : [])
          ]
        : [p.unit === 'input_tokens' ? 'toman_input_m' : 'toman_unit'];
  if (supplied.some((k) => !allowed.includes(k)))
    return 'ستون تعرفه با واحد این پیشنهاد سازگار نیست؛ نوع تعرفه را تغییر ندهید.';
  return '';
}
function applyMarket() {
  marketRevision++;
  cancelGPUMatch();
  gpuMatchCache.clear();
  catalog = cloneMarket(marketBase);
  products = catalog.products;
  for (const d of marketState.models.filter(
    (d) => d.status === 'approved' && !HB.validateListing(d, 1) && !HB.validateListing(d, 2)
  ))
    addWorkspaceModel(d);
  for (const d of marketState.proposals
    .map((d) => (d.status === 'approved' ? d : d.published))
    .filter((d) => d && !proposalError(d, catalog))) {
    const p = products.find((p) => p.id === d.product_id),
      o = offerFromProposal(d, p);
    if (d.access === 'weights') (p.weight_offers ||= []).push(o);
    else {
      p.offers.push(o);
      catalog.pricing_plans[o.id] = { instant: tariffPlan(p, o), batch: tariffPlan(p, o, 'batch') };
      catalog.marketplace.editable_plans[o.id] = {
        instant: tariffPlan(p, { ...o, availability: 'available' }),
        batch: tariffPlan(p, { ...o, availability: 'available' }, 'batch')
      };
      for (const entry of Object.values(catalog.estimates[p.id])) entry.offers.push(cloneMarket(o));
    }
  }
  for (const row of marketState.updates.filter((row) => !updateError(row))) {
    const p = products.find((p) =>
      [...p.offers, ...(p.weight_offers || [])].some((o) => o.id === row.id)
    );
    const o = [...p.offers, ...(p.weight_offers || [])].find((o) => o.id === row.id);
    const fields = ['availability', 'observed_at', ...tariffKeys];
    const patch = Object.fromEntries(fields.filter((k) => row[k] != null).map((k) => [k, row[k]]));
    Object.assign(o, patch);
    for (const entry of Object.values(catalog.estimates[p.id] || {})) {
      const q = entry.offers.find((q) => q.id === o.id);
      if (q) Object.assign(q, patch);
      if (q && o.availability === 'unavailable') q.estimate_toman = null;
    }
    if (p.kind === 'api' && catalog.pricing_plans[o.id]) {
      if (catalog.marketplace.editable_plans[o.id])
        catalog.pricing_plans[o.id] = cloneMarket(catalog.marketplace.editable_plans[o.id]);
      const plan = catalog.pricing_plans[o.id].instant;
      for (const branch of [plan, plan.long].filter(Boolean)) {
        if (branch.terms?.some((t) => o[t.rate_key] == null)) {
          branch.terms = null;
          continue;
        }
        for (const term of branch.terms || []) {
          term.rate = String(o[term.rate_key]);
          (branch.rates ||= {})[term.rate_key.replace('_long_', '_')] = o[term.rate_key];
        }
      }
      if (o.availability === 'unavailable')
        catalog.pricing_plans[o.id] = {
          instant: { reason: 'این پیشنهاد در دسترس نیست.' },
          batch: { reason: 'این پیشنهاد در دسترس نیست.' }
        };
    }
    if (p.kind === 'gpu')
      for (const [key, entry] of Object.entries(catalog.estimates[p.id])) {
        const q = entry.offers.find((x) => x.id === o.id),
          plan = cloneMarket(catalog.marketplace.gpu_plans[o.id]?.[key] || {});
        if (!q || !plan.terms) continue;
        for (const term of plan.terms) term.rate = String(o[term.rate_key]);
        Object.assign(
          q,
          o.availability === 'unavailable'
            ? { estimate_toman: null, estimate_reason: 'این پیشنهاد در دسترس نیست.' }
            : HB.evaluatePlan(plan, { quantity: plan.quantity })
        );
        if (o.min_credit_hours && o.hourly_toman != null)
          q.minimum_credit_toman = HB.evaluatePlan(
            { terms: [{ rate: String(o.hourly_toman), fields: ['hours'], denominator: 1 }] },
            { hours: o.min_credit_hours }
          ).estimate_toman;
        q.minimum_payment_toman = billTotal(q.minimum_credit_toman, q.seller_info?.tax_percent);
      }
  }
  // A merge is allowed only for the same canonical model and version.
  for (const merge of marketState.merges) {
    const a = products.find((p) => p.id === merge.id),
      b = products.find((p) => p.id === merge.target);
    if (
      a &&
      b &&
      a.id !== b.id &&
      a.model_id &&
      a.model_id === b.model_id &&
      a.unit === b.unit &&
      String(a.version || '') === String(b.version || '')
    ) {
      b.offers.push(...a.offers.filter((o) => !b.offers.some((x) => x.id === o.id)));
      b.weight_offers = [...(b.weight_offers || []), ...(a.weight_offers || [])];
      for (const key of Object.keys(catalog.estimates[b.id]))
        catalog.estimates[b.id][key].offers.push(...catalog.estimates[a.id][key].offers);
      products.splice(products.indexOf(a), 1);
    }
  }
  attachCapabilities();
  for (const p of products.filter((p) => p.kind === 'api'))
    for (const entry of Object.values(catalog.estimates[p.id]))
      entry.offers = entry.offers.map((o) => ({
        ...o,
        ...HB.evaluatePlan(catalog.pricing_plans[o.id].instant, entry.assumptions)
      }));
  estimateCache.clear();
  pendingEstimates.clear();
}
function initMarket() {
  if (!catalog.marketplace) return;
  marketBase = cloneMarket(catalog);
  marketState = readMarket();
  applyMarket();
  observeWatchPrices();
  updateNoticeCount();
}
function billTotal(subtotal, tax) {
  if (!Number.isFinite(subtotal) || !Number.isFinite(tax)) return null;
  return HB.evaluatePlan(catalog.marketplace.tax_plan, { subtotal, tax }).estimate_toman;
}
function billBreakdown(p, o, values) {
  if (o.estimate_toman == null)
    return '<p class="small">برای این انتخاب، مبلغ قابل محاسبه نیست.</p>';
  const tax = o.seller_info?.tax_percent,
    total = billTotal(o.estimate_toman, tax);
  const funded =
    o.minimum_credit_toman == null
      ? null
      : billTotal(Math.max(o.minimum_credit_toman, o.estimate_toman), tax);
  let parts = [];
  if (p.kind === 'api') {
    const plan = catalog.pricing_plans[o.id]?.[o.request_mode || 'instant'];
    const branch = plan?.long && values.input_tokens > plan.long.above ? plan.long : plan;
    parts = (branch?.terms || []).map((term) => [
      term.rate_key?.includes('output')
        ? 'خروجی'
        : term.rate_key?.includes('input')
          ? 'ورودی'
          : 'مصرف',
      HB.evaluatePlan({ terms: [term] }, values).estimate_toman
    ]);
  }
  return `<details class="bill-details"><summary>جزئیات مبلغ و پرداخت اولیه ${icon('arrow')}</summary><dl>${parts.map(([label, value]) => `<div><dt>${label}</dt><dd>${money(value)}</dd></div>`).join('')}<div><dt>هزینه مصرف ${o.request_mode === 'batch' ? 'با تعرفه Batch' : ''}</dt><dd>${money(o.estimate_toman)}</dd></div><div><dt>مالیات ثبت‌شده</dt><dd>${tax == null ? 'اعلام نشده' : num(tax) + '٪'}</dd></div><div class="bill-total"><dt>مصرف با مالیات</dt><dd>${total == null ? 'نیاز به تایید عرضه‌کننده' : money(total)}</dd></div><div><dt>اعتبار لازم برای شروع این مصرف</dt><dd>${funded == null ? 'نیاز به استعلام' : money(funded)}</dd></div></dl><p>اعتبار اولیه ممکن است از هزینه مصرف بیشتر باشد؛ مانده آن تابع شرایط فروشنده است.</p><p>${p.kind === 'gpu' ? 'هزینه دیسک، شبکه و انتقال داده در صورت نبود تعرفه جدا، در این مبلغ لحاظ نشده است.' : 'هزینه ابزار و کش در این برآورد تفکیک نشده است؛ فرض محاسبه، ورودی بدون کش است.'}</p></details>`;
}
function offerComparisonButton(o) {
  return `<label class="offer-compare-choice"><input type="checkbox" data-compare-offer="${o.id}" ${sellerCompare.includes(o.id) ? 'checked' : ''}>مقایسه عرضه‌کننده</label>`;
}
function renderSellerCompareBar() {
  const el = $('sellerCompareBar');
  if (!el) return;
  const ids = activeEstimate?.offers.map((o) => o.id) || [];
  sellerCompare = sellerCompare.filter((id) => ids.includes(id));
  el.hidden = !sellerCompare.length;
  el.innerHTML = `<span>${num(sellerCompare.length)} پیشنهاد انتخاب شده</span><button class="button primary" data-show-seller-comparison ${sellerCompare.length < 2 ? 'disabled' : ''}>مقایسه تفاوت‌ها</button><button class="text-link" data-clear-seller-comparison>پاک کردن</button>`;
}
function showSellerComparison(differences = true) {
  const rows = (activeEstimate?.offers || []).filter((o) => sellerCompare.includes(o.id));
  if (rows.length < 2) return;
  const yn = (v) => (v === true ? 'دارد' : v === false ? 'ندارد' : 'اعلام نشده');
  const facts = [
    ['هزینه همین مصرف', (o) => (o.estimate_toman == null ? 'نامشخص' : money(o.estimate_toman))],
    [
      'مصرف با مالیات',
      (o) => {
        const n = billTotal(o.estimate_toman, o.seller_info?.tax_percent);
        return n == null ? 'نامشخص' : money(n);
      }
    ],
    [
      'حداقل اعتبار',
      (o) => (o.minimum_credit_toman == null ? 'نامشخص' : money(o.minimum_credit_toman))
    ],
    ['نسخه سرویس', (o) => esc(o.model_id || selected.model_id || selected.version || 'اعلام نشده')],
    ...Object.entries(capabilityLabels).map(([k, l]) => [l, (o) => yn(o.capabilities?.[k])]),
    [
      'Batch',
      (o) => (o.batch?.supported ? 'تا ' + fa(o.batch.completion_hours) + ' ساعت' : 'اعلام نشده')
    ],
    ['دقت اجرا', (o) => esc(o.capabilities?.quantization || 'اعلام نشده')],
    [
      'زمان شروع پاسخ',
      (o) =>
        o.capabilities?.latency_ms != null
          ? fa(o.capabilities.latency_ms) + ' میلی‌ثانیه'
          : 'اندازه‌گیری ثبت نشده'
    ],
    [
      'سرعت تولید',
      (o) =>
        o.capabilities?.tokens_second != null
          ? fa(o.capabilities.tokens_second) + ' توکن/ثانیه'
          : 'اندازه‌گیری ثبت نشده'
    ],
    ['ظرفیت متن', (o) => (o.context ? fa(o.context) + ' توکن' : 'اعلام نشده')],
    ['نگهداری داده', (o) => esc(o.service_terms?.privacy || 'طبق شرایط عرضه‌کننده')]
  ];
  const shown = facts.filter(([, fn]) => !differences || new Set(rows.map(fn)).size > 1);
  showDialog(
    'مقایسه عرضه‌کنندگان ' + esc(selected.title),
    `<p>${esc(usageText(selected, activeEstimate.assumptions))}</p><label class="request-check"><input type="checkbox" id="onlyOfferDifferences" ${differences ? 'checked' : ''}>فقط تفاوت‌ها</label><div class="comparison-scroll"><table class="offer-comparison"><thead><tr><th>ویژگی</th>${rows.map((o) => `<th>${sellerLink(o)}</th>`).join('')}</tr></thead><tbody>${shown.map(([label, fn]) => `<tr><th>${label}</th>${rows.map((o) => `<td>${fn(o)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${rows.length + 1}">در اطلاعات ثبت‌شده تفاوتی نیست؛ برای دیدن همه مشخصات، تیک بالا را بردارید.</td></tr>`}</tbody></table></div><p class="small">نبود اطلاعات به معنی یکسان بودن کیفیت نیست. سرعت فقط با اندازه‌گیری ثبت‌شده قابل مقایسه است.</p>`
  );
}

function searchSuggestions(query) {
  const q = HB.normalize(query).trim();
  if (!q) return [];
  const matches = (text) => q.split(/\s+/).every((w) => HB.normalize(text).includes(w));
  return [
    ...products
      .filter((p) => matches([p.title, p.maker, p.search_terms, p.description].join(' ')))
      .slice(0, 5)
      .map((p) => ({
        type: 'مدل و GPU',
        label: p.title,
        sub: tasks[p.task],
        url: href(p, {}),
        logo: logo(p)
      })),
    ...allSellers()
      .filter((s) => matches(s.name))
      .slice(0, 3)
      .map((s) => ({
        type: 'عرضه‌کننده',
        label: s.name,
        sub: sellerServices(s.id).join(' · '),
        url: '#providers/' + s.id,
        logo: s.logo ? logo(s) : icon('layers')
      })),
    ...Object.entries(tasks)
      .filter(([k, v]) => matches(v + ' ' + k))
      .slice(0, 3)
      .map(([k, v]) => ({
        type: 'کاربرد',
        label: v,
        sub: 'همه مدل‌های این کاربرد',
        url: k === 'gpu' ? '#gpu' : '#api?task=' + k,
        logo: icon(taskIcon(k))
      }))
  ];
}
function renderSearchSuggestions() {
  const box = $('unifiedSuggestions'),
    input = $('searchInput');
  if (!box || !catalog) return;
  const rows = searchSuggestions(input.value);
  box.innerHTML = rows.length
    ? rows
        .map(
          (r, i) =>
            `<a id="suggest-${i}" role="option" aria-selected="false" href="${esc(r.url)}"><span class="suggest-logo">${r.logo}</span><span><b dir="auto">${esc(r.label)}</b><small>${esc(r.sub)}</small></span><em>${r.type}</em></a>`
        )
        .join('')
    : `<p>پیشنهاد مستقیمی پیدا نشد؛ Enter را برای جستجوی کامل بزنید.</p>`;
  box.hidden = !input.value.trim();
  input.setAttribute('aria-expanded', String(!box.hidden));
  input.removeAttribute('aria-activedescendant');
}
function closeSearchSuggestions() {
  const box = $('unifiedSuggestions');
  if (box) box.hidden = true;
  $('searchInput')?.setAttribute('aria-expanded', 'false');
  $('searchInput')?.removeAttribute('aria-activedescendant');
}

const proposalStatuses = {
  draft: 'پیش‌نویس',
  submitted: 'در انتظار بررسی',
  approved: 'فعال در کاتالوگ',
  rejected: 'نیاز به اصلاح'
};
function renderStudio(record = null) {
  if (!record && !state.model) record = localRecords('torobai.offer.work')[0] || null;
  const p =
    products.find((p) => p.id === (record?.product_id || state.model)) ||
    products.find((p) => p.kind === 'api');
  const d = record || { product_id: p.id, access: 'api', available: true, credit: 0, tax: 0 };
  proposalDraftId = record?.id || '';
  const field = (key, label, type = 'text', value = '') =>
    `<label>${label}<input name="${key}" type="${type}" value="${esc(d[key] ?? value)}" ${type === 'number' ? 'min="0" max="1000000000000" step="any"' : 'maxlength="200"'}></label>`;
  const check = (key, label) =>
    `<label class="request-check"><input name="${key}" type="checkbox" ${d[key] ? 'checked' : ''}>${label}</label>`;
  $('main').innerHTML =
    `<section class="catalog-heading"><div><p class="breadcrumb">torobai / عرضه‌کننده</p><h1>پیشنهاد شما برای یک مدل</h1><p>مدل را انتخاب کنید و قیمت و شرایط عرضه خودتان را کنار بقیه قرار دهید.</p></div><a href="#publish" class="button secondary">مدل من در فهرست نیست</a></section>
  <p class="workspace-note">پیشنهادها پس از تایید در مدیریت کاتالوگ فعال می‌شوند. اطلاعات این فضای کاری در مرورگر شما ذخیره می‌شود و قابل دریافت است.</p>
  <div class="workspace-layout"><section class="workspace-panel"><form id="proposalForm" class="request-form"><div class="listing-grid"><label class="full">مدل موجود<select name="product_id">${products
    .filter((p) => p.kind === 'api')
    .map(
      (p) =>
        `<option value="${p.id}" ${p.id === d.product_id ? 'selected' : ''}>${esc(p.title)} · ${tasks[p.task]}</option>`
    )
    .join(
      ''
    )}</select></label><label>روش عرضه<select name="access"><option value="api" ${d.access === 'api' ? 'selected' : ''}>دسترسی API</option><option value="weights" ${d.access === 'weights' ? 'selected' : ''}>مجوز وزن‌ها</option></select></label><label>پروفایل عرضه‌کننده<select name="seller_id"><option value="">عرضه‌کننده جدید</option>${allSellers()
    .map(
      (s) =>
        `<option value="${s.id}" ${d.seller_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`
    )
    .join(
      ''
    )}</select></label>${field('seller', 'نام عرضه‌کننده')}${field('source_url', 'لینک خرید یا صفحه تعرفه (اختیاری)', 'url')}${field('rate', 'تعرفه / قیمت (تومان)', 'number')}${field('output', 'خروجی / میلیون توکن (تومان)', 'number')}${field('credit', 'حداقل اعتبار (تومان)', 'number')}${field('tax', 'مالیات (درصد)', 'number')}</div><p id="proposalUnit" class="small"></p>
  <div id="proposalAPI"><h3>قابلیت‌های همین سرویس</h3><div class="capability-checks">${Object.entries(
    capabilityLabels
  )
    .map(([k, l]) => check(k, l))
    .join(
      ''
    )}${check('batch', 'درخواست دسته‌ای (Batch)')}</div><div id="proposalBatch" class="listing-grid">${field('batch_rate', 'تعرفه Batch / واحد مصرف', 'number')}${field('batch_output', 'خروجی Batch / میلیون توکن', 'number')}${field('batch_hours', 'حداکثر زمان تحویل (ساعت)', 'number')}${field('batch_max', 'سقف درخواست هر دسته', 'number')}</div></div>
  <div id="proposalWeights"><div class="listing-grid"><label>مجوز<select name="license"><option value="commercial" ${d.license !== 'research' ? 'selected' : ''}>تجاری، غیرانحصاری</option><option value="research" ${d.license === 'research' ? 'selected' : ''}>فقط پژوهشی</option></select></label>${field('format', 'فایل‌های تحویلی؛ مثلا Safetensors')}${field('hardware', 'نیاز سخت‌افزاری')}</div>${check('modification', 'تغییر و تنظیم مدل مجاز است')}${check('redistribution', 'بازنشر طبق قرارداد مجاز است')}</div>
  <label>شرایط پشتیبانی، استفاده و نگهداری داده<textarea name="terms" rows="4" maxlength="1500">${esc(d.terms || '')}</textarea></label>${check('available', 'این پیشنهاد در دسترس است')}<p id="proposalError" class="form-error" role="alert" hidden></p><div class="filter-actions"><button type="submit" class="button secondary">ذخیره پیش‌نویس</button><button type="button" class="button primary" data-proposal-submit>ثبت برای بررسی</button><button type="button" class="text-link" data-proposal-export>دریافت فایل</button></div></form></section>
  <aside class="workspace-panel"><div class="section-heading"><h2>پیشنهادهای شما</h2><button type="button" class="text-link" data-new-proposal>پیشنهاد تازه</button></div><p class="small">برای API و وزن‌های یک مدل، دو پیشنهاد ثبت کنید و در هر دو همان پروفایل عرضه‌کننده را انتخاب کنید.</p>${marketState.proposals.map((r) => `<article class="workspace-record"><span class="draft-badge">${proposalStatuses[r.status] || 'پیش‌نویس'}</span><h3>${esc(products.find((p) => p.id === r.product_id)?.title || r.product_id)}</h3><p>${esc(r.seller)} · ${r.access === 'weights' ? 'وزن‌ها' : 'API'}</p>${r.review_note ? `<p>${esc(r.review_note)}</p>` : ''}<button class="text-link" data-edit-proposal="${esc(r.id)}">ویرایش</button><button class="text-link" data-delete-proposal="${esc(r.id)}">حذف</button></article>`).join('') || '<p>هنوز پیشنهادی ثبت نکرده‌اید.</p>'}<a href="#manage" class="text-link">مدیریت و بررسی پیشنهادها ${icon('arrow')}</a></aside></div>`;
  syncProposalFields();
  document.title = 'پنل عرضه‌کننده | torobai';
}
function syncProposalFields() {
  const f = $('proposalForm');
  if (!f) return;
  const p = products.find((p) => p.id === marketInput(f, 'product_id')),
    weights = marketInput(f, 'access') === 'weights';
  $('proposalAPI').hidden = weights;
  $('proposalWeights').hidden = !weights;
  $('proposalBatch').hidden = weights || !f.querySelector('[name=batch]').checked;
  for (const name of ['output', 'batch_output'])
    f.querySelector(`[name=${name}]`).closest('label').hidden = weights || p?.unit !== 'tokens';
  for (const name of ['credit', 'tax'])
    f.querySelector(`[name=${name}]`).closest('label').hidden = weights && name === 'credit';
  $('proposalUnit').textContent = weights
    ? 'قیمت یک‌باره مجوز وزن‌ها؛ هزینه API و سرور جداست.'
    : 'مبنای تعرفه: ' + (unitLabels[p?.unit] || '');
}
function readProposal() {
  const f = $('proposalForm'),
    d = { id: proposalDraftId || 'proposal-' + Date.now(), updated_at: new Date().toISOString() };
  for (const el of f.querySelectorAll('[name]'))
    d[el.name] = el.type === 'checkbox' ? el.checked : String(el.value || '').trim();
  const seller = allSellers().find((s) => s.id === d.seller_id);
  if (seller) d.seller = seller.name;
  for (const key of [
    'rate',
    'output',
    'credit',
    'tax',
    'batch_rate',
    'batch_output',
    'batch_hours',
    'batch_max'
  ])
    d[key] =
      d[key] === ''
        ? ['credit', 'tax'].includes(key)
          ? 0
          : null
        : parseNumber(d[key], 1e12, false);
  return d;
}
function saveProposal(status) {
  const d = readProposal(),
    error = proposalError(d, catalog);
  if (error) {
    marketError('proposalError', error);
    return;
  }
  d.status = status;
  const previous = marketState.proposals.find((x) => x.id === d.id);
  if (previous) {
    d.published = previous.status === 'approved' ? cloneMarket(previous) : previous.published;
    if (d.published) delete d.published.published;
  }
  const next = cloneMarket(marketState);
  next.proposals = [d, ...next.proposals.filter((x) => x.id !== d.id)].slice(0, 200);
  marketAudit(next, 'ذخیره پیشنهاد', d.id);
  if (
    writeMarket(
      next,
      status === 'submitted' ? 'پیشنهاد به صف بررسی این فضای کاری اضافه شد.' : 'پیش‌نویس ذخیره شد.'
    )
  ) {
    applyMarket();
    observeWatchPrices();
    renderStudio(d);
  }
}
function parseImport(text, format) {
  if (text.length > 1000000) throw Error('حجم فایل بیشتر از یک مگابایت است.');
  let rows;
  if (format === 'json') rows = JSON.parse(text.replace(/^\uFEFF/, ''));
  else {
    const lines = [];
    let row = [],
      cell = '',
      quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = !quoted;
      } else if (!quoted && (c === ',' || c === '\n')) {
        row.push(cell);
        cell = '';
        if (c === '\n') {
          lines.push(row);
          row = [];
        }
      } else if (c !== '\r') cell += c;
    }
    if (quoted) throw Error('نقل‌قول CSV بسته نشده است.');
    if (cell || row.length) {
      row.push(cell);
      lines.push(row);
    }
    const headers = lines.shift()?.map((s) => s.replace(/^\uFEFF/, '').trim());
    if (!headers?.includes('id') || new Set(headers).size !== headers.length)
      throw Error('ستون id لازم است؛ نام ستون‌ها نباید تکراری باشد.');
    rows = lines
      .filter((r) => r.some((v) => v.trim()))
      .map((r) => {
        if (r.length !== headers.length) throw Error('تعداد ستون‌های CSV یکسان نیست.');
        return Object.fromEntries(headers.map((k, i) => [k, r[i].trim()]));
      });
  }
  if (!Array.isArray(rows) || !rows.length || rows.length > 200)
    throw Error('فایل باید بین یک تا ۲۰۰ ردیف داشته باشد.');
  const allowed = ['id', 'observed_at', 'availability', ...tariffKeys];
  const used = new Set();
  return rows.map((raw, i) => {
    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      Object.keys(raw).some((k) => !allowed.includes(k))
    )
      throw Error('ستون ناشناخته در ردیف ' + (i + 1));
    const r = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== '' && v != null));
    if (typeof r.id !== 'string' || used.has(r.id))
      throw Error('شناسه نامعتبر یا تکراری در ردیف ' + (i + 1));
    used.add(r.id);
    for (const k of allowed.slice(3))
      if (r[k] != null) r[k] = typeof r[k] === 'number' ? r[k] : parseNumber(r[k], 1e12, false);
    const error = updateError(r);
    if (error) throw Error('ردیف ' + (i + 1) + ': ' + error);
    return r;
  });
}
function duplicateCandidates() {
  const groups = new Map();
  for (const p of products) {
    const key = p.model_id && [p.kind, p.model_id, p.version || '', p.unit].join('|');
    if (key) groups.set(key, [...(groups.get(key) || []), p]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}
function tariffChanges(row) {
  const o = products
    .flatMap((p) => [...p.offers, ...(p.weight_offers || [])])
    .find((o) => o.id === row.id);
  const labels = {
    toman_input_m: 'ورودی / میلیون',
    toman_output_m: 'خروجی / میلیون',
    toman_unit: 'واحد مصرف',
    toman_input_long_m: 'ورودی بلند / میلیون',
    toman_output_long_m: 'خروجی بلند / میلیون',
    price_toman: 'مجوز وزن‌ها',
    hourly_toman: 'هر ساعت',
    daily_toman: 'هر روز'
  };
  return (
    tariffKeys
      .filter((k) => row[k] != null)
      .map(
        (k) =>
          `${labels[k]}: ${o[k] == null ? 'نامشخص' : num(o[k], 2)} ← <strong>${num(row[k], 2)}</strong>`
      )
      .join('<br>') || 'بدون تغییر مبلغ'
  );
}
function renderManagement() {
  const submitted = marketState.proposals.filter((d) => d.status === 'submitted');
  const reports = reportRecords();
  const stale = products.flatMap((p) =>
    p.offers
      .filter((o) => !o.observed_at || Date.now() - Date.parse(o.observed_at) > 7 * 86400000)
      .map((o) => ({ p, o }))
  );
  const duplicates = duplicateCandidates();
  $('main').innerHTML =
    `<section class="catalog-heading"><div><p class="breadcrumb">torobai / مدیریت</p><h1>مدیریت کاتالوگ</h1><p>بررسی عرضه‌ها، گزارش‌ها و به‌روزرسانی تعرفه‌ها</p></div><button class="button secondary" data-export-workspace>دریافت پشتیبان</button></section><p class="workspace-note">تغییرات روی کاتالوگ همین مرورگر اعمال می‌شوند. برای نگهداری یک نسخه از اطلاعات، فایل پشتیبان بگیرید.</p>
  <nav class="work-tabs"><a href="#proposalQueue" data-scroll="proposalQueue">پیشنهادها ${num(submitted.length)}</a><a href="#reportQueue" data-scroll="reportQueue">گزارش‌ها ${num(reports.length)}</a><a href="#tariffImport" data-scroll="tariffImport">ورود تعرفه</a><a href="#catalogHealth" data-scroll="catalogHealth">کیفیت اطلاعات</a></nav>
  <section id="proposalQueue" class="workspace-panel"><h2>پیشنهادهای در انتظار بررسی</h2>${submitted.map((d) => `<article class="review-row"><div><h3>${esc(products.find((p) => p.id === d.product_id)?.title || d.product_id)} · ${esc(d.seller)}</h3><p>${d.access === 'weights' ? 'مجوز وزن‌ها' : 'API'} · ${money(d.rate)}</p><p>${esc(d.terms)}</p></div><div><button class="button primary" data-review-proposal="${esc(d.id)}" data-review="approved">بررسی و تایید</button><button class="button secondary" data-review-proposal="${esc(d.id)}" data-review="rejected">درخواست اصلاح</button></div></article>`).join('') || '<p class="small">پیشنهاد منتظر بررسی وجود ندارد.</p>'}<a class="text-link" href="#studio">ثبت پیشنهاد روی مدل موجود</a><a class="text-link" href="#publish">بررسی پیش‌نویس مدل‌های جدید</a></section>
  ${modelQueue()}<section id="reportQueue" class="workspace-panel"><h2>رسیدگی به گزارش‌های مغایرت</h2>${
    reports
      .map(
        (r) =>
          `<form class="review-row report-review" data-report-id="${esc(r.id)}"><div><h3>${esc(r.title)} · ${esc(r.seller)}</h3><p>${reportReasons[r.reason]} · ${esc(r.detail)}</p><small>${reportDecision(r.id).label}</small></div><div><label>نتیجه بررسی<select name="status">${[
            ['reviewing', 'در حال بررسی'],
            ['resolved', 'رسیدگی شد'],
            ['needs_info', 'نیاز به اطلاعات بیشتر']
          ]
            .map(
              ([k, label]) =>
                `<option value="${k}" ${reportDecision(r.id).status === k ? 'selected' : ''}>${label}</option>`
            )
            .join(
              ''
            )}</select></label><label>توضیح رسیدگی<input name="note" maxlength="500" required value="${esc(reportDecision(r.id).note || '')}"></label><button class="button secondary" type="submit">ثبت نتیجه</button></div></form>`
      )
      .join('') || '<p class="small">گزارشی ثبت نشده است.</p>'
  }</section>
  <section id="tariffImport" class="workspace-panel"><h2>به‌روزرسانی گروهی تعرفه و موجودی</h2><p class="small">فایل CSV یا JSON را انتخاب کنید. همه ردیف‌ها پیش از اعمال بررسی می‌شوند. تاریخ ثبت و شناسه پیشنهاد الزامی است؛ مبلغ‌ها به تومان هستند.</p><div class="filter-actions"><label class="button secondary">انتخاب فایل<input id="tariffFile" type="file" accept=".csv,.json,text/csv,application/json"></label><button class="text-link" data-import-template>دریافت الگو و شناسه‌ها</button></div><p id="importError" class="form-error" role="alert" hidden></p><div id="importPreview"></div></section>
  <section id="catalogHealth" class="workspace-panel"><h2>کیفیت اطلاعات</h2><details><summary>تعرفه‌های بدون تاریخ یا قدیمی‌تر از ۷ روز (${fa(stale.length)})</summary>${stale.map(({ p, o }) => `<div class="health-row"><a href="${href(p, { provider: o.seller_id })}">${esc(p.title)} · ${esc(o.seller)}</a><span>${recordDate(o.observed_at) || 'بدون تاریخ'}</span><code>${esc(o.id)}</code></div>`).join('') || '<p>موردی پیدا نشد.</p>'}</details><details><summary>مدل‌های دارای شناسه و نسخه یکسان (${fa(duplicates.length)})</summary>${
    duplicates
      .map(
        (group) =>
          `<div class="health-row"><span>${group.map((p) => esc(p.title)).join(' / ')}</span>${group
            .slice(1)
            .map(
              (p) =>
                `<button class="button secondary" data-merge-from="${p.id}" data-merge-target="${group[0].id}">ادغام ${esc(p.title)} در ${esc(group[0].title)}</button>`
            )
            .join('')}</div>`
      )
      .join('') || '<p>مدل تکراری با شناسه و نسخه یکسان پیدا نشد.</p>'
  }<p class="small">نام مشابه برای ادغام کافی نیست؛ شناسه مدل، نسخه و واحد مصرف باید یکسان باشند.</p>${marketState.merges.length ? '<button type="button" class="button secondary" data-reset-merges>بازگرداندن مدل‌های ادغام‌شده</button>' : ''}</details></section>
  <section class="workspace-panel"><h2>تغییرات اخیر</h2>${
    marketState.audit
      .slice(0, 20)
      .map(
        (r) =>
          `<div class="health-row"><span>${esc(r.action)}</span><code>${esc(r.target)}</code><time>${recordDate(r.at)}</time></div>`
      )
      .join('') || '<p class="small">تغییری در این فضای کاری ثبت نشده است.</p>'
  }</section>`;
  document.title = 'مدیریت کاتالوگ | torobai';
}
function reportDecision(id) {
  const r = marketState?.decisions.find((r) => r.id === id);
  return {
    ...r,
    label:
      { reviewing: 'در حال بررسی', resolved: 'رسیدگی شد', needs_info: 'نیاز به اطلاعات بیشتر' }[
        r?.status
      ] || 'در انتظار رسیدگی'
  };
}
function reviewProposal(id, status) {
  const d = marketState.proposals.find((d) => d.id === id);
  if (!d) return;
  showDialog(
    status === 'approved' ? 'تایید پیشنهاد' : 'درخواست اصلاح',
    `<form id="proposalReview" data-id="${esc(id)}" data-status="${status}" class="request-form"><h3>${esc(d.seller)} · ${esc(products.find((p) => p.id === d.product_id)?.title)}</h3><p>${esc(d.terms)}</p><p>تعرفه ${money(d.rate)} ${d.access === 'weights' ? 'برای مجوز وزن‌ها' : unitLabels[products.find((p) => p.id === d.product_id)?.unit]}</p><label>یادداشت بررسی<textarea name="note" maxlength="500" rows="3" ${status === 'rejected' ? 'required' : ''}></textarea></label><p class="small">${status === 'approved' ? 'این پیشنهاد به کاتالوگ همین فضای کاری اضافه می‌شود.' : 'پیشنهاد برای اصلاح به پنل عرضه‌کننده برمی‌گردد.'}</p><p id="reviewError" class="form-error" hidden></p><button type="submit" class="button primary">ثبت نتیجه بررسی</button></form>`
  );
}

const sampleSeeds = [
  {
    id: 'translation-business',
    task: 'translation',
    title: 'ترجمه متن کاری',
    input:
      'Please send the revised invoice by the end of the day. The payment is pending approval.',
    reference: 'لطفا صورتحساب اصلاح‌شده را تا پایان امروز بفرستید. پرداخت در انتظار تایید است.',
    kind: 'format_example',
    conditions: 'نمونه قالب خروجی؛ اجرای مدل و ارزیابی مستقل انجام نشده است.',
    outputs: [
      {
        model: 'tarjoman-en-fa',
        text: 'لطفا صورتحساب اصلاح‌شده را تا پایان روز ارسال کنید. پرداخت در انتظار تایید است.'
      },
      {
        model: 'parsinlu-en-fa',
        text: 'لطفا فاکتور اصلاح‌شده را تا پایان روز بفرستید. پرداخت منتظر تایید است.'
      }
    ]
  },
  {
    id: 'ocr-invoice',
    task: 'ocr',
    title: 'خواندن صورتحساب فارسی',
    input:
      'صورتحساب خدمات\nشماره: ۱۲۴۸\nتاریخ: ۱۴۰۵/۰۷/۱۹\nشرح: پردازش ۶۰۰ دقیقه صوت\nمبلغ: ۷۵۰٬۰۰۰ تومان',
    reference:
      'صورتحساب خدمات شماره ۱۲۴۸ تاریخ ۱۴۰۵/۰۷/۱۹ شرح پردازش ۶۰۰ دقیقه صوت مبلغ ۷۵۰۰۰۰ تومان',
    kind: 'format_example',
    conditions: 'نمونه قالب خروجی ساختاریافته؛ ورودی سند آموزشی است و نمره دقت مدل محسوب نمی‌شود.',
    outputs: [
      {
        model: 'negar-ocr',
        text: 'صورتحساب خدمات\nشماره: ۱۲۴۸\nتاریخ: ۱۴۰۵/۰۷/۱۹\nشرح: پردازش ۶۰۰ دقیقه صوت\nمبلغ: ۷۵۰٬۰۰۰ تومان'
      },
      {
        model: 'hezar-crnn-fa',
        text: '{"شماره": "۱۲۴۸", "تاریخ": "۱۴۰۵/۰۷/۱۹", "مبلغ_تومان": 750000}'
      }
    ]
  },
  {
    id: 'speech-conversation',
    task: 'transcription',
    title: 'گفتار محاوره‌ای',
    input: 'قرارمون ساعت سه بود، ولی من احتمالا یه ربع دیر می‌رسم؛ لطفا جلسه رو شروع کنید.',
    reference: 'قرارمون ساعت سه بود ولی من احتمالا یه ربع دیر می‌رسم لطفا جلسه رو شروع کنید',
    kind: 'format_example',
    conditions: 'متن مرجع و نمونه قالب خروجی؛ برای مقایسه روی صوت خودتان، فایل و خروجی ثبت کنید.',
    outputs: [
      {
        model: 'avanvis-fa',
        text: 'قرارمون ساعت سه بود، ولی من احتمالا یه ربع دیر می‌رسم. لطفا جلسه رو شروع کنید.'
      },
      {
        model: 'shenava-call',
        text: '[00:00–00:04] قرارمون ساعت سه بود ولی من احتمالا یه ربع دیر می‌رسم.\n[00:04–00:06] لطفا جلسه رو شروع کنید.',
        variant: 'خروجی با زمان‌بندی'
      }
    ]
  }
];
function sampleRecords() {
  return [
    ...sampleSeeds,
    ...marketState.samples.filter(
      (s) =>
        typeof s.title === 'string' &&
        typeof s.input === 'string' &&
        typeof s.conditions === 'string' &&
        Array.isArray(s.outputs) &&
        s.outputs.length >= 2 &&
        s.outputs.length <= 3 &&
        s.outputs.every(
          (o) => typeof o.model === 'string' && typeof o.text === 'string' && o.text.length <= 6000
        )
    )
  ];
}
function textDistance(a, b) {
  const tokens = (s) =>
    HB.normalize(s)
      .replace(/[.,،؛:!?؟()[\]{}"«»]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 1000);
  const x = tokens(a),
    y = tokens(b);
  let row = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const next = [i];
    for (let j = 1; j <= y.length; j++)
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    row = next;
  }
  return { edits: row[y.length], words: x.length };
}
function renderSamples(id = '') {
  const p = products.find((p) => p.id === state.model);
  const rows = sampleRecords();
  const s = rows.find((s) => s.id === id) || rows.find((s) => s.task === p?.task) || rows[0];
  const real = s.kind === 'registered';
  $('main').innerHTML =
    `<section class="catalog-heading"><div><p class="breadcrumb">torobai / نمونه‌های فارسی</p><h1>یک ورودی، خروجی‌های کنار هم</h1><p>متن ورودی، خروجی‌ها و شرایط اجرا را با هم بررسی کنید.</p></div><button class="button primary" data-new-sample>ثبت نمونه و خروجی‌ها</button></section><div class="sample-selector"><label>نمونه<select id="sampleSelect">${rows.map((r) => `<option value="${esc(r.id)}" ${r.id === s.id ? 'selected' : ''}>${esc(r.title)} · ${tasks[r.task]}</option>`).join('')}</select></label><label class="request-check"><input type="checkbox" id="sampleDifferences">برجسته کردن واژه‌های متفاوت</label></div>
  <p class="workspace-note">${esc(s.conditions)}${real ? ' · نتایج ثبت‌شده کاربر؛ تایید مستقل نشده است.' : ''}</p>
  <section class="sample-input workspace-panel"><span class="section-kicker">ورودی مشترک</span><h2>${esc(s.title)}</h2>${s.audio && /^data:audio\/(wav|mpeg|mp3|ogg|webm);base64,[A-Za-z0-9+/=]+$/.test(s.audio) ? `<audio controls src="${s.audio}" aria-label="فایل صوتی نمونه"></audio>` : ''}<div class="${s.task === 'ocr' ? 'sample-document' : 'sample-text'}" dir="auto">${esc(s.input)}</div>${s.image && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s.image) ? `<img class="sample-upload" src="${s.image}" alt="تصویر ورودی مشترک">` : s.task === 'ocr' ? '<small>پیش‌نمایش متنی سند؛ تصویر پردازش‌شده محسوب نمی‌شود.</small>' : ''}<div class="sample-meta"><span>نسخه: ${esc(s.version || 'قالب معرفی')}</span><span>تاریخ ثبت: ${recordDate(s.created_at) || '—'}</span><span>${real ? 'خروجی ثبت‌شده' : 'نمونه قالب خروجی'}</span></div></section>
  <div class="sample-output-grid">${s.outputs
    .map((o, i) => {
      const model = products.find((p) => p.id === o.model);
      return `<article class="workspace-panel sample-output"><div class="section-heading"><h2>${esc(model?.title || o.model)}${o.variant ? ' · ' + esc(o.variant) : ''}</h2>${model ? `<a class="text-link" href="${href(model, {})}">قیمت‌ها</a>` : ''}</div><pre dir="auto" data-sample-text="${i}">${esc(o.text)}</pre>${real && s.reference ? `<p class="small">اختلاف واژه با متن مرجع: ${fa(textDistance(s.reference, o.text).edits)} ویرایش روی ${fa(textDistance(s.reference, o.text).words)} واژه؛ فقط سنجش متنی همین نمونه</p>` : ''}</article>`;
    })
    .join(
      ''
    )}</div><div class="filter-actions"><button class="button secondary" data-export-sample="${esc(s.id)}">دریافت ورودی و خروجی‌ها</button>${real ? `<button class="text-link" data-delete-sample="${esc(s.id)}">حذف نمونه</button>` : ''}</div>`;
  $('main').dataset.sampleId = s.id;
  document.title = 'نمونه‌های فارسی | torobai';
}
function newSample() {
  showDialog(
    'ثبت نمونه مقایسه',
    `<form id="sampleForm" class="request-form"><p>یک ورودی را در سرویس‌های انتخابی اجرا کنید و خروجی‌ها و شرایط همان اجرا را وارد کنید. torobai در این فرم مدل را اجرا نمی‌کند.</p><label>عنوان<input name="title" maxlength="100" required></label><label>کاربرد<select name="task">${['transcription', 'translation', 'ocr', 'chat', 'extraction'].map((k) => `<option value="${k}">${tasks[k]}</option>`).join('')}</select></label><label>ورودی مشترک / متن مرجع صوت<textarea name="input" maxlength="6000" required rows="3"></textarea></label><label>فایل صوتی اختیاری، حداکثر ۱ مگابایت<input type="file" name="audio" accept="audio/wav,audio/mpeg,audio/ogg,audio/webm"></label><label>تصویر سند اختیاری، حداکثر ۱ مگابایت<input type="file" name="image" accept="image/png,image/jpeg,image/webp"></label><label>متن مرجع برای سنجش اختلاف واژه (اختیاری)<textarea name="reference" maxlength="6000" rows="2"></textarea></label><div class="listing-grid">${[
      0, 1
    ]
      .map(
        (i) =>
          `<label>مدل ${fa(i + 1)}<select name="model${i}">${products
            .filter((p) => p.kind === 'api')
            .map((p) => `<option value="${p.id}">${esc(p.title)}</option>`)
            .join(
              ''
            )}</select></label><label>خروجی ${fa(i + 1)}<textarea name="output${i}" maxlength="6000" rows="3" required></textarea></label>`
      )
      .join(
        ''
      )}</div><label>نسخه مدل‌ها و سرویس‌ها<input name="version" maxlength="200" required></label><label>منبع و شرایط اجرا؛ تنظیمات، نوع داده و زمان آزمون<textarea name="conditions" maxlength="1500" rows="3" required></textarea></label><p id="sampleError" class="form-error" hidden></p><button class="button primary" type="submit">ذخیره و مقایسه</button></form>`
  );
  syncSampleModels();
}
function syncSampleModels() {
  const f = $('sampleForm');
  if (!f) return;
  const rows = products.filter((p) => p.task === marketInput(f, 'task'));
  [0, 1].forEach((i) => {
    const el = f.querySelector(`[name=model${i}]`);
    el.innerHTML = rows
      .map(
        (p, j) =>
          `<option value="${p.id}" ${j === Math.min(i, rows.length - 1) ? 'selected' : ''}>${esc(p.title)}</option>`
      )
      .join('');
  });
}

function watchPolicy(id) {
  return (
    marketState?.policies.find((p) => p.id === id) || {
      id,
      price: true,
      restock: true,
      version: true,
      target: null,
      channel: 'site'
    }
  );
}
function updateNoticeCount() {
  if ($('noticeCount'))
    $('noticeCount').textContent = fa(
      (marketState?.notifications || []).filter((n) => !n.read).length
    );
}
function observeWatchPrices(force = false) {
  if (!marketState) return;
  const watches = watchRecords();
  if (!watches.length) return;
  const next = cloneMarket(marketState),
    notifications = [];
  let changed = false;
  for (const r of watches) {
    const p = products.find((p) => p.id === r.product_id),
      snapshot = watchSnapshot(p, r.url),
      policy = watchPolicy(r.id);
    let history = next.history.filter(
      (h) => h.watch_id === r.id && Number.isFinite(Date.parse(h.at))
    );
    if (!history.length) {
      const first = {
        id: r.id + '-baseline',
        watch_id: r.id,
        at: r.created_at,
        amount: r.amount,
        version: r.version,
        seller: r.seller,
        available: true
      };
      next.history.push(first);
      history = [first];
      changed = true;
    }
    const previous = history.at(-1),
      point = {
        id: r.id + '-' + Date.now(),
        watch_id: r.id,
        at: new Date().toISOString(),
        amount: snapshot?.amount ?? null,
        version: String(p?.version || p?.model_id || p?.title || r.version),
        seller: snapshot?.seller || '',
        available: Boolean(snapshot)
      };
    const different = ['amount', 'version', 'seller', 'available'].some(
      (k) => previous[k] !== point[k]
    );
    if (different) {
      next.history.push(point);
      changed = true;
    }
    const messages = [];
    if (different && policy.version && previous.version !== point.version)
      messages.push(['version', 'نسخه مدل تغییر کرد']);
    if (different && policy.restock && !previous.available && point.available)
      messages.push(['restock', 'پیشنهاد قابل محاسبه دوباره موجود شد']);
    if (policy.price && point.available && point.version === previous.version) {
      if (
        policy.target != null &&
        Number.isFinite(policy.target) &&
        point.amount <= policy.target &&
        (force || previous.amount > policy.target || !previous.available)
      )
        messages.push(['target', 'قیمت به سقف انتخابی شما رسید']);
      else if (
        different &&
        policy.target == null &&
        previous.available &&
        point.amount !== previous.amount
      )
        messages.push([
          'price',
          point.amount < previous.amount ? 'قیمت کاهش یافت' : 'قیمت افزایش یافت'
        ]);
    }
    for (const [type, title] of messages) {
      const id = r.id + '-' + type + '-' + (force ? policy.updated_at : point.at);
      if (next.notifications.some((n) => n.id === id)) continue;
      const n = {
        id,
        watch_id: r.id,
        title,
        product: r.title,
        url: r.url,
        amount: point.amount,
        at: point.at,
        read: false,
        channel: policy.channel
      };
      next.notifications.unshift(n);
      notifications.push(n);
      changed = true;
    }
  }
  next.history = next.history.slice(-2000);
  next.notifications = next.notifications.slice(0, 200);
  if (changed && writeMarket(next)) {
    updateNoticeCount();
    for (const n of notifications)
      if (n.channel === 'browser' && window.Notification?.permission === 'granted') {
        try {
          new window.Notification(n.title, { body: n.product, tag: n.id });
        } catch {}
      }
  }
}
function configureWatch(id) {
  const r = watchRecords().find((r) => r.id === id);
  if (!r) return;
  const p = watchPolicy(id);
  showDialog(
    'تنظیم اعلان ' + esc(r.title),
    `<form id="watchPolicyForm" data-id="${esc(id)}" class="request-form"><label class="request-check"><input name="price" type="checkbox" ${p.price ? 'checked' : ''}>تغییر قیمت</label><label>قیمت هدف (تومان؛ اختیاری)<input name="target" inputmode="decimal" value="${p.target ?? ''}" placeholder="مثلا ۲۰۰۰۰۰"></label><label class="request-check"><input name="restock" type="checkbox" ${p.restock ? 'checked' : ''}>موجود شدن دوباره</label><label class="request-check"><input name="version" type="checkbox" ${p.version ? 'checked' : ''}>تغییر نسخه مدل</label><label>محل نمایش<select name="channel"><option value="site" ${p.channel !== 'browser' ? 'selected' : ''}>بخش اعلان‌های سایت</option><option value="browser" ${p.channel === 'browser' ? 'selected' : ''}>اعلان مرورگر و بخش اعلان‌ها</option></select></label><p class="small">بررسی هنگام باز کردن سایت یا اعمال تعرفه جدید انجام می‌شود. اعلان مرورگر به اجازه شما نیاز دارد و هنگام بسته بودن این فایل اجرا نمی‌شود.</p><p id="watchPolicyError" class="form-error" role="alert" hidden></p><button class="button primary" type="submit">ذخیره تنظیمات</button></form>`
  );
}
function showPriceHistory(id) {
  const r = watchRecords().find((r) => r.id === id);
  if (!r) return;
  observeWatchPrices();
  const rows = marketState.history
    .filter((h) => h.watch_id === id)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const comparable = rows.filter((h) => h.version === r.version && Number.isFinite(h.amount));
  const min = Math.min(...comparable.map((h) => h.amount)),
    max = Math.max(...comparable.map((h) => h.amount));
  const points = comparable
    .map(
      (h, i) =>
        `${30 + (comparable.length === 1 ? 0 : (i / (comparable.length - 1)) * 540)},${150 - (max === min ? 0 : ((h.amount - min) / (max - min)) * 120)}`
    )
    .join(' ');
  showDialog(
    'تاریخچه ثبت‌شده ' + esc(r.title),
    `<p>${esc(r.usage_text)}</p><p class="small">از زمان شروع پیگیری شما؛ هر نقطه یک قیمت ثبت‌شده در این مرورگر است. نمودار فقط نسخه مبنای پیگیری را نشان می‌دهد.</p>${comparable.length > 1 ? `<svg class="price-history-chart" viewBox="0 0 600 180" role="img" aria-label="روند قیمت‌های ثبت‌شده؛ جدول داده‌ها در ادامه"><path d="M30 15V155H575" fill="none" stroke="#cdd5dc"/><polyline points="${points}" fill="none" stroke="#dc4b3c" stroke-width="3"/>${comparable.map((h, i) => `<circle cx="${30 + (i / (comparable.length - 1)) * 540}" cy="${150 - (max === min ? 0 : ((h.amount - min) / (max - min)) * 120)}" r="4" fill="#dc4b3c"/>`).join('')}</svg>` : '<p class="workspace-note">با ثبت قیمت بعدی، نمودار روند هم نمایش داده می‌شود.</p>'}<div class="comparison-scroll"><table class="offer-comparison"><thead><tr><th>زمان ثبت</th><th>قیمت</th><th>نسخه</th><th>عرضه‌کننده</th></tr></thead><tbody>${rows.map((h) => `<tr><td>${esc(new Date(h.at).toLocaleString('fa-IR'))}</td><td>${h.amount == null ? 'ناموجود / غیرقابل محاسبه' : money(h.amount)}</td><td>${esc(h.version)}</td><td>${esc(h.seller)}</td></tr>`).join('')}</tbody></table></div><button class="button secondary" data-export-history="${esc(id)}">دریافت تاریخچه</button>`
  );
}
function renderNotifications() {
  observeWatchPrices();
  updateNoticeCount();
  const rows = marketState.notifications.filter(
    (n) =>
      typeof n.title === 'string' &&
      typeof n.product === 'string' &&
      typeof n.url === 'string' &&
      HB.routeState(n.url).path.includes('/')
  );
  $('main').innerHTML =
    `<section class="catalog-heading"><div><p class="breadcrumb">torobai / اعلان‌ها</p><h1>اعلان‌های شما</h1><p>تغییر قیمت، موجودی و نسخه برای مدل‌هایی که پیگیری می‌کنید.</p></div><button class="button secondary" data-read-all-notices>همه را خواندم</button></section><div class="notice-list">${rows.map((n) => `<article class="workspace-panel notice-row ${n.read ? '' : 'unread'}"><div><span>${esc(n.title)}</span><h2 dir="auto">${esc(n.product)}</h2><p>${Number.isFinite(n.amount) ? money(n.amount) : 'شرایط محصول را بررسی کنید.'}</p><small>${recordDate(n.at)}</small></div><div><a class="button secondary" href="${esc(n.url)}">مشاهده پیشنهادها</a><button class="text-link" data-read-notice="${esc(n.id)}">${n.read ? 'خوانده شده' : 'خواندم'}</button></div></article>`).join('') || '<div class="empty-state"><h2>اعلان تازه‌ای ندارید</h2><p>در پیگیری قیمت، سقف قیمت و نوع اعلان را انتخاب کنید.</p><a class="button secondary" href="#watchlist">پیگیری‌های من</a></div>'}</div>`;
  document.title = 'اعلان‌ها | torobai';
}

function addWorkspaceModel(d) {
  if (!/^community-[a-z0-9-]+$/.test(d.product_id) || products.some((p) => p.id === d.product_id))
    return;
  const p = {
    id: d.product_id,
    kind: 'api',
    title: d.title,
    maker: d.publisher,
    task: d.task,
    unit: HB.taskUnits[d.task],
    description: d.description,
    tags: [tasks[d.task], 'فارسی'],
    version: d.version,
    publisher_type: d.publisher_type,
    persian_specialist: true,
    open_weights: false,
    license: d.license === 'research' ? 'مجوز پژوهشی' : 'مجوز اختصاصی',
    model_id: d.product_id,
    offers: [],
    weight_offers: [],
    capability: {
      base_model: d.base_model,
      training_method: 'طبق معرفی سازنده',
      language_detail: d.language_detail,
      training_data: d.training_data,
      privacy: d.privacy,
      hardware: d.hardware,
      limitations: d.limitations,
      evaluation: 'طبق اطلاعات ثبت‌شده سازنده؛ ارزیابی مستقل ثبت نشده است.'
    }
  };
  products.push(p);
  catalog.estimates[p.id] = {};
  for (const key of Object.keys(presetNames))
    catalog.estimates[p.id][key] = {
      product_id: p.id,
      assumptions: { ...catalog.presets[p.unit][key], days: 30, request_mode: 'instant' },
      offers: [],
      currency: 'تومان',
      includes_tax: false
    };
  for (const mode of ['api', 'weights'].filter((k) => d[k])) {
    const proposal = {
      id: d.id + '-' + mode,
      product_id: p.id,
      access: mode,
      seller: d.publisher,
      rate: parseNumber(mode === 'api' ? d.api_rate : d.weights_price, 1e12),
      output: parseNumber(d.output_rate || '0', 1e12),
      credit: 0,
      tax: 0,
      terms: mode === 'api' ? d.privacy : d.support,
      format: d.format,
      hardware: d.hardware,
      license: d.license,
      modification: d.modification,
      redistribution: d.redistribution,
      available: true,
      source_url: '',
      updated_at: d.updated_at || new Date().toISOString(),
      batch: d.batch,
      batch_rate: parseNumber(d.batch_rate || '0', 1e12),
      batch_output: parseNumber(d.batch_output_rate || '0', 1e12),
      batch_hours: parseNumber(d.batch_hours || '24', 168),
      batch_max: parseNumber(d.batch_max_requests || '1000', 1e6)
    };
    const o = offerFromProposal(proposal, p);
    o.seller_id = 'local-maker-' + d.id;
    if (mode === 'weights') p.weight_offers.push(o);
    else {
      p.offers.push(o);
      catalog.marketplace.editable_plans[o.id] = {
        instant: tariffPlan(p, o),
        batch: tariffPlan(p, o, 'batch')
      };
      catalog.pricing_plans[o.id] = { instant: tariffPlan(p, o), batch: tariffPlan(p, o, 'batch') };
      for (const entry of Object.values(catalog.estimates[p.id])) entry.offers.push(cloneMarket(o));
    }
  }
}
function modelQueue() {
  const drafts = localRecords('torobai.listings');
  return `<section class="workspace-panel"><h2>درخواست مدل جدید</h2><p class="small">نسخه، حقوق داده و شرایط عرضه پیش از فعال شدن بررسی می‌شوند.</p>${
    drafts
      .map((d) => {
        const queued = marketState.models.find((x) => x.id === d.id);
        return `<div class="review-row"><div><strong>${esc(d.title)}</strong><p>${esc(d.publisher)} · نسخه ${esc(d.version)}</p><small>${proposalStatuses[queued?.status] || 'پیش‌نویس مدل'}</small></div><div><button class="button secondary" data-inspect-model="${esc(d.id)}">مشاهده و بررسی</button>${queued?.status === 'submitted' ? `<button class="button primary" data-approve-model="${esc(d.id)}">تایید و افزودن مدل</button>` : queued?.status === 'approved' ? '' : `<button class="button secondary" data-submit-model="${esc(d.id)}">ثبت درخواست بررسی</button>`}</div></div>`;
      })
      .join('') || '<p>درخواست جدیدی وجود ندارد.</p>'
  }<a href="#publish" class="text-link">معرفی مدل جدید</a></section>`;
}
function commitModel(id, approve = false) {
  const d = approve
    ? marketState.models.find((x) => x.id === id)
    : localRecords('torobai.listings').find((x) => x.id === id);
  if (!d) return;
  const error = HB.validateListing(d, 1) || HB.validateListing(d, 2);
  if (error) {
    toast(error);
    return;
  }
  const next = cloneMarket(marketState),
    value = {
      ...d,
      status: approve ? 'approved' : 'submitted',
      product_id: d.product_id || 'community-' + d.id.replace(/[^a-z0-9-]/g, ''),
      updated_at: new Date().toISOString()
    };
  next.models = [value, ...next.models.filter((x) => x.id !== id)].slice(0, 100);
  marketAudit(next, approve ? 'تایید مدل جدید' : 'ثبت درخواست مدل', id);
  if (
    writeMarket(
      next,
      approve ? 'مدل به کاتالوگ این فضای کاری اضافه شد.' : 'درخواست در صف بررسی قرار گرفت.'
    )
  ) {
    applyMarket();
    renderManagement();
  }
}

document.addEventListener('input', (e) => {
  if (e.target.id === 'searchInput') renderSearchSuggestions();
  if (e.target.closest('#proposalForm')) saveRecords('torobai.offer.work', [readProposal()]);
});
document.addEventListener('focusin', (e) => {
  if (e.target.id === 'searchInput' && e.target.value) renderSearchSuggestions();
});
document.addEventListener('keydown', (e) => {
  if (e.target.id !== 'searchInput') return;
  const box = $('unifiedSuggestions'),
    rows = [...box.querySelectorAll('a')];
  if (e.key === 'Escape') {
    closeSearchSuggestions();
    return;
  }
  if (box.hidden || !rows.length) return;
  const current = rows.findIndex((r) => r.id === e.target.getAttribute('aria-activedescendant'));
  if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
    e.preventDefault();
    const next =
      (current + (e.key === 'ArrowDown' ? 1 : rows.length - 1) + rows.length) % rows.length;
    rows.forEach((r, i) => r.setAttribute('aria-selected', String(i === next)));
    e.target.setAttribute('aria-activedescendant', rows[next].id);
  }
  if (e.key === 'Enter' && current >= 0) {
    e.preventDefault();
    const url = rows[current].getAttribute('href');
    closeSearchSuggestions();
    navigate(url);
  }
});
document.addEventListener('change', async (e) => {
  if (e.target.dataset.compareOffer) {
    const id = e.target.dataset.compareOffer;
    if (e.target.checked && sellerCompare.length >= 3) {
      e.target.checked = false;
      toast('حداکثر سه عرضه‌کننده را انتخاب کنید.');
      return;
    }
    sellerCompare = e.target.checked
      ? [...new Set([...sellerCompare, id])]
      : sellerCompare.filter((x) => x !== id);
    renderSellerCompareBar();
  }
  if (e.target.id === 'onlyOfferDifferences') showSellerComparison(e.target.checked);
  if (e.target.closest('#proposalForm')) {
    if (e.target.name === 'seller_id') {
      $('proposalForm').querySelector('[name=seller]').value =
        allSellers().find((s) => s.id === e.target.value)?.name || '';
    }
    syncProposalFields();
    saveRecords('torobai.offer.work', [readProposal()]);
  }
  if (e.target.closest('#sampleForm') && e.target.name === 'task') syncSampleModels();
  if (e.target.id === 'sampleSelect') renderSamples(e.target.value);
  if (e.target.id === 'sampleDifferences') {
    const s = sampleRecords().find((s) => s.id === $('main').dataset.sampleId);
    if (!s) return;
    const common = new Set(
      s.outputs[0].text
        .split(/\s+/)
        .filter((w) => s.outputs.every((o) => o.text.split(/\s+/).includes(w)))
    );
    document.querySelectorAll('[data-sample-text]').forEach((node) => {
      const text = s.outputs[Number(node.dataset.sampleText)].text;
      node.innerHTML = e.target.checked
        ? text
            .split(/(\s+)/)
            .map((w) => (!w.trim() || common.has(w) ? esc(w) : `<mark>${esc(w)}</mark>`))
            .join('')
        : esc(text);
    });
  }
  if (e.target.id === 'tariffFile') {
    const importInput = e.target,
      file = importInput.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1000000) throw Error('حجم فایل بیشتر از یک مگابایت است.');
      importPreview = parseImport(
        await file.text(),
        file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv'
      );
      if (importInput !== $('tariffFile')) return;
      $('importError').hidden = true;
      $('importPreview').innerHTML =
        `<h3>${fa(importPreview.length)} ردیف آماده اعمال</h3><div class="comparison-scroll"><table class="offer-comparison"><thead><tr><th>پیشنهاد</th><th>وضعیت</th><th>تاریخ</th><th>تعرفه قبل ← بعد (تومان)</th></tr></thead><tbody>${importPreview.map((r) => `<tr><td><code>${esc(r.id)}</code></td><td>${esc(r.availability)}</td><td>${recordDate(r.observed_at)}</td><td>${tariffChanges(r)}</td></tr>`).join('')}</tbody></table></div><button class="button primary" data-apply-import>تایید و اعمال ${fa(importPreview.length)} تغییر</button>`;
    } catch (error) {
      importPreview = null;
      if ($('importPreview')) $('importPreview').innerHTML = '';
      marketError('importError', error.message);
    }
  }
});
document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (f.id === 'offerCapabilityForm') {
    e.preventDefault();
    const view = { ...state };
    for (const k of Object.keys(capabilityLabels)) view[k] = f.querySelector(`[name=${k}]`).checked;
    navigate(href(selected, view));
  }
  if (f.id === 'proposalForm') {
    e.preventDefault();
    saveProposal('draft');
  }
  if (f.id === 'gpuMatchForm') {
    e.preventDefault();
    runGPUMatch();
  }
  if (f.id === 'proposalReview') {
    e.preventDefault();
    const next = cloneMarket(marketState),
      d = next.proposals.find((d) => d.id === f.dataset.id);
    if (!d) return;
    const note = marketInput(f, 'note');
    if (f.dataset.status === 'rejected' && !note) {
      marketError('reviewError', 'دلیل اصلاح را بنویسید.');
      return;
    }
    const error = proposalError(d, catalog);
    if (error) {
      marketError('reviewError', error);
      return;
    }
    d.status = f.dataset.status;
    d.review_note = note;
    if (d.status === 'approved') delete d.published;
    marketAudit(next, d.status === 'approved' ? 'تایید پیشنهاد' : 'درخواست اصلاح', d.id);
    if (writeMarket(next, 'نتیجه بررسی ذخیره شد.')) {
      applyMarket();
      observeWatchPrices();
      closeDialog();
      renderManagement();
    }
  }
  if (f.classList.contains('report-review')) {
    e.preventDefault();
    const status = marketInput(f, 'status'),
      note = marketInput(f, 'note');
    if (!note || !['resolved', 'reviewing', 'needs_info'].includes(status)) {
      toast('نتیجه و توضیح بررسی را کامل کنید.');
      return;
    }
    const next = cloneMarket(marketState),
      r = { id: f.dataset.reportId, status, note, at: new Date().toISOString() };
    next.decisions = [r, ...next.decisions.filter((x) => x.id !== r.id)];
    marketAudit(next, 'رسیدگی به گزارش', r.id);
    if (writeMarket(next, 'نتیجه رسیدگی ثبت شد.')) renderManagement();
  }
  if (f.id === 'watchPolicyForm') {
    e.preventDefault();
    const raw = marketInput(f, 'target'),
      target = raw === '' ? null : parseNumber(raw, 1e15, false);
    if (raw !== '' && target == null) {
      marketError('watchPolicyError', 'قیمت هدف معتبر نیست.');
      return;
    }
    const channel = marketInput(f, 'channel');
    if (channel === 'browser') {
      if (!window.Notification || !window.isSecureContext) {
        marketError(
          'watchPolicyError',
          'اعلان مرورگر اینجا پشتیبانی نمی‌شود؛ بخش اعلان‌های سایت را انتخاب کنید.'
        );
        return;
      }
      let permission = window.Notification.permission;
      try {
        if (permission === 'default') permission = await window.Notification.requestPermission();
      } catch {
        permission = 'denied';
      }
      if (permission !== 'granted') {
        marketError(
          'watchPolicyError',
          'اجازه اعلان داده نشده؛ بخش اعلان‌های سایت همچنان در دسترس است.'
        );
        return;
      }
    }
    const next = cloneMarket(marketState),
      r = {
        id: f.dataset.id,
        target,
        channel: channel === 'browser' ? 'browser' : 'site',
        price: f.querySelector('[name=price]').checked,
        restock: f.querySelector('[name=restock]').checked,
        version: f.querySelector('[name=version]').checked,
        updated_at: new Date().toISOString()
      };
    next.policies = [r, ...next.policies.filter((x) => x.id !== r.id)];
    if (writeMarket(next, 'تنظیم اعلان ذخیره شد.')) {
      closeDialog();
      observeWatchPrices(true);
    }
  }
  if (f.id === 'sampleForm') {
    e.preventDefault();
    const r = {
      id: 'sample-' + Date.now(),
      kind: 'registered',
      title: marketInput(f, 'title'),
      task: marketInput(f, 'task'),
      input: marketInput(f, 'input'),
      reference: marketInput(f, 'reference'),
      version: marketInput(f, 'version'),
      conditions: marketInput(f, 'conditions'),
      created_at: new Date().toISOString(),
      outputs: [0, 1].map((i) => ({
        model: marketInput(f, 'model' + i),
        text: marketInput(f, 'output' + i)
      }))
    };
    if (
      !r.title ||
      !r.input ||
      !r.version ||
      !r.conditions ||
      r.outputs.some((o) => !o.text || !products.some((p) => p.id === o.model && p.task === r.task))
    ) {
      marketError('sampleError', 'ورودی، دو خروجی، نسخه و شرایط آزمون را کامل کنید.');
      return;
    }
    const file = f.querySelector('[name=audio]').files?.[0];
    if (file) {
      if (file.size > 1000000 || !/^audio\/(wav|mpeg|mp3|ogg|webm)$/.test(file.type)) {
        marketError(
          'sampleError',
          'فایل صوتی باید WAV، MP3، OGG یا WebM و حداکثر یک مگابایت باشد.'
        );
        return;
      }
      try {
        r.audio = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch {
        marketError('sampleError', 'خواندن فایل صوتی انجام نشد.');
        return;
      }
    }
    const picture = f.querySelector('[name=image]').files?.[0];
    if (picture) {
      if (picture.size > 1000000 || !/^image\/(png|jpeg|webp)$/.test(picture.type)) {
        marketError('sampleError', 'تصویر باید PNG، JPEG یا WebP و حداکثر یک مگابایت باشد.');
        return;
      }
      try {
        r.image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(picture);
        });
      } catch {
        marketError('sampleError', 'خواندن تصویر انجام نشد.');
        return;
      }
    }
    if (!$('sampleForm') || $('sampleForm') !== f) return;
    const next = cloneMarket(marketState);
    next.samples = [r, ...next.samples].slice(0, 30);
    if (writeMarket(next, 'نمونه ذخیره شد.')) {
      closeDialog();
      if (state.path === 'samples') renderSamples(r.id);
      else {
        await navigate('#samples');
        renderSamples(r.id);
      }
    }
  }
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#searchForm') || e.target.closest('#unifiedSuggestions a'))
    closeSearchSuggestions();
  if (e.target.closest('[data-clear-capabilities]') && selected)
    navigate(
      href(selected, {
        ...state,
        ...Object.fromEntries(Object.keys(capabilityLabels).map((k) => [k, false]))
      })
    );
  if (e.target.closest('[data-show-seller-comparison]')) showSellerComparison();
  if (e.target.closest('[data-clear-seller-comparison]')) {
    sellerCompare = [];
    document.querySelectorAll('[data-compare-offer]').forEach((el) => (el.checked = false));
    renderSellerCompareBar();
  }
  if (e.target.closest('[data-new-proposal]')) {
    saveRecords('torobai.offer.work', []);
    renderStudio({
      product_id: state.model || products.find((p) => p.kind === 'api').id,
      access: 'api',
      available: true,
      credit: 0,
      tax: 0
    });
  }
  if (e.target.closest('[data-proposal-submit]')) saveProposal('submitted');
  if (e.target.closest('[data-proposal-export]'))
    downloadRecord('torobai-offer.json', readProposal());
  const edit = e.target.closest('[data-edit-proposal]');
  if (edit) {
    const r = marketState.proposals.find((r) => r.id === edit.dataset.editProposal);
    if (r) renderStudio(r);
  }
  const del = e.target.closest('[data-delete-proposal]');
  if (del) {
    const next = cloneMarket(marketState);
    next.proposals = next.proposals.filter((r) => r.id !== del.dataset.deleteProposal);
    if (writeMarket(next, 'پیشنهاد حذف شد.')) {
      saveRecords('torobai.offer.work', []);
      applyMarket();
      observeWatchPrices();
      renderStudio();
    }
  }
  const review = e.target.closest('[data-review-proposal]');
  if (review) reviewProposal(review.dataset.reviewProposal, review.dataset.review);
  if (e.target.closest('[data-export-workspace]'))
    downloadRecord('torobai-workspace.json', {
      ...marketState,
      watchlist: watchRecords(),
      reports: reportRecords(),
      model_drafts: localRecords('torobai.listings')
    });
  if (e.target.closest('[data-import-template]'))
    downloadRecord(
      'torobai-tariffs.csv',
      ['id', 'observed_at', 'availability', ...tariffKeys].join(',') +
        '\n' +
        products
          .flatMap((p) =>
            [...p.offers, ...(p.weight_offers || [])].map((o) =>
              [
                o.id,
                o.observed_at || new Date().toISOString().slice(0, 10),
                o.availability || 'unknown',
                ...tariffKeys.map((k) => o[k] ?? '')
              ].join(',')
            )
          )
          .join('\n'),
      true
    );
  if (e.target.closest('[data-apply-import]') && importPreview) {
    const error = importPreview.map((r) => updateError(r)).find(Boolean);
    if (error) {
      marketError('importError', error);
      return;
    }
    const next = cloneMarket(marketState);
    for (const row of importPreview)
      next.updates = [
        { ...next.updates.find((r) => r.id === row.id), ...row },
        ...next.updates.filter((r) => r.id !== row.id)
      ].slice(0, 300);
    marketAudit(next, 'ورود گروهی تعرفه', String(importPreview.length) + ' پیشنهاد');
    if (writeMarket(next, 'تعرفه‌ها و وضعیت عرضه به‌روزرسانی شدند.')) {
      applyMarket();
      observeWatchPrices();
      importPreview = null;
      renderManagement();
    }
  }
  const merge = e.target.closest('[data-merge-from]');
  if (merge) {
    const a = products.find((p) => p.id === merge.dataset.mergeFrom),
      b = products.find((p) => p.id === merge.dataset.mergeTarget);
    if (
      !a ||
      !b ||
      !a.model_id ||
      a.model_id !== b.model_id ||
      String(a.version || '') !== String(b.version || '') ||
      a.unit !== b.unit
    ) {
      toast('شناسه، نسخه و واحد مدل‌ها برای ادغام یکسان نیست.');
      return;
    }
    const next = cloneMarket(marketState);
    next.merges = [
      { id: a.id, target: b.id },
      ...next.merges
        .filter((m) => m.id !== a.id)
        .map((m) => (m.target === a.id ? { ...m, target: b.id } : m))
    ];
    marketAudit(next, 'ادغام مدل تکراری', a.id + ' → ' + b.id);
    if (writeMarket(next, 'پیشنهادها در یک صفحه ادغام شدند.')) {
      applyMarket();
      renderManagement();
    }
  }
  if (e.target.closest('[data-reset-merges]')) {
    const next = cloneMarket(marketState);
    next.merges = [];
    marketAudit(next, 'بازگرداندن ادغام‌ها', 'کاتالوگ');
    if (writeMarket(next, 'مدل‌ها به حالت قبل از ادغام برگشتند.')) {
      applyMarket();
      renderManagement();
    }
  }
  const submitModel = e.target.closest('[data-submit-model]');
  if (submitModel) commitModel(submitModel.dataset.submitModel);
  const approveModel = e.target.closest('[data-approve-model]');
  if (approveModel) commitModel(approveModel.dataset.approveModel, true);
  const inspect = e.target.closest('[data-inspect-model]');
  if (inspect) {
    const d = localRecords('torobai.listings').find((d) => d.id === inspect.dataset.inspectModel);
    if (d) showDialog('بررسی مدل جدید', listingReview(d));
  }
  if (e.target.closest('[data-new-sample]')) newSample();
  const exportSample = e.target.closest('[data-export-sample]');
  if (exportSample)
    downloadRecord(
      'torobai-persian-sample.json',
      sampleRecords().find((s) => s.id === exportSample.dataset.exportSample)
    );
  const deleteSample = e.target.closest('[data-delete-sample]');
  if (deleteSample) {
    const next = cloneMarket(marketState);
    next.samples = next.samples.filter((s) => s.id !== deleteSample.dataset.deleteSample);
    if (writeMarket(next)) renderSamples();
  }
  const policy = e.target.closest('[data-watch-policy]');
  if (policy) configureWatch(policy.dataset.watchPolicy);
  const history = e.target.closest('[data-watch-history]');
  if (history) showPriceHistory(history.dataset.watchHistory);
  const exportHistory = e.target.closest('[data-export-history]');
  if (exportHistory)
    downloadRecord(
      'torobai-price-history.json',
      marketState.history.filter((h) => h.watch_id === exportHistory.dataset.exportHistory)
    );
  const notice = e.target.closest('[data-read-notice]'),
    all = e.target.closest('[data-read-all-notices]');
  if (notice || all) {
    const next = cloneMarket(marketState);
    next.notifications = next.notifications.map((n) =>
      all || n.id === notice.dataset.readNotice ? { ...n, read: true } : n
    );
    if (writeMarket(next)) {
      updateNoticeCount();
      renderNotifications();
    }
  }
});
