/* Pure conversation decisions. No network, DOM, model calls or price formulas. */
(function (root) {
  'use strict';
  const taskNames = {
    chat: 'متن و گفتگو',
    embedding: 'جستجو در اسناد',
    transcription: 'گفتار به متن',
    translation: 'ترجمه',
    speech: 'متن به گفتار',
    image: 'ساخت تصویر',
    ocr: 'متن از تصویر',
    extraction: 'استخراج اطلاعات',
    classification: 'دسته‌بندی متن',
    decision: 'تصمیم‌گیری',
    gpu: 'اجاره GPU'
  };
  const apiFields = ['tools', 'json', 'streaming', 'requestMode'];
  const scopedFields = [
    'query',
    'usecase',
    'context',
    'vram',
    'ssh',
    'usage',
    'rental',
    'inference',
    ...apiFields
  ];
  const fields = [
    'task',
    'access',
    'persian',
    'no_retention',
    'open',
    'priority',
    'budget_toman',
    'budget_period',
    ...scopedFields
  ];
  const labels = {
    task: 'کاربرد',
    access: 'دسترسی',
    query: 'مدل',
    persian: 'مدل اختصاصی فارسی',
    tools: 'فراخوانی ابزار',
    json: 'خروجی JSON',
    streaming: 'پاسخ جریانی',
    no_retention: 'بدون نگهداری داده',
    open: 'وزن‌های منتشرشده',
    ssh: 'دسترسی SSH',
    vram: 'حافظه هر GPU',
    context: 'ظرفیت متن',
    usecase: 'آزمون کدنویسی منتشرشده',
    priority: 'اولویت',
    budget_toman: 'سقف هزینه',
    budget_period: 'دوره هزینه',
    usage: 'مصرف',
    requestMode: 'روش پردازش',
    rental: 'مدت اجاره',
    inference: 'اجرای مدل روی GPU'
  };
  function updateNeeds(current, patch) {
    const needs = { ...current };
    const changes = patch.set || {};
    if (changes.task && current.task && changes.task !== current.task) {
      for (const key of scopedFields) delete needs[key];
      if (changes.task === 'gpu' || current.task === 'gpu') delete needs.access;
    }
    if (changes.access && changes.access !== current.access) {
      for (const key of apiFields) delete needs[key];
      delete needs.usage;
    }
    for (const key of patch.unset || []) if (fields.includes(key)) delete needs[key];
    for (const [key, value] of Object.entries(changes)) {
      if (!fields.includes(key) || value == null) continue;
      if (key === 'inference' && value.model && value.model !== needs.inference?.model) {
        needs.inference = { ...needs.inference };
        delete needs.inference.parameters;
      }
      needs[key] =
        key === 'usage' || key === 'inference'
          ? {
              ...(needs[key] || {}),
              ...Object.fromEntries(Object.entries(value).filter(([, v]) => v != null))
            }
          : value;
    }
    if (needs.task === 'gpu') delete needs.access;
    if ((patch.unset || []).includes('budget_toman')) delete needs.budget_period;
    return needs;
  }
  function toView(needs, HB) {
    const gpu = needs.task === 'gpu';
    const view = HB.routeState(gpu ? '#gpu' : needs.persian ? '#fa' : '#api');
    for (const key of [
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
    ]) {
      if (needs[key] != null) view[key] = needs[key];
    }
    view.kind = gpu ? 'gpu' : 'api';
    view.path = gpu ? 'gpu' : needs.persian ? 'fa' : 'api';
    view.sort = needs.priority === 'cost' ? 'price' : 'selected';
    view.maxCost = needs.budget_toman ?? null;
    view.usageUnit = HB.taskUnits[needs.task] || '';
    view.usage = Object.fromEntries(
      (HB.usageFields[view.usageUnit] || []).flatMap((key) =>
        needs.usage?.[key] != null ? [[key, needs.usage[key]]] : []
      )
    );
    return view;
  }
  const choice = (label, set, unset = []) => ({ label, set, unset });
  function welcome() {
    return {
      text: 'سلام! درباره مدل‌ها، API یا اجرای مدل روی GPU چه سوالی داری؟ برای انتخاب گزینه و برآورد هزینه هم کمکت می‌کنم.',
      choices: [
        choice('برای کدنویسی', { task: 'chat', usecase: 'coding' }),
        choice('گفتار فارسی به متن', { task: 'transcription', persian: true }),
        choice('ترجمه فارسی', { task: 'translation', persian: true }),
        choice('جستجو در اسناد', { task: 'embedding' }),
        choice('GPU برای مدل', { task: 'gpu' }),
        { label: 'عرضه مدل خودم', intent: 'publish' },
        { label: 'کاربردهای دیگر', intent: 'tasks' }
      ]
    };
  }
  const helpText = {
    api: 'با API، برنامه شما درخواست را به سرویس ارائه‌دهنده می‌فرستد. هزینه مصرف، حداقل شارژ و شرایط نگهداری داده را جدا بررسی کن.',
    weights:
      'با دریافت وزن‌ها، اجرای مدل بر عهده شماست. امکان دانلود به‌تنهایی مجوز استفاده تجاری نیست؛ شرایط همان فایل را بررسی کن.',
    batch:
      'Batch برای پردازش دسته‌ای با پاسخ دیرتر است. پشتیبانی، تعرفه و زمان تحویل به ارائه‌دهنده بستگی دارد و با پاسخ جریانی فرق دارد.',
    tokens:
      'توکن واحد پردازش متن است و دقیقا برابر کلمه نیست. در مقایسه چت، تعداد درخواست روزانه و توکن ورودی و خروجی هر درخواست جدا حساب می‌شوند.',
    privacy:
      'نگهداری نکردن داده با پردازش داخل ایران یا داخل سازمان یکی نیست. شرایط همان ارائه‌دهنده و محل پردازش را بررسی کن.',
    benchmarks:
      'بنچمارک فقط با توجه به نسخه مدل و شرایط آزمون معنی دارد. در صفحه عملکرد می‌توانی منبع و نتیجه هر آزمون را کنار مدل‌های دیگر ببینی.',
    gpu: 'برای انتخاب GPU، حافظه هر کارت و روش دسترسی مهم است. محاسبه اجرای مدل، برآورد حافظه برای inference است و تضمین آموزش یا اجرا نیست.'
  };
  function resolveModel(name, products, HB) {
    const normalize = (text) => HB.normalize(text || '').replace(/[\s_/-]+/g, '');
    const key = normalize(name);
    return key ? products.filter((p) =>
      [p.id, p.title, p.model_id, p.model_id?.split('/').at(-1)]
        .some((value) => value && normalize(value) === key)) : [];
  }
  function inferencePlan(needs, host, HB) {
    const input = needs.inference;
    const models = resolveModel(input.model, host.snapshot().products, HB)
      .filter((p) => p.kind === 'api');
    const model = models.length === 1 ? models[0] : null;
    const parameters = input.parameters ?? (model ? Number(host.parameterGuess(model)) : 0);
    if (!parameters)
      return {
        text: 'اندازه کل این مدل در اطلاعات ما مشخص نیست. تعداد کل پارامترها را به میلیارد بگو؛ برای مدل MoE، تعداد پارامترهای فعال کافی نیست.',
        links: [{ label: 'محاسبه حافظه اجرای مدل', url: '#gpu-match' }]
      };
    const workload = {
      parameters, context: input.context ?? 4096, concurrent: input.concurrent ?? 1,
      kv: 0.25, overhead: 2, margin: 20
    };
    const plans = (input.bits ? [input.bits] : [4, 8, 16]).map((bits) => {
      const memory = host.memoryParts({ ...workload, bits });
      const view = toView(needs, HB);
      view.vram = Math.max(view.vram || 0, Math.ceil(memory.total));
      return { bits, required: memory.total, view, products: host.rows(view) };
    });
    const assumptions = `${HB.number(parameters)} میلیارد پارامتر؛ ${HB.number(workload.context)} توکن فعال و ${HB.number(workload.concurrent)} درخواست هم‌زمان. بودجه KV برابر ۰٫۲۵ GiB برای هر هزار توکن، حافظه موتور ۲ GiB و حاشیه ۲۰٪ فرض شده است.`;
    const note = 'این برآورد حافظه inference روی یک کارت است؛ سازگاری موتور، فرمت کوانتیزه و سرعت اجرا باید جدا بررسی شوند. حافظه چند کارت با هم جمع نشده است.';
    return {
      text: 'برآورد حافظه برای ' + (model?.title || input.model || 'مدل شما') + ':',
      memory: plans,
      assumptions,
      note,
      ...(model ? { links: [{ label: 'تنظیم دقیق در محاسبه‌گر GPU', url: '#gpu-match?model=' + encodeURIComponent(model.id) }] } : {}),
      choices: input.bits ? [] : plans.map((plan) =>
        choice('بررسی ' + HB.number(plan.bits) + ' بیت', { inference: { bits: plan.bits } })),
      view: input.bits ? plans[0].view : null
    };
  }
  function decide(needs, parsed, host, HB, unresolved = []) {
    const intent = parsed.intent || 'find';
    if (intent === 'answer')
      return { text: parsed.answer || parsed.question || 'چه چیزی را می‌خواهی بررسی کنیم؟' };
    if (intent === 'compare' && parsed.compare_names?.length) {
      const picked = [];
      for (const name of parsed.compare_names) {
        const candidates = resolveModel(name, host.snapshot().products, HB);
        if (candidates.length !== 1)
          return {
            text:
              'نام یا نسخه «' +
              name +
              '» در کاتالوگ مشخص نیست. نام کامل مدل را انتخاب یا جستجو کن.',
            links: [{ label: 'انتخاب مدل‌ها برای مقایسه', url: '#benchmarks' }]
          };
        if (!picked.some((p) => p.id === candidates[0].id)) picked.push(candidates[0]);
      }
      if (new Set(picked.map((p) => p.task)).size !== 1)
        return {
          text: 'این مدل‌ها کاربرد یکسان ندارند. در صفحه عملکرد، هر کاربرد و واحد ارزیابی را جدا مقایسه کن.',
          links: [{ label: 'انتخاب کاربرد و مدل‌ها', url: '#benchmarks' }]
        };
      return {
        text: 'مقایسه این مدل‌ها آماده است: ' + picked.map((p) => p.title).join('، '),
        note: 'نتیجه هر آزمون با منبع و شرایط خودش نمایش داده می‌شود؛ امتیاز ناموجود، صفر محسوب نمی‌شود.',
        links: [
          {
            label: 'دیدن مقایسه عملکرد',
            url:
              '#benchmarks?' +
              new URLSearchParams({
                task: picked[0].task,
                picks: picked.map((p) => p.id).join(',')
              })
          }
        ]
      };
    }
    if (intent === 'publish')
      return {
        text: 'مدل خودت را عرضه می‌کنی؟ برای مدل جدید از ثبت مدل شروع کن؛ اگر مدل از قبل وجود دارد، پیشنهاد API یا مجوز وزن‌ها را به همان مدل اضافه کن.',
        links: [
          { label: 'ثبت مدل جدید', url: '#publish' },
          { label: 'افزودن پیشنهاد به مدل موجود', url: '#studio' }
        ]
      };
    if (intent === 'tasks')
      return {
        text: 'مدل را برای کدام کار می‌خواهی؟',
        choices: Object.entries(taskNames).map(([task, label]) => choice(label, { task }))
      };
    if (intent === 'help')
      return {
        text:
          parsed.answer || helpText[parsed.help_topic] ||
          'می‌توانم برای انتخاب مدل، مقایسه ارائه‌دهنده‌ها یا اجاره GPU کمکت کنم.',
        choices: [{ label: 'ادامه انتخاب', intent: 'find' }]
      };
    if (intent === 'unsupported')
      return {
        text: 'می‌توانم در انتخاب مدل، API، وزن‌ها و GPU راهنمایی‌ات کنم. از کدام شروع کنیم؟',
        choices: welcome().choices
      };
    if (intent === 'compound')
      return {
        text: 'این کار چند بخش دارد. هر بخش مدل و هزینه خودش را دارد؛ از کدام شروع کنیم؟',
        note: 'هزینه یک بخش، هزینه کل سامانه نیست. سازگاری و نیازهای مشترک هم باید بررسی شوند.',
        choices: [...new Set(parsed.parts || [])]
          .filter((t) => taskNames[t])
          .map((task) => ({
            ...choice(taskNames[task], { task }, ['budget_toman', 'budget_period']),
            compound: true
          }))
      };
    if (parsed.question)
      return {
        text: parsed.question,
        choices: [{ label: 'انتخاب با گزینه‌ها', intent: needs.task ? 'find' : 'tasks' }]
      };
    if (!needs.task) {
      const query = HB.normalize(needs.query || '').trim();
      const matches = query
        ? host
            .snapshot()
            .products.filter(
              (p) =>
                HB.normalize(p.title).includes(query) ||
                HB.normalize(p.model_id || '').includes(query)
            )
        : [];
      if (matches.length && new Set(matches.map((p) => p.task)).size === 1)
        return { infer: { task: matches[0].task } };
      return { text: 'مدل را برای چه کاری می‌خواهی؟', choices: welcome().choices };
    }
    if (needs.task !== 'gpu' && !needs.access)
      return {
        text:
          needs.usecase === 'coding'
            ? 'می‌خواهی از طریق API یا ابزار کدنویسی وصل شوی، یا فایل مدل را خودت اجرا کنی؟'
            : 'چطور می‌خواهی از مدل استفاده کنی؟',
        choices: [
          choice('اتصال با API', { access: 'api' }),
          choice('دریافت وزن‌ها', { access: 'weights' }),
          { label: 'فرقشان چیست؟', intent: 'help', help_topic: 'api' }
        ]
      };
    const period =
      needs.task === 'gpu' ? 'rental' : needs.access === 'weights' ? 'license' : 'month';
    if (needs.budget_toman != null && needs.budget_period !== period)
      return {
        text: 'این سقف هزینه برای کدام دوره است؟',
        note: 'هزینه API، مجوز وزن‌ها و اجاره GPU مبنای یکسان ندارند.',
        choices: [
          choice(
            period === 'month'
              ? 'مصرف یک ماه'
              : period === 'license'
                ? 'مجوز وزن‌ها'
                : 'کل مدت اجاره',
            { budget_period: period }
          ),
          choice('فعلا بدون سقف هزینه', {}, ['budget_toman', 'budget_period'])
        ]
      };
    if (
      needs.access === 'weights' &&
      (needs.no_retention || apiFields.some((k) => needs[k] && needs[k] !== 'instant'))
    )
      return {
        text: 'این شرط به سرویس API مربوط است. برای اجرای فایل مدل، تنظیمات و حریم خصوصی به محل اجرای خودت بستگی دارد.',
        choices: [
          choice('بررسی سرویس API', { access: 'api' }),
          choice('وزن‌ها؛ بررسی شرایط اجرای خودم', {}, ['no_retention', ...apiFields])
        ]
      };
    if (needs.task === 'gpu' && (needs.no_retention || needs.persian || needs.open))
      return {
        text: 'این شروط مدل/API را نمی‌توان روی کارت گرافیک تایید کرد. برای اجاره GPU، محل اجرا و شرایط ارائه‌دهنده را جدا بررسی کن.',
        choices: [choice('بررسی GPU با شرایط سخت‌افزاری', {}, ['no_retention', 'persian', 'open'])]
      };
    const inference = needs.task === 'gpu' && needs.inference
      ? inferencePlan(needs, host, HB) : null;
    if (inference && !inference.view) return inference;
    const view = inference?.view || toView(needs, HB);
    const candidates = host
      .rows(view)
      .map((p) => ({ product: p, quote: host.quote(p, view).best }));
    candidates.sort((a, b) =>
      needs.priority === 'cost'
        ? HB.comparePrices(a.quote?.estimate_toman, b.quote?.estimate_toman) ||
          a.product.id.localeCompare(b.product.id)
        : (a.product.rank ?? 50) - (b.product.rank ?? 50) ||
          a.product.id.localeCompare(b.product.id)
    );
    const matches = candidates.slice(0, 3);
    if (!matches.length) {
      const choices = [];
      if (needs.budget_toman != null)
        choices.push(choice('برداشتن سقف هزینه', {}, ['budget_toman', 'budget_period']));
      if (needs.query) choices.push(choice('بررسی مدل‌های دیگر', {}, ['query']));
      if (needs.usecase)
        choices.push(choice('دیدن مدل‌های بدون آزمون کدنویسی هم', {}, ['usecase']));
      choices.push({ label: 'ویرایش شرایط', intent: 'edit' });
      return {
        ...(inference || {}),
        text: 'با این شرایط، نتیجه‌ای در کاتالوگ پیدا نشد.',
        note: 'هیچ شرطی حذف نشده؛ می‌توانی یکی از شرایط را خودت تغییر بدهی.' + (inference ? ' ' + inference.note : ''),
        choices: [...choices.slice(0, -1).slice(0, 2), choices.at(-1)],
        view,
        matches: []
      };
    }
    const links = [
      {
        label: unresolved.length ? 'دیدن گزینه‌ها برای بررسی بیشتر' : 'دیدن همه نتایج با این شرایط',
        url: host.listURL(view)
      }
    ];
    if (inference?.links) links.push(...inference.links);
    if (intent === 'compare' || needs.priority === 'quality' || needs.usecase === 'coding') {
      const params = new URLSearchParams({
        task: needs.task,
        picks: matches.map((m) => m.product.id).join(',')
      });
      links.push({ label: 'مقایسه عملکرد این مدل‌ها', url: '#benchmarks?' + params });
    }
    const allFiles = needs.access === 'weights';
    const note = allFiles
      ? 'قیمت مربوط به دریافت فایل یا مجوز است؛ هزینه اجرای مدل جداست. مجوز تجاری را در صفحه مدل بررسی کن.'
      : needs.task === 'gpu'
        ? 'قیمت برای مدت اجاره انتخابی است. حافظه هر کارت جدا حساب می‌شود؛ هزینه‌های اعلام‌نشده نیاز به استعلام دارند.'
        : 'قیمت، برآورد مصرف ماهانه است؛ حداقل شارژ و هزینه‌های جانبی را در صفحه ارائه‌دهنده بررسی کن.';
    return {
      text: unresolved.length
        ? 'برای این شرایط هنوز تایید کامل نداریم. این گزینه‌ها را می‌توانی بررسی کنی:'
        : needs.priority === 'cost'
          ? 'این گزینه‌ها با شرایط تو، کمترین هزینه را دارند:'
          : 'این گزینه‌ها با شرایطی که گفتی جورند:',
      note: note + (inference ? ' ' + inference.note : ''),
      memory: inference?.memory,
      view,
      matches,
      links,
      choices: [
        { label: 'تنظیم مصرف و بودجه', intent: 'usage' },
        { label: 'ویرایش شرایط', intent: 'edit' }
      ],
      assumptions: inference ? inference.assumptions :
        !allFiles &&
        needs.task !== 'gpu' &&
        !(HB.usageFields[HB.taskUnits[needs.task]] || []).every((k) => needs.usage?.[k] != null)
          ? 'مقادیر مصرفی که مشخص نکرده‌ای، از الگوی معمول سایت گرفته شده‌اند؛ می‌توانی تغییرشان بدهی.'
          : ''
    };
  }
  root.TorobChatCore = {
    fields,
    labels,
    taskNames,
    updateNeeds,
    toView,
    decide,
    welcome,
    helpText
  };
})(globalThis);
