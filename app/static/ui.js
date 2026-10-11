/* Small, pure presentation helpers, also used by the Node behavior tests. */
(function (root) {
  const digits = '۰۱۲۳۴۵۶۷۸۹';
  function normalize(value) {
    return String(value)
      .toLowerCase()
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[۰-۹]/g, (c) => digits.indexOf(c))
      .replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c))
      .replace(/\u200c/g, ' ');
  }
  function number(value, places = 0) {
    return Number(value)
      .toLocaleString('en-US', { maximumFractionDigits: places })
      .replace(/\d/g, (c) => digits[c]);
  }
  function parseNumber(value, max, integer = true, min = 0) {
    const text = normalize(value)
      .trim()
      .replace(/\s*[,٬]\s*/g, ',')
      .replace(/\s+/g, ',')
      .replace('٫', '.');
    const valid = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text);
    const n = valid ? Number(text.replace(/,/g, '')) : NaN;
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) return null;
    return n;
  }
  function escape(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[c]
    );
  }
  function safeURL(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' ? escape(u.href) : '#';
    } catch {
      return '#';
    }
  }
  function rate(product, offers = product.offers || []) {
    const keys =
      product.kind === 'gpu'
        ? ['hourly_toman', 'daily_toman', 'monthly_toman']
        : [
            product.unit === 'tokens' || product.unit === 'input_tokens'
              ? 'toman_input_m'
              : 'toman_unit'
          ];
    for (const key of keys) {
      const candidates = offers.filter(
        (o) =>
          o.availability !== 'unavailable' && o.price_status !== 'needs_recheck' && o[key] != null
      );
      if (candidates.length) {
        const offer = candidates.reduce((a, b) => (a[key] <= b[key] ? a : b));
        return { value: offer[key], key, offer };
      }
    }
    return null;
  }
  function hasCapabilityFilters(view) {
    return view.access !== 'weights' && ['json','tools','streaming','no_retention'].some(key=>view[key]);
  }
  function offerMatches(offer, view) {
    return view.access === 'weights' || ['json','tools','streaming','no_retention'].every(key=>
      !view[key] || (key === 'streaming' ? (offer.capabilities?.streaming ?? offer.streaming) : offer.capabilities?.[key]) === true);
  }
  function filterProducts(products, state, saved = [], estimates = null) {
    const words = normalize(state.query || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return products
      .filter((p) => {
        if (state.saved && !saved.includes(p.id)) return false;
        if (!state.saved && p.kind !== state.kind) return false;
        if (state.task && p.task !== state.task) return false;
        if (state.usecase === 'coding' && !p.coding_evidence?.length) return false;
        if (state.persian && !p.persian_specialist) return false;
        if (state.publisher && p.publisher_type !== state.publisher) return false;
        if (state.open && !p.open_weights) return false;
        if (state.maker && p.maker !== state.maker) return false;
        if (state.vram && (p.vram || 0) < state.vram) return false;
        if (state.context && (p.context || 0) < state.context) return false;
        const offers = (p.offers || []).filter(
          (o) =>
            (!state.ssh || o.ssh === true) && (!state.provider || o.seller_id === state.provider) && offerMatches(o,state) && (state.requestMode !== 'batch' || p.kind !== 'api' || o.batch?.supported === true)
        );
        const weights = (p.weight_offers || []).filter(
          (w) => !state.provider || w.seller_id === state.provider
        );
        const publicWeights = !state.provider && p.weights_url;
        if (hasCapabilityFilters(state) && state.access !== 'weights' && !offers.length) return false;
        if (state.requestMode === 'batch' && state.access !== 'weights' && (p.kind !== 'api' || !offers.length)) return false;
        if (state.ssh && !offers.length) return false;
        if (state.provider && !offers.length && !weights.length) return false;
        if (state.access === 'api' && !offers.length) return false;
        if (state.access === 'weights' && !weights.length && !publicWeights) return false;
        if (state.multiple && new Set(offers.map((o) => o.seller_id)).size < 2) return false;
        if (
          state.priced &&
          !(state.access === 'weights'
            ? weights.some((w) => w.price_toman != null) || publicWeights
            : estimates
              ? estimates[p.id]?.standard.offers.some(
                  (o) => offers.some((x) => x.id === o.id) && o.estimate_toman != null
                )
              : rate(p, offers))
        )
          return false;
        const text = normalize(
          [
            p.title,
            p.maker,
            p.description,
            p.model_id,
            p.search_terms || '',
            p.capability?.base_model || '',
            p.capability?.language_detail || '',
            ...p.tags,
            ...offers.map((o) => o.seller)
          ].join(' ')
        );
        return words.every((word) => text.includes(word));
      })
      .map((p) =>
        state.ssh || state.provider || hasCapabilityFilters(state) || (state.requestMode === 'batch' && state.access !== 'weights')
          ? {
              ...p,
              offers: p.offers.filter(
                (o) =>
                  (!state.ssh || o.ssh === true) &&
                  (!state.provider || o.seller_id === state.provider) &&
                  offerMatches(o,state) &&
                  (state.requestMode !== 'batch' || state.access === 'weights' || o.batch?.supported === true)
              ),
              weight_offers: (p.weight_offers || []).filter(
                (w) => !state.provider || w.seller_id === state.provider
              ),
              weights_url: state.provider ? null : p.weights_url
            }
          : p
      );
  }
  function comparePrices(a, b, descending = false) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return descending ? b - a : a - b;
  }
  function readIDs(storage, key, known, limit = 100) {
    try {
      const ids = JSON.parse(storage.getItem(key));
      return Array.isArray(ids)
        ? [...new Set(ids)]
            .filter((id) => typeof id === 'string' && known.includes(id))
            .slice(0, limit)
        : [];
    } catch {
      return [];
    }
  }
  const taskUnits = {
    transcription: 'minute',
    translation: 'characters',
    speech: 'characters',
    ocr: 'page',
    extraction: 'page',
    embedding: 'input_tokens',
    classification: 'request',
    chat: 'tokens',
    decision: 'input_tokens',
    image: 'image'
  };
  function routeState(hash) {
    const [raw = '', query = ''] = hash.replace(/^#/, '').split('?');
    let path;
    try {
      path = decodeURIComponent(raw) || 'api';
    } catch {
      path = 'not-found';
    }
    if (
      ![
        'api',
        'fa',
        'gpu',
        'saved',
        'compare',
        'providers',
        'recent',
        'publish',
        'watchlist',
        'reports',
        'studio',
        'manage',
        'samples',
        'gpu-match',
        'benchmarks',
        'notifications',
        'requests'
      ].includes(path) &&
      !/^(api|gpu|providers)\/[a-z0-9._-]+$/.test(path)
    )
      path = 'not-found';
    const params = new URLSearchParams(query);
    const option = (key, allowed, fallback = '') =>
      allowed.includes(params.get(key)) ? params.get(key) : fallback;
    const sort = option('sort', ['selected', 'price', 'price-desc', 'name'], 'selected');
    const task =
      option('task', [...Object.keys(taskUnits), 'gpu']) ||
      (['api', 'fa', 'saved'].includes(path) && ['price', 'price-desc'].includes(sort)
        ? path === 'fa'
          ? 'transcription'
          : 'chat'
        : '');
    const bounded = (key, max) => parseNumber(params.get(key) || '0', max) ?? 0;
    const from = option('from', ['fa']);
    return {
      path,
      from,
      persian: path === 'fa' || (path.startsWith('api/') && from === 'fa'),
      kind: path.startsWith('gpu') || (path === 'saved' && task === 'gpu') ? 'gpu' : 'api',
      access: option('access', ['api', 'weights']),
      rental: option('rental', ['light', 'standard', 'heavy'], 'standard'),
      service: option('service', ['api', 'weights', 'gpu']),
      json: params.get('json') === '1',
      tools: params.get('tools') === '1',
      streaming: params.get('streaming') === '1',
      no_retention: params.get('no_retention') === '1',
      benchGroup: (params.get('group') || '').slice(0,80),
      benchTask: (params.get('task') || '').slice(0,40),
      benchCommon: params.get('common') === '1',
      benchMetric: (params.get('metric') || '').slice(0,80),
      benchChart: option('chart',['bars','scatter','matrix'],'bars'),
      benchOrder: option('order',['metric','price','balanced'],'metric'),
      benchPriority: parseNumber(params.get('priority') || '70',100,true) ?? 70,
      benchPicks: (params.get('picks') || '').slice(0,400),
      model: (params.get('model') || '').slice(0,80),
      publisher: option('publisher', ['person', 'company']),
      task,
      sort,
      usecase: option('usecase', ['coding']),
      maxCost: params.has('max_cost') ? parseNumber(params.get('max_cost'), 1e12, false) : null,
      query: (params.get('q') || '').slice(0, 80),
      maker: (params.get('maker') || '').slice(0, 80),
      provider: (params.get('provider') || '').slice(0, 80),
      open: params.get('open') === '1',
      multiple: params.get('multiple') === '1',
      priced: params.get('priced') === '1',
      ssh: params.get('ssh') === '1',
      vram: bounded('vram', 192),
      context: bounded('context', 2000000),
      saved: path === 'saved',
      page: parseNumber(params.get('page') || '1', 1000000, true, 1) || 1,
      size: [20, 40, 60].includes(Number(params.get('size'))) ? Number(params.get('size')) : 20,
      requestMode: path.startsWith('gpu') || task === 'gpu' ? 'instant' : option('mode', ['instant', 'batch'], 'instant'),
      usageUnit: option('usage_unit', Object.keys(usageFields)),
      usage: Object.fromEntries((usageFields[params.get('usage_unit')] || []).flatMap((key) => {
        const value = parseNumber(params.get(key) || '', ['monthly_tokens','characters'].includes(key) ? 1e9 : 1e6, key !== 'minutes');
        return value === null ? [] : [[key, value]];
      }))
    };
  }
  const usageFields = {
    tokens: ['requests_day', 'input_tokens', 'output_tokens'],
    input_tokens: ['monthly_tokens'], minute: ['minutes'], characters: ['characters'],
    image: ['images'], page: ['pages'], request: ['monthly_requests']
  };
  // Exact rational arithmetic evaluates Python-generated terms; tariff rules stay in Python.
  function evaluatePlan(plan, values) {
    for (const check of plan.checks || []) {
      if (check.fields.reduce((n, field) => n + values[field], 0) > check.max)
        return { estimate_toman: null, estimate_reason: check.reason, effective_rates: {} };
    }
    const branch = plan.long && values[plan.long.field] > plan.long.above ? plan.long : plan;
    if (!branch.terms) return { estimate_toman: null, estimate_reason: branch.reason, effective_rates: {} };
    function fraction(value) {
      const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
      const [whole, decimals = ''] = mantissa.split('.');
      const scale = decimals.length - Number(exponent);
      return scale >= 0 ? [BigInt(whole + decimals), 10n ** BigInt(scale)]
        : [BigInt(whole + decimals) * 10n ** BigInt(-scale), 1n];
    }
    let numerator = 0n, denominator = 1n;
    for (const term of branch.terms) {
      let [n, d] = fraction(term.rate);
      d *= BigInt(term.denominator);
      for (const field of term.fields) {
        const [a, b] = fraction(values[field]);
        n *= a; d *= b;
      }
      numerator = numerator * d + n * denominator;
      denominator *= d;
    }
    const cents = (numerator * 200n + denominator) / (2n * denominator);
    return { estimate_toman: Number(cents) / 100, estimate_reason: null, effective_rates: branch.rates || {} };
  }
  function paginate(rows, requested = 1, size = 20) {
    const pages = Math.max(1, Math.ceil(rows.length / size));
    const page = requested >= 1 && requested <= pages ? requested : 1;
    const offset = (page - 1) * size;
    const numbers = [];
    const visible = new Set([1, pages, page - 1, page, page + 1]);
    for (let n = 1; n <= pages; n++) {
      if (pages <= 7 || visible.has(n)) {
        if (numbers.length && n - numbers.at(-1) > 1) numbers.push('gap');
        numbers.push(n);
      }
    }
    return { page, pages, start: rows.length ? offset + 1 : 0,
      end: Math.min(offset + size, rows.length), total: rows.length,
      rows: rows.slice(offset, offset + size), numbers };
  }
  function validateListing(d, step = 3) {
    const required = [
      'title',
      'publisher',
      'task',
      'version',
      'base_model',
      'base_license',
      'language_detail',
      'description',
      'training_data',
      'limitations'
    ];
    if (required.some((k) => !String(d[k] || '').trim()))
      return 'مشخصات مدل، داده آموزشی و محدودیت‌ها را کامل کنید.';
    if (!Object.hasOwn(taskUnits, d.task) || d.unit !== taskUnits[d.task])
      return 'کاربرد مدل و واحد تعرفه با هم مطابقت ندارند.';
    if (!d.data_rights) return 'حق استفاده از داده و عرضه مدل را تایید کنید.';
    if (d.source_url && safeURL(d.source_url) === '#')
      return 'لینک مستندات باید با https:// شروع شود.';
    if (step < 2) return '';
    if (!d.api && !d.weights) return 'حداقل یک روش عرضه را انتخاب کنید.';
    if (d.api && (parseNumber(d.api_rate, 1e12) === null || !String(d.privacy || '').trim()))
      return 'تعرفه معتبر و شرایط نگهداری داده در API را وارد کنید.';
    if (d.api && d.unit === 'tokens' && parseNumber(d.output_rate, 1e12) === null)
      return 'تعرفه خروجی هر میلیون توکن را وارد کنید.';
    if (d.api && d.batch && (parseNumber(d.batch_rate, 1e12) === null ||
        (d.unit === 'tokens' && parseNumber(d.batch_output_rate, 1e12) === null) ||
        parseNumber(d.batch_hours, 168, true, 1) === null ||
        parseNumber(d.batch_max_requests, 1000000, true, 1) === null))
      return 'تعرفه Batch، زمان تحویل و سقف درخواست هر دسته را کامل کنید.';
    if (
      d.weights &&
      (parseNumber(d.weights_price, 1e12) === null ||
        ['format', 'hardware', 'support'].some((k) => !String(d[k] || '').trim()))
    )
      return 'قیمت وزن‌ها، فایل‌های تحویلی، سخت‌افزار و پشتیبانی را کامل کنید.';
    if (d.weights && !['commercial', 'research'].includes(d.license))
      return 'نوع مجوز وزن‌ها را مشخص کنید.';
    return '';
  }
  const helpers = {
    offerMatches,
    hasCapabilityFilters,
    usageFields,
    evaluatePlan,
    paginate,
    taskUnits,
    routeState,
    validateListing,
    normalize,
    number,
    parseNumber,
    escape,
    safeURL,
    rate,
    filterProducts,
    comparePrices,
    readIDs
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
  else root.HB = helpers;
})(globalThis);
