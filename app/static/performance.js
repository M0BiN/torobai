'use strict';
// Model selection is independent of reports. A shared metric is not a shared protocol.
const benchmarkKinds = {
  publisher_report: 'گزارش سازنده',
  research_report: 'گزارش پژوهشی',
  specification: 'مشخصات فنی',
  scenario: 'سناریوی فرضی',
  unavailable: 'بدون نتیجه منتشرشده'
};
const benchmarkCategories = {
  chat: 'مدل‌های زبانی',
  decision: 'تصمیم‌گیری',
  embedding: 'جستجوی معنایی',
  transcription: 'گفتار به متن',
  translation: 'ترجمه',
  speech: 'متن به گفتار',
  image: 'ساخت تصویر',
  ocr: 'خواندن سند',
  extraction: 'استخراج اطلاعات',
  classification: 'دسته‌بندی متن',
  gpu: 'GPU'
};
const benchmarkColors = ['#e05a4f', '#5579c6', '#29958a', '#9272b8'];
const benchmarkDefaults = {
  chat: ['gemma-4-31b', 'qwen3.6-27b', 'gpt-5-mini'],
  decision: ['decider-2b', 'decider-4b'],
  embedding: ['qwen3-embedding', 'bge-m3', 'text-embedding-3-small'],
  transcription: ['whisper-fa-cv17', 'whisper-v3-turbo'],
  gpu: ['rtx-3090', 'rtx-4090', 'rtx-5090']
};
const benchmarkSelectionMemory = new Map();
let benchmarkPickerDraft = [];
function benchmarkGroups() {
  return catalog.benchmarks?.groups || [];
}
function benchmarkGroupFor(p) {
  return benchmarkGroups().find((g) => g.records.some((r) => r.product_id === p.id));
}
function benchmarkProfile(p) {
  return (
    catalog.benchmarks?.profiles?.[p.id] || {
      status: 'unavailable',
      note: 'هنوز نتیجه آزمونی برای این نسخه ثبت نشده است. پس از دریافت گزارش با مشخصات مدل و روش آزمون، نتیجه در این بخش قرار می‌گیرد.'
    }
  );
}
function benchmarkURL(changes = {}) {
  const fields = {
    group: state.benchGroup,
    task: state.benchTask,
    metric: state.benchMetric,
    chart: state.benchChart,
    common: state.benchCommon ? '1' : '',
    picks: state.benchPicks,
    rental: state.rental,
    mode: state.requestMode,
    usage_unit: state.usageUnit,
    ...state.usage,
    ...changes
  };
  return (
    '#benchmarks?' +
    new URLSearchParams(Object.entries(fields).filter(([, v]) => v !== '' && v != null))
  );
}
function benchmarkValue(row, metric) {
  const value = row?.values?.[metric.id];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function benchmarkFormat(value, metric) {
  return value == null
    ? '<span class="bench-missing">ثبت نشده</span>'
    : `${num(value, Math.max(metric.digits ?? 1, 2))} <small>${esc(metric.unit)}</small>`;
}
function benchmarkQuote(p) {
  const view = {
    ...state,
    access: 'api',
    provider: '',
    ssh: false,
    json: false,
    tools: false,
    streaming: false,
    no_retention: false
  };
  if (p.kind !== 'gpu') return catalogQuote(p, view).best;
  return (
    (catalog.estimates[p.id]?.[state.rental]?.offers || [])
      .filter((o) => o.estimate_toman != null && o.availability !== 'unavailable')
      .sort((a, b) => HB.comparePrices(a.estimate_toman, b.estimate_toman))[0] || null
  );
}
function benchmarkMeasurements(p) {
  const entries = new Map();
  // A published result takes precedence over a fixture; neither fills another protocol's gap.
  const groups = benchmarkGroups()
    .filter((g) => g.records.some((r) => r.product_id === p.id))
    .sort((a, b) => (a.kind === 'scenario') - (b.kind === 'scenario'));
  for (const group of groups) {
    const record = group.records.find((r) => r.product_id === p.id);
    for (const metric of group.metrics) {
      const key = metric.key || `${group.id}-${metric.id}`;
      if (!entries.has(key))
        entries.set(key, { group, record, metric, value: benchmarkValue(record, metric) });
    }
  }
  return entries;
}
function benchmarkContext() {
  const legacy = benchmarkGroups().find((g) => g.id === state.benchGroup);
  const requested = [...new Set(state.benchPicks.split(',').filter(Boolean))]
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);
  const legacyProduct = products.find((p) => p.id === legacy?.records[0]?.product_id);
  const task =
    requested[0]?.task ||
    (benchmarkCategories[state.benchTask] ? state.benchTask : '') ||
    legacyProduct?.task ||
    'chat';
  const candidates = products.filter((p) => p.task === task && benchmarkProfile(p));
  let picked = requested
    .filter((p) => p.task === task && p.unit === candidates[0]?.unit)
    .slice(0, 4);
  if (!picked.length && legacy)
    picked = legacy.records
      .map((r) => products.find((p) => p.id === r.product_id))
      .filter((p) => p?.task === task)
      .slice(0, 4);
  if (!picked.length) {
    const ids =
      benchmarkSelectionMemory.get(task) ||
      benchmarkDefaults[task] ||
      candidates.slice(0, 3).map((p) => p.id);
    picked = ids
      .map((id) => candidates.find((p) => p.id === id))
      .filter(Boolean)
      .slice(0, 4);
  }
  if (!picked.length) picked = candidates.slice(0, 1);
  const rows = picked.map((p, i) => ({
    p,
    product_id: p.id,
    quote: benchmarkQuote(p),
    color: benchmarkColors[i],
    measurements: benchmarkMeasurements(p)
  }));
  const allMetrics = new Map();
  for (const row of rows)
    for (const [key, entry] of row.measurements)
      if (!allMetrics.has(key)) allMetrics.set(key, { ...entry.metric, key });
  const priority = ['gpqa-diamond', 'mmlu-pro', 'lcb-v6', 'aime-2025', 'aime-2026', 'ifeval'];
  const metrics = [...allMetrics.values()].sort((a, b) => {
    const count = (m) => rows.filter((r) => r.measurements.get(m.key)?.value != null).length;
    const position = (m) => (priority.includes(m.key) ? priority.indexOf(m.key) : 100);
    return count(b) - count(a) || position(a) - position(b);
  });
  const legacyMetric = legacy?.metrics.find((m) => m.id === state.benchMetric);
  const metric =
    metrics.find((m) => m.key === state.benchMetric || m.key === legacyMetric?.key) || metrics[0];
  return { task, candidates, picked: rows, rows, metrics, metric, group: legacy };
}
function benchmarkRows(ctx) {
  return ctx.rows.map((r) => ({ ...r, value: r.measurements.get(ctx.metric?.key)?.value ?? null }));
}
function benchmarkSource(g) {
  const references = new Map();
  if (g.source) references.set(g.source.url, g.source.label);
  if (g.method_source_url) references.set(g.method_source_url, 'کد روش ارزیابی');
  for (const r of g.records)
    if (r.source_url)
      references.set(
        r.source_url,
        products.find((p) => p.id === r.product_id)?.title || r.product_id
      );
  return `<details class="benchmark-method"><summary>${esc(g.title)}<span>${benchmarkKinds[g.kind]}</span>${icon('chevron')}</summary><div>
    <p>${esc(g.conditions)}</p><p class="small">بررسی منبع: <bdi>${esc(g.recorded_at)}</bdi> · ${g.measured ? 'نقل نتیجه منبع؛ آزمون توسط torobai اجرا نشده است.' : g.kind === 'scenario' ? 'مقادیر فرضی؛ آزمون اجرا نشده است.' : g.kind === 'unavailable' ? 'نتیجه ناموجود به معنی صفر نیست.' : 'مشخصات سخت‌افزار، نه سرعت اجرای مدل.'}</p>
    ${[...references].map(([url, label]) => external(url, esc(label))).join(' ')}
    ${g.records
      .filter((r) => r.evaluated_version)
      .map(
        (r) =>
          `<p class="small"><bdi>${esc(products.find((p) => p.id === r.product_id)?.title || r.product_id)}</bdi> · <bdi>${esc(r.evaluated_version)}</bdi></p>`
      )
      .join('')}
    </div></details>`;
}
function benchmarkUsagePanel(p) {
  const period =
    p.kind === 'gpu' ? `${fa(catalog.presets.hour[state.rental].hours)} ساعت اجاره` : 'مصرف ۳۰ روز';
  return `<details id="benchmarkUsage" class="bench-usage"><summary>${icon('filter')}<span>مبنای هزینه: <strong>${period}</strong></span><span class="bench-usage-summary">${esc(p.kind === 'gpu' ? 'برای هر کارت' : usageText(p))}</span><b>تنظیم مصرف</b>${icon('chevron')}</summary>
    <form id="benchmarkUsageForm" class="request-form">${
      p.kind === 'gpu'
        ? `<label>مدت اجاره<select name="rental">${Object.keys(presetNames)
            .map(
              (k) =>
                `<option value="${k}" ${k === state.rental ? 'selected' : ''}>${fa(catalog.presets.hour[k].hours)} ساعت</option>`
            )
            .join('')}</select></label>`
        : `<div class="listing-grid">${usageInputs(Object.fromEntries((HB.usageFields[p.unit] || []).map((k) => [k, catalogValues(p)[k]])))}</div>${modeControl(state.requestMode, 'benchmarkMode')}`
    }
      <button class="button" type="submit">اعمال مصرف</button><p class="small">هزینه API یا اجاره، پیش از مالیات و هزینه‌های جانبی. مجوز فایل مدل جداست.</p><p id="benchmarkUsageError" class="form-error" role="alert" hidden></p>
    </form></details>`;
}
function renderBenchmarks() {
  const openUsage = Boolean($('benchmarkUsage')?.open || $('benchmarkUsage')?.hasAttribute('open'));
  const previousTask = document.querySelector('.bench-page')?.dataset.task;
  const tableLeft = document.querySelector('.bench-table-scroll')?.scrollLeft || 0;
  const ctx = benchmarkContext(),
    { rows, task } = ctx;
  benchmarkSelectionMemory.set(
    task,
    rows.map((r) => r.p.id)
  );
  const p = rows[0]?.p;
  if (!p) {
    $('main').innerHTML = '<div class="empty-state">مدلی برای مقایسه پیدا نشد.</div>';
    return;
  }
  const sources = [
    ...new Map(
      rows.flatMap((r) => [...r.measurements.values()].map((e) => [e.group.id, e.group]))
    ).values()
  ];
  $('main').innerHTML = `<div class="bench-page" data-task="${task}">
    <header class="bench-heading"><div><h1>مدل‌ها را کنار هم ببینید</h1><p>نتیجه آزمون‌ها، هزینه مصرف و پیشنهادهای ارائه‌دهندگان؛ در یک نگاه.</p></div>
      <div class="bench-actions"><button class="button secondary" data-bench-share>${icon('external')} اشتراک مقایسه</button><button class="icon-button" data-bench-export aria-label="دریافت نتایج و منابع به صورت CSV" title="خروجی CSV">${icon('download')}</button></div></header>
    <nav class="bench-task-rail" aria-label="کاربرد مدل">${Object.entries(benchmarkCategories)
      .map(
        ([key, label]) =>
          `<a href="${esc(benchmarkURL({ task: key, group: '', picks: (benchmarkSelectionMemory.get(key) || []).join(','), metric: '', common: '', usage_unit: '', mode: 'instant' }))}" ${task === key ? 'aria-current="page"' : ''}>${label}<small>${fa(products.filter((p) => p.task === key).length)}</small></a>`
      )
      .join('')}</nav>
    <section class="bench-sheet" aria-label="مقایسه مدل‌های انتخاب‌شده">
      <div class="bench-sheet-top"><div><strong>${esc(benchmarkCategories[task])}</strong><span>${fa(rows.length)} انتخاب از ${fa(ctx.candidates.length)} ${task === 'gpu' ? 'سخت‌افزار' : 'مدل'}</span></div><button class="button secondary" data-bench-add>${icon('plus')} انتخاب مدل‌ها</button></div>
      ${benchmarkUsagePanel(p)}
      <div class="bench-view-toolbar"><div class="preset-switch" role="group" aria-label="نوع نمایش">${[
        ['bars', 'مقایسه سریع'],
        ['matrix', 'جدول کامل'],
        ['scatter', 'عملکرد و هزینه']
      ]
        .map(
          ([key, label]) =>
            `<button data-bench-chart="${key}" aria-pressed="${state.benchChart === key}">${label}</button>`
        )
        .join('')}</div>
        <label class="bench-common"><input type="checkbox" id="benchmarkCommon" ${state.benchCommon ? 'checked' : ''}>فقط آزمون‌های مشترک</label></div>
      <section id="benchmarkResults" aria-label="نتیجه مقایسه"></section>
      <div class="bench-footnote">${icon('info')}<span>هر آزمون یک توانایی مشخص را می‌سنجد. عدد بالاتر همیشه بهتر نیست؛ راهنمای هر ردیف را ببینید. نتایج گزارش‌های مختلف، رتبه‌بندی کنترل‌شده نیستند.</span></div>
    </section>
    <details class="bench-sources"><summary><span>${icon('info')} منابع و شرایط آزمون‌ها</span><span>${fa(sources.length)} مرجع ${icon('chevron')}</span></summary><div>${sources.map(benchmarkSource).join('')}</div></details>
  </div>`;
  renderBenchmarkResults(ctx);
  if (previousTask === task && document.querySelector('.bench-table-scroll'))
    document.querySelector('.bench-table-scroll').scrollLeft = tableLeft;
  if (openUsage) window.TorobMotion.setOpen($('benchmarkUsage'), true, false);
  document.title = 'مقایسه عملکرد مدل‌ها | torobai';
}
function benchmarkModelHead(r) {
  const profile = benchmarkProfile(r.p),
    kind = profile.status;
  const url = href(r.p, { ...state, provider: '', access: '', ssh: false });
  const period =
    r.p.kind === 'gpu' ? `${fa(catalog.presets.hour[state.rental].hours)} ساعت` : '۳۰ روز';
  const revision = [...r.measurements.values()].find((e) => e.record.evaluated_version)?.record
    .evaluated_version;
  return `<div class="bench-model" style="--bench-color:${r.color}"><button class="bench-remove icon-button" data-bench-remove="${r.p.id}" aria-label="حذف ${esc(r.p.title)} از مقایسه">${icon('close')}</button>
    <div class="bench-model-logo">${logo(r.p)}</div><a class="bench-model-name" href="${url}" dir="auto">${esc(r.p.title)}</a>
    <span class="bench-model-status ${kind === 'scenario' ? 'is-scenario' : ''}">${kind === 'published' ? 'دارای نتیجه منتشرشده' : kind === 'scenario' ? 'سناریوی فرضی' : kind === 'specification' ? 'مشخصات مرجع' : 'نتیجه منتشرشده نداریم'}</span>
    ${revision && /2024-|v11|v2\.1|high|Max/.test(revision) ? `<span class="bench-tested-version">آزمون: <bdi>${esc(revision)}</bdi></span>` : ''}
    <div class="bench-model-price"><small>هزینه ${period} از</small><strong>${r.quote ? money(r.quote.estimate_toman) : 'نیاز به استعلام'}</strong><a href="${url}" class="bench-provider-link">${r.quote ? esc(r.quote.seller) : 'پیشنهادهای ارائه‌دهندگان'} ${icon('arrow')}</a></div></div>`;
}
function benchmarkMetricCells(ctx, m) {
  const entries = ctx.rows.map((r) => r.measurements.get(m.key));
  const eligible = entries.filter((e) => e?.value != null);
  const sameCohort =
    eligible.length === ctx.rows.length &&
    eligible.length > 1 &&
    new Set(eligible.map((e) => e.group.id)).size === 1 &&
    eligible.every((e) => e.group.measured && e.group.kind !== 'scenario');
  const best = sameCohort
    ? m.direction === 'lower'
      ? Math.min(...eligible.map((e) => e.value))
      : Math.max(...eligible.map((e) => e.value))
    : null;
  const max = Math.max(m.max || 1, ...eligible.map((e) => e.value));
  return ctx.rows
    .map((r, i) => {
      const e = entries[i],
        value = e?.value ?? null;
      return `<td data-model="${esc(r.p.title)}" style="--bench-color:${r.color}" ${value != null && value === best ? 'class="bench-best"' : ''}>
      <div class="bench-cell-value"><strong>${benchmarkFormat(value, m)}</strong>${value != null && value === best ? '<span class="bench-best-label">بهترین نتیجه همین آزمون</span>' : ''}</div>
      ${value != null && state.benchChart !== 'matrix' ? `<div class="bench-meter" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, (value / max) * 100))}%"></i></div>` : ''}
      ${e ? `<button class="bench-cell-source" data-bench-source="${e.group.id}">${e.group.kind === 'scenario' ? 'فرضی · آزمون اجرا نشده' : e.group.kind === 'unavailable' ? 'چرا نتیجه ندارد؟' : 'منبع و روش آزمون'} ${icon('info')}</button>` : '<span class="bench-cell-gap">این آزمون گزارش نشده</span>'}</td>`;
    })
    .join('');
}
function renderBenchmarkResults(ctx = benchmarkContext()) {
  let metrics = ctx.metrics.filter(
    (m) => !state.benchCommon || ctx.rows.every((r) => r.measurements.get(m.key)?.value != null)
  );
  const allCount = metrics.length;
  if (state.benchChart === 'bars') metrics = metrics.slice(0, 6);
  const heads = `<thead><tr><th scope="col" class="bench-corner"><span>انتخاب شما</span><strong>${fa(ctx.rows.length)} ${ctx.task === 'gpu' ? 'سخت‌افزار' : 'مدل'}</strong><button class="bench-add-link" data-bench-add>${icon('plus')} تغییر انتخاب‌ها</button></th>${ctx.rows.map((r) => `<th scope="col">${benchmarkModelHead(r)}</th>`).join('')}</tr></thead>`;
  const body = metrics
    .map(
      (m) =>
        `<tr><th scope="row"><span>${esc(m.label)}</span><small dir="auto">${esc(m.name)}</small><em>${m.direction === 'lower' ? '↓ کمتر بهتر' : '↑ بیشتر بهتر'}</em></th>${benchmarkMetricCells(ctx, m)}</tr>`
    )
    .join('');
  const table = `<div class="bench-table-scroll" tabindex="0" aria-label="جدول مقایسه؛ در صفحه کوچک به چپ و راست حرکت کنید"><table class="bench-table" style="--bench-columns:${ctx.rows.length}"><caption class="sr-only">نتیجه آزمون‌ها و هزینه مدل‌های انتخاب‌شده</caption>${heads}<tbody>${state.benchChart === 'scatter' ? '' : body}</tbody></table></div>`;
  let content = table;
  if (state.benchChart === 'scatter') {
    const m = metrics.find((m) => m.key === ctx.metric?.key) || metrics[0];
    content += `<div class="bench-scatter-panel"><label class="bench-metric-select">آزمون<select id="benchmarkMetric">${metrics.map((x) => `<option value="${esc(x.key)}" ${x.key === m?.key ? 'selected' : ''}>${esc(x.label)} · ${esc(x.name)}</option>`).join('')}</select></label>${
      m
        ? benchmarkScatter(
            ctx.rows.map((r) => ({ ...r, value: r.measurements.get(m.key)?.value ?? null })),
            m
          )
        : ''
    }<p class="small">نمودار فقط مدل‌هایی را نشان می‌دهد که هم قیمت و هم نتیجه این آزمون را دارند. روش آزمون هر مدل را در منابع بررسی کنید.</p></div>`;
  }
  if (!metrics.length)
    content += `<div class="bench-empty">${icon('info')}<h2>${state.benchCommon ? 'آزمون مشترکی پیدا نشد' : 'هنوز نتیجه‌ای برای این انتخاب نداریم'}</h2><p>${state.benchCommon ? 'ممکن است مدل‌ها روی مجموعه‌های متفاوت ارزیابی شده باشند. همه آزمون‌ها را ببینید یا مدل دیگری انتخاب کنید.' : 'مدل دیگری را برای مقایسه انتخاب کنید.'}</p>${state.benchCommon ? '<button class="button secondary" data-bench-all>نمایش همه آزمون‌ها</button>' : ''}</div>`;
  if (state.benchChart === 'bars' && allCount > 6)
    content += `<button class="bench-expand" data-bench-chart="matrix">دیدن هر ${fa(allCount)} آزمون ${icon('chevron')}</button>`;
  $('benchmarkResults').innerHTML = content;
}
function openBenchmarkPicker() {
  const ctx = benchmarkContext();
  benchmarkPickerDraft = ctx.rows.map((r) => r.p.id);
  showDialog(
    'انتخاب مدل برای مقایسه',
    `<div class="bench-picker"><p class="small">${esc(benchmarkCategories[ctx.task])} · حداکثر چهار انتخاب</p><label class="bench-picker-search">${icon('search')}<input id="benchmarkSearch" type="search" autocomplete="off" placeholder="نام مدل یا سازنده را بنویسید" aria-label="جستجوی مدل در ${esc(benchmarkCategories[ctx.task])}"></label><div id="benchmarkPickerList" class="bench-picker-list"></div><div class="bench-picker-footer"><span id="benchmarkPickerCount" role="status"></span><button class="button" data-bench-apply>مقایسه مدل‌ها ${icon('compare')}</button></div><p id="benchmarkPickerError" class="form-error" role="alert" hidden></p></div>`
  );
  renderBenchmarkPicker();
  $('benchmarkSearch').focus({ preventScroll: true });
}
function renderBenchmarkPicker() {
  const ctx = benchmarkContext(),
    query = ($('benchmarkSearch')?.value || '').trim().toLocaleLowerCase();
  const normalize = (s) => HB.normalize(s).replace(/[\s_\-]/g, '');
  const list = ctx.candidates.filter((p) =>
    normalize(
      p.title + ' ' + p.id + ' ' + p.maker + ' ' + (p.model_id || '') + ' ' + (p.search_terms || '')
    ).includes(normalize(query))
  );
  $('benchmarkPickerList').innerHTML = list.length
    ? list
        .map((p) => {
          const selected = benchmarkPickerDraft.includes(p.id),
            status = benchmarkProfile(p).status;
          return `<button class="bench-picker-item" data-bench-pick="${p.id}" aria-pressed="${selected}">${logo(p)}<span><strong dir="auto">${esc(p.title)}</strong><small>${esc(p.maker)} · ${status === 'published' ? 'نتیجه منتشرشده' : status === 'scenario' ? 'سناریوی فرضی' : status === 'specification' ? 'مشخصات فنی' : 'بدون نتیجه عددی'}</small></span><i>${icon(selected ? 'check' : 'plus')}</i></button>`;
        })
        .join('')
    : '<p class="bench-empty">مدلی با این نام پیدا نشد.</p>';
  $('benchmarkPickerCount').textContent = fa(benchmarkPickerDraft.length) + ' از ۴ مدل انتخاب شده';
}
function benchmarkProductPanel(p) {
  const profile = benchmarkProfile(p),
    entries = [...benchmarkMeasurements(p).values()];
  const groups = [...new Map(entries.map((e) => [e.group.id, e.group])).values()];
  const url = '#benchmarks?task=' + p.task + '&picks=' + p.id;
  return `<section class="workspace-panel benchmark-product"><div class="section-heading"><div><h2>نتیجه آزمون‌های ${esc(p.title)}</h2><p class="small">${profile?.status === 'published' ? 'نتایج منتشرشده برای نسخه مشخص مدل' : profile?.status === 'scenario' ? 'سناریوی فرضی · آزمون اجرا نشده است' : 'وضعیت ارزیابی این محصول'}</p></div><a class="button secondary" href="${url}">مقایسه با مدل دیگر ${icon('compare')}</a></div>
    ${
      profile?.status === 'unavailable'
        ? `<p>${esc(profile.note)}</p>`
        : `<div class="benchmark-mini-grid">${entries
            .slice(0, 4)
            .map(
              (e) =>
                `<div><span>${esc(e.metric.label)}</span><strong>${benchmarkFormat(e.value, e.metric)}</strong><small>${esc(e.metric.name)} · ${e.metric.direction === 'lower' ? 'کمتر بهتر' : 'بیشتر بهتر'}</small></div>`
            )
            .join('')}</div>`
    }
    ${groups.map(benchmarkSource).join('')}<p class="small">این نتایج برای مدل است؛ پایداری و شرایط API هر ارائه‌دهنده را جدا بررسی کنید.</p></section>`;
}
function benchmarkComparisonLink(rows) {
  const sameTask = rows.every((p) => p.task === rows[0]?.task);
  return `<div class="workspace-note benchmark-compare-link"><div><strong>نتیجه آزمون‌ها را کنار هم ببینید</strong><p>مقایسه عملکرد، همراه با منابع و شرایط هر آزمون.</p></div><a class="button secondary" href="#benchmarks${sameTask ? '?task=' + rows[0].task + '&picks=' + rows.map((p) => p.id).join(',') : ''}">مقایسه عملکرد ${icon('arrow')}</a></div>`;
}
function exportBenchmarkCSV() {
  const ctx = benchmarkContext();
  const cell = (v) =>
    '"' +
    String(v ?? '')
      .replace(/^[=+\-@\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const lines = [
    [
      'model',
      'model_id',
      'tested_version',
      'cohort',
      'source_kind',
      'measured',
      'metric',
      'value',
      'unit',
      'direction',
      'cost_toman',
      'cost_basis',
      'provider',
      'source',
      'recorded_at',
      'conditions'
    ]
  ];
  for (const r of ctx.rows)
    for (const e of r.measurements.values())
      lines.push([
        r.p.title,
        e.record.model_id,
        e.record.evaluated_version || '',
        e.group.id,
        e.group.kind,
        e.group.measured,
        e.metric.name,
        e.value,
        e.metric.unit,
        e.metric.direction,
        r.quote?.estimate_toman,
        r.p.kind === 'gpu' ? usageText(r.p, catalog.presets.hour[state.rental]) : usageText(r.p),
        r.quote?.seller,
        e.record.source_url || e.group.source?.url,
        e.group.recorded_at,
        e.group.conditions
      ]);
  downloadRecord(
    'torobai-benchmarks.csv',
    lines.map((row) => row.map(cell).join(',')).join('\r\n'),
    true
  );
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-bench-add]')) openBenchmarkPicker();
  const pick = e.target.closest('[data-bench-pick]');
  if (pick) {
    const id = pick.dataset.benchPick,
      at = benchmarkPickerDraft.indexOf(id);
    if (at < 0 && benchmarkPickerDraft.length === 4) {
      marketError('benchmarkPickerError', 'حداکثر چهار مدل را کنار هم مقایسه کنید.');
      return;
    }
    if (at >= 0) benchmarkPickerDraft.splice(at, 1);
    else benchmarkPickerDraft.push(id);
    $('benchmarkPickerError').hidden = true;
    renderBenchmarkPicker();
    document.querySelector(`[data-bench-pick="${id}"]`)?.focus({ preventScroll: true });
  }
  if (e.target.closest('[data-bench-apply]')) {
    if (!benchmarkPickerDraft.length) {
      marketError('benchmarkPickerError', 'حداقل یک مدل انتخاب کنید.');
      return;
    }
    navigate(
      benchmarkURL({
        task: benchmarkContext().task,
        group: '',
        picks: benchmarkPickerDraft.join(','),
        metric: ''
      })
    );
  }
  const remove = e.target.closest('[data-bench-remove]');
  if (remove) {
    const ctx = benchmarkContext(),
      ids = ctx.rows.map((r) => r.p.id).filter((id) => id !== remove.dataset.benchRemove);
    if (!ids.length) {
      toast('برای تغییر آخرین مدل، «انتخاب مدل‌ها» را بزنید.');
      return;
    }
    navigate(benchmarkURL({ group: '', task: ctx.task, picks: ids.join(',') }));
  }
  const chart = e.target.closest('[data-bench-chart]');
  if (chart) navigate(benchmarkURL({ chart: chart.dataset.benchChart }));
  if (e.target.closest('[data-bench-all]')) navigate(benchmarkURL({ common: '' }));
  const source = e.target.closest('[data-bench-source]');
  if (source) {
    const g = benchmarkGroups().find((g) => g.id === source.dataset.benchSource);
    if (g) {
      showDialog('منبع و روش آزمون', benchmarkSource(g));
      window.TorobMotion.setOpen($('dialogBody').querySelector('details'), true, false);
    }
  }
  if (e.target.closest('[data-bench-share]')) {
    const ctx = benchmarkContext();
    copy(
      location.href.split('#')[0] +
        benchmarkURL({ group: '', task: ctx.task, picks: ctx.rows.map((r) => r.p.id).join(',') })
    );
  }
  if (e.target.closest('[data-bench-export]')) exportBenchmarkCSV();
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'benchmarkSearch') renderBenchmarkPicker();
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'benchmarkMetric') navigate(benchmarkURL({ metric: e.target.value }));
  if (e.target.id === 'benchmarkCommon')
    navigate(benchmarkURL({ common: e.target.checked ? '1' : '' }));
});
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'benchmarkUsageForm') return;
  e.preventDefault();
  const f = e.target,
    p = benchmarkContext().rows[0].p;
  if (p.kind === 'gpu') {
    navigate(benchmarkURL({ rental: marketInput(f, 'rental') }));
    return;
  }
  const values = {};
  for (const key of HB.usageFields[p.unit] || []) {
    const v = parseNumber(
      marketInput(f, key),
      ['monthly_tokens', 'characters'].includes(key) ? 1e9 : 1e6,
      key !== 'minutes'
    );
    if (v == null) {
      marketError('benchmarkUsageError', 'مقدار مصرف را با عدد معتبر وارد کنید.');
      return;
    }
    values[key] = v;
  }
  navigate(benchmarkURL({ ...values, usage_unit: p.unit, mode: marketInput(f, 'request_mode') }));
});

function benchmarkScatter(rows, m) {
  const valid = rows.filter((r) => r.value != null && r.quote);
  if (!valid.length)
    return '<div class="empty-state compact"><h3>داده مشترک کافی نیست</h3><p>برای این نمودار، هم قیمت و هم نتیجه همین معیار باید مشخص باشد.</p></div>';
  const maxCost = Math.max(1, ...valid.map((r) => r.quote.estimate_toman)) * 1.12;
  const max = m.max || Math.max(1, ...valid.map((r) => r.value)) * 1.1;
  const point = (r) => ({
    x: 80 + (530 * r.quote.estimate_toman) / maxCost,
    y: 270 - (215 * r.value) / max
  });
  return `<div class="benchmark-scatter"><svg viewBox="0 0 680 340" role="img" aria-labelledby="scatterTitle scatterDescription"><title id="scatterTitle">${esc(m.label)} در برابر هزینه</title><desc id="scatterDescription">محور افقی هزینه به تومان، محور عمودی ${esc(m.unit)}. ${m.direction === 'lower' ? 'پایین و چپ مطلوب‌تر' : 'بالا و چپ مطلوب‌تر'}. مقادیر دقیق در جدول زیر نمودار در دسترس است.</desc><rect x="80" y="45" width="530" height="225" rx="8" fill="#faf8f5"/>${[0, 0.25, 0.5, 0.75, 1].map((t) => `<line x1="80" y1="${270 - 215 * t}" x2="610" y2="${270 - 215 * t}" stroke="#e7e2dc" stroke-dasharray="3 5"/><text x="66" y="${275 - 215 * t}" text-anchor="end">${fa(max * t, 1)}</text><text x="${80 + 530 * t}" y="294" text-anchor="middle">${fa((maxCost * t) / 1000, 0)}</text>`).join('')}<text x="345" y="326" text-anchor="middle">هزینه · هزار تومان</text>${valid
    .map((r, i) => {
      const { x, y } = point(r);
      return `<g><title>${esc(r.p.title)}: ${fa(r.value, 2)} ${esc(m.unit)}؛ ${fa(r.quote.estimate_toman)} تومان</title><circle cx="${x}" cy="${y}" r="13" fill="${r.color}" stroke="white" stroke-width="3"/><text x="${x}" y="${y + 4}" text-anchor="middle" fill="white" class="point-number">${fa(i + 1)}</text></g>`;
    })
    .join(
      ''
    )}</svg></div><p class="small">${m.direction === 'lower' ? 'پایین‌تر: مقدار کمتر' : 'بالاتر: نتیجه بیشتر'} · سمت چپ: هزینه کمتر. ${fa(rows.length - valid.length)} انتخاب بدون داده مشترک در نمودار نیست.</p><ol class="benchmark-point-list">${valid.map((r) => `<li><bdi>${esc(r.p.title)}</bdi><span>${benchmarkFormat(r.value, m)} · ${money(r.quote.estimate_toman)}</span></li>`).join('')}</ol>`;
}

let gpuMatchSequence = 0,
  gpuMatchPending = null;
const gpuMatchCache = new Map();
function gpuParameterGuess(p) {
  if (!p) return '';
  const known = {
    'gemma-4-e2b': 5.1,
    'gemma-4-e4b': 8,
    'gemma-4-31b': 30.7,
    'gemma-4-26b-a4b': 25.2
  };
  if (known[p.id]) return String(known[p.id]);
  return /([\d.]+)\s*[bB]\b/.exec(p.title)?.[1] || '';
}
function cancelGPUMatch() {
  gpuMatchSequence++;
  const pending = gpuMatchPending;
  if (!pending) return;
  const button = pending.form.querySelector('button[type=submit]');
  if (button) {
    button.disabled = false;
    button.innerHTML = 'محاسبه جدید ' + icon('arrow');
  }
  pending.result.removeAttribute('aria-busy');
  const status = pending.form.querySelector('#gpuMatchStatus');
  if (status) {
    status.textContent = 'تنظیمات تغییر کرده؛ برای دیدن نتیجه تازه محاسبه کنید.';
    status.hidden = false;
  }
  gpuMatchPending = null;
}
function gpuMemoryParts(v) {
  const weights = (v.parameters * 1e9 * v.bits) / 8 / 2 ** 30;
  const kv = ((v.kv * v.context) / 1000) * v.concurrent;
  const margin = ((weights + kv + v.overhead) * v.margin) / 100;
  return { weights, kv, overhead: v.overhead, margin, total: weights + kv + v.overhead + margin };
}
function renderGPUMatcher() {
  const candidates = products.filter(
    (p) => p.kind === 'api' && (p.weights_url || p.weight_offers?.length)
  );
  const p = candidates.find((p) => p.id === state.model) || candidates[0];
  if (!p) {
    $('main').innerHTML =
      '<div class="empty-state"><h1>مدلی برای انتخاب سخت‌افزار ثبت نشده است</h1></div>';
    return;
  }
  const guessed = gpuParameterGuess(p);
  $('main').innerHTML =
    `<section class="catalog-heading gpu-planner-heading"><div><p class="breadcrumb">torobai / انتخاب سخت‌افزار</p><h1>GPU برای اجرای مدل</h1><p>حافظه مورد نیاز را حساب کنید؛ هزینه و شرایط اجاره کارت‌های مناسب را کنار هم ببینید.</p></div><a class="button secondary" href="#benchmarks?group=gpu-specs">مقایسه عملکرد GPU ${icon('compare')}</a></section>
  <div class="gpu-planner-layout"><form id="gpuMatchForm" class="workspace-panel request-form gpu-planner-form"><div class="planner-step"><span>۱</span><h2>مدل و روش اجرا</h2></div><label>مدلی که می‌خواهید اجرا کنید<select name="model">${candidates.map((x) => `<option value="${x.id}" ${p.id === x.id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></label>
  <div class="listing-grid"><label>کل پارامترهای مدل (میلیارد)<input name="parameters" inputmode="decimal" value="${esc(guessed)}" required></label><label>دقت وزن‌ها<select name="bits"><option value="4" selected>۴ بیت · حافظه کمتر</option><option value="8">۸ بیت · متعادل</option><option value="16">۱۶ بیت · دقت کامل</option></select></label></div><p class="small">در مدل MoE، تعداد کل پارامترها را وارد کنید. عدد نام مدل ممکن است تقریبی باشد؛ فرمت کوانتیزه باید با موتور اجرا سازگار باشد.</p>
  <div class="planner-step"><span>۲</span><h2>حجم کار</h2></div><div class="preset-switch gpu-workload-presets" role="group" aria-label="تنظیم سریع حجم کار"><button type="button" data-gpu-preset="light">گفت‌وگوی کوتاه</button><button type="button" data-gpu-preset="long">متن بلند</button><button type="button" data-gpu-preset="parallel">چند کاربر</button></div><div class="listing-grid"><label>توکن‌های فعال هر درخواست<input name="context" inputmode="numeric" value="۴۰۹۶" required></label><label>درخواست هم‌زمان<input name="concurrent" inputmode="numeric" value="۱" required></label><label>مدت اجاره<select name="rental">${Object.keys(
    presetNames
  )
    .map(
      (k) =>
        `<option value="${k}" ${k === 'standard' ? 'selected' : ''}>${fa(catalog.presets.hour[k].hours)} ساعت</option>`
    )
    .join(
      ''
    )}</select></label></div><label class="request-check"><input name="ssh" type="checkbox" checked>دسترسی SSH لازم دارم</label>
  <details><summary>تنظیم دقیق حافظه ${icon('filter')}</summary><div class="listing-grid"><label>بودجه KV برای هزار توکن (GiB)<input name="kv" inputmode="decimal" value="۰٫۲۵"></label><label>حافظه موتور اجرا (GiB)<input name="overhead" inputmode="decimal" value="۲"></label><label>حاشیه اطمینان (درصد)<input name="margin" inputmode="numeric" value="۲۰"></label></div><p class="small">KV به معماری مدل وابسته است. بودجه واردشده در تعداد درخواست هم‌زمان ضرب می‌شود. توکن‌های فعال شامل ورودی و خروجی در حافظه هستند.</p></details>
  <details><summary>دیسک و انتقال داده ${icon('filter')}</summary><div class="listing-grid"><label>فضای دیسک (GB)<input name="disk" inputmode="decimal" value="۴۰"></label><label>نرخ دیسک برای همین مدت / GB (تومان)<input name="disk_rate" inputmode="decimal" placeholder="با استعلام"></label><label>انتقال داده (GB)<input name="traffic" inputmode="decimal" value="۱۰"></label><label>نرخ انتقال / GB (تومان)<input name="traffic_rate" inputmode="decimal" placeholder="با استعلام"></label></div></details>
  <p class="small">این محاسبه برای اجرای مدل روی یک کارت است؛ حافظه آموزش و fine-tuning را پوشش نمی‌دهد.</p><p id="gpuMatchError" class="form-error" role="alert" hidden></p><p id="gpuMatchStatus" class="gpu-match-status" role="status" aria-live="polite" hidden></p><button type="submit" class="button primary">محاسبه جدید ${icon('arrow')}</button></form>
  <section id="gpuMatchResults" class="gpu-planner-results" aria-label="نتیجه انتخاب GPU"><div class="workspace-panel empty-state"><h2>اندازه مدل را وارد کنید</h2><p>بعد از محاسبه، سهم هر بخش از حافظه و پیشنهادهای اجاره را اینجا می‌بینید.</p></div></section></div>`;
  document.title = 'GPU برای اجرای مدل | torobai';
  if (guessed) runGPUMatch({ initial: true });
}
function readGPUMatch(form) {
  const v = {};
  for (const [key, max, min, integer] of [
    ['parameters', 2000, 0.001, false],
    ['context', 2000000, 1, true],
    ['concurrent', 1024, 1, true],
    ['kv', 100, 0, false],
    ['overhead', 1000, 0, false],
    ['margin', 100, 0, false],
    ['disk', 1e6, 0, false],
    ['traffic', 1e6, 0, false]
  ]) {
    v[key] = parseNumber(marketInput(form, key), max, integer, min);
    if (v[key] == null)
      throw Error(
        'مقدار «' +
          form.querySelector(`[name=${key}]`).closest('label').textContent.trim() +
          '» را بررسی کنید.'
      );
  }
  v.bits = Number(marketInput(form, 'bits'));
  v.rental = marketInput(form, 'rental');
  v.model = marketInput(form, 'model');
  v.ssh = form.querySelector('[name=ssh]').checked === true;
  if (![4, 8, 16].includes(v.bits) || !Object.hasOwn(presetNames, v.rental))
    throw Error('دقت وزن‌ها و مدت اجاره را انتخاب کنید.');
  for (const rate of ['disk_rate', 'traffic_rate']) {
    const raw = marketInput(form, rate);
    v[rate] = raw === '' ? null : parseNumber(raw, 1e12, false);
    if (raw !== '' && v[rate] == null) throw Error('نرخ هزینه جانبی معتبر نیست.');
  }
  return v;
}
function calculateGPUMatch(v) {
  const memory = gpuMemoryParts(v),
    extras = [],
    missing = [];
  for (const [key, label] of [
    ['disk', 'دیسک'],
    ['traffic', 'انتقال داده']
  ]) {
    if (v[key] === 0) continue;
    if (v[key + '_rate'] == null) {
      missing.push(label);
      continue;
    }
    extras.push({
      label,
      amount: HB.evaluatePlan(
        { terms: [{ rate: String(v[key + '_rate']), fields: ['quantity'], denominator: 1 }] },
        { quantity: v[key] }
      ).estimate_toman
    });
  }
  const rows = products
    .filter((p) => p.kind === 'gpu' && Number.isFinite(p.vram) && p.vram >= memory.total)
    .flatMap((p) =>
      (catalog.estimates[p.id]?.[v.rental]?.offers || [])
        .filter(
          (o) =>
            o.estimate_toman != null &&
            o.availability !== 'unavailable' &&
            (!v.ssh || o.ssh === true)
        )
        .map((o) => ({
          p,
          o,
          total: HB.evaluatePlan(
            {
              terms: [
                { rate: '1', fields: ['rent'], denominator: 1 },
                ...extras.map((x) => ({ rate: String(x.amount), fields: [], denominator: 1 }))
              ]
            },
            { rent: o.estimate_toman }
          ).estimate_toman
        }))
    )
    .sort((a, b) => a.total - b.total);
  return { memory, extras, missing, rows };
}
function renderGPUMatchResult(result, v) {
  const { memory: m, extras, missing, rows } = result;
  const parts = [
    ['weights', 'وزن‌ها'],
    ['kv', 'حافظه درخواست‌ها'],
    ['overhead', 'موتور اجرا'],
    ['margin', 'حاشیه اطمینان']
  ];
  $('gpuMatchResults').innerHTML =
    `<div class="workspace-panel gpu-memory-card"><div class="section-heading"><div><span class="section-kicker">برآورد حافظه · یک GPU</span><h2 id="gpuResultHeading" tabindex="-1">${rows.length ? 'پیشنهادهای متناسب با محاسبه شما' : 'ظرفیت لازم برای این اجرا'}</h2></div><span class="tag">${fa(v.bits)} بیت · ${fa(v.concurrent)} درخواست هم‌زمان</span></div><div class="gpu-memory-numbers"><div><span>حافظه برآوردی برای هر کارت</span><strong>${num(m.total, 1)} <small>GiB</small></strong></div><div><span>پیشنهاد قابل بررسی</span><strong>${num(rows.length)} <small>پیشنهاد</small></strong></div></div><div class="memory-stack" aria-hidden="true">${parts.map(([key], i) => `<span style="width:${(m[key] / m.total) * 100}%;--bench-color:${benchmarkColors[i]}"></span>`).join('')}</div><dl class="memory-breakdown">${parts.map(([key, label], i) => `<div><dt><i style="--bench-color:${benchmarkColors[i]}"></i>${label}</dt><dd>${num(m[key], 1)} GiB</dd></div>`).join('')}</dl><p class="small">این برآورد تضمین اجرا نیست. حافظه اسمی کارت، حافظه آزاد و پشتیبانی موتور اجرا را بررسی کنید؛ حافظه چند کارت جمع نشده است.</p></div>
  ${missing.length ? `<p class="workspace-note">نرخ ${esc(missing.join(' و '))} مشخص نیست؛ قیمت‌ها فقط جمع هزینه‌های مشخص هستند.</p>` : ''}
  <div class="section-heading gpu-result-heading"><h2>اجاره ${fa(catalog.presets.hour[v.rental].hours)} ساعته</h2><span class="small">به ترتیب کمترین هزینه · پیش از مالیات</span></div>
  <div class="gpu-match-list">${rows.map(({ p, o, total }, i) => `<article class="gpu-match-row ${i === 0 ? 'gpu-best-match' : ''}"><div class="gpu-match-identity">${logo(p)}<div>${i === 0 ? '<span class="gpu-best-label">کمترین هزینه با این تنظیمات</span>' : ''}<h3><a href="${href(p, { provider: o.seller_id, ssh: v.ssh, rental: v.rental })}" dir="auto">${esc(p.title)}</a></h3><p>${esc(o.seller)} · ${fa(p.vram)} GiB اسمی / کارت</p><span class="gpu-room">${fa(p.vram - m.total, 1)} GiB ظرفیت بیشتر از برآورد ${o.ssh ? '· SSH' : ''}</span></div></div><div class="gpu-match-cost"><strong>${money(total)}</strong><small>اجاره ${money(o.estimate_toman)}${extras.map((x) => ' · ' + x.label + ' ' + money(x.amount)).join('')}</small><a class="button ${i === 0 ? 'primary' : 'secondary'}" href="${href(p, { provider: o.seller_id, ssh: v.ssh, rental: v.rental })}">شرایط اجاره ${icon('arrow')}</a></div></article>`).join('') || '<div class="workspace-panel empty-state"><h3>پیشنهاد متناسب پیدا نشد</h3><p>طول متن، تعداد درخواست هم‌زمان یا دقت وزن‌ها را کاهش دهید. اگر SSH ضروری نیست، آن شرط را بردارید.</p><button class="button secondary" data-gpu-edit>تغییر تنظیمات</button></div>'}</div><p class="small">هزینه مجوز مدل جداست. سرعت اجرا به مدل، موتور، دقت و طول متن وابسته است. <a href="#benchmarks?group=gpu-specs">مقایسه GPUها</a></p>`;
}
function scrollToGPUResult() {
  const target = $('gpuResultHeading');
  if (!target) return;
  const header = document.querySelector('.site-header');
  const offset =
    header && window.getComputedStyle?.(header).position === 'sticky'
      ? header.getBoundingClientRect().height
      : 0;
  const top = Math.max(0, target.getBoundingClientRect().top + (window.scrollY || 0) - offset - 16);
  target.focus({ preventScroll: true });
  window.scrollTo({
    left: window.scrollX || 0,
    top,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  });
}
async function runGPUMatch({ initial = false } = {}) {
  const form = $('gpuMatchForm'),
    result = $('gpuMatchResults');
  if (!form || !result) return;
  let v;
  try {
    v = readGPUMatch(form);
  } catch (error) {
    cancelGPUMatch();
    marketError('gpuMatchError', error.message);
    return;
  }
  const key = marketRevision + ':' + JSON.stringify(v);
  if (gpuMatchPending?.key === key) return;
  cancelGPUMatch();
  const seq = gpuMatchSequence,
    revision = marketRevision;
  $('gpuMatchError').hidden = true;
  const status = $('gpuMatchStatus'),
    button = form.querySelector('button[type=submit]');
  const cached = gpuMatchCache.get(key);
  const valid = () =>
    seq === gpuMatchSequence &&
    form === $('gpuMatchForm') &&
    revision === marketRevision &&
    state.path === 'gpu-match';
  if (!cached && !initial && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gpuMatchPending = { key, form, result };
    result.setAttribute('aria-busy', 'true');
    button.disabled = true;
    button.innerHTML = '<span class="loader" aria-hidden="true"></span> در حال محاسبه…';
    status.hidden = false;
    status.textContent = 'در حال محاسبه حافظه و هزینه پیشنهادها…';
    await presentationPause(650);
  }
  if (!valid()) return;
  try {
    const calculated = cached || calculateGPUMatch(v);
    if (!cached) {
      gpuMatchCache.set(key, calculated);
      if (gpuMatchCache.size > 64) gpuMatchCache.delete(gpuMatchCache.keys().next().value);
    }
    renderGPUMatchResult(calculated, v);
    status.textContent = 'محاسبه آماده است.';
    status.hidden = initial;
    if (!initial) scrollToGPUResult();
  } catch (error) {
    marketError('gpuMatchError', 'محاسبه انجام نشد. تنظیمات را بررسی و دوباره تلاش کنید.');
  } finally {
    if (valid()) {
      button.disabled = false;
      button.innerHTML = 'محاسبه جدید ' + icon('arrow');
      result.removeAttribute('aria-busy');
      gpuMatchPending = null;
    }
  }
}
document.addEventListener('input', (e) => {
  if (e.target.closest('#gpuMatchForm')) {
    cancelGPUMatch();
    const status = $('gpuMatchStatus');
    status.hidden = false;
    status.textContent = 'تنظیمات تغییر کرده؛ برای دیدن نتیجه تازه محاسبه کنید.';
  }
});
document.addEventListener('change', (e) => {
  if (!e.target.closest('#gpuMatchForm')) return;
  cancelGPUMatch();
  if (e.target.name === 'model')
    $('gpuMatchForm').querySelector('[name=parameters]').value = gpuParameterGuess(
      products.find((p) => p.id === e.target.value)
    );
  const status = $('gpuMatchStatus');
  status.hidden = false;
  status.textContent = 'تنظیمات تغییر کرده؛ برای دیدن نتیجه تازه محاسبه کنید.';
});
document.addEventListener('click', (e) => {
  const preset = e.target.closest('[data-gpu-preset]');
  if (preset) {
    cancelGPUMatch();
    const f = $('gpuMatchForm');
    const [context, concurrent] = { light: [4096, 1], long: [32768, 1], parallel: [4096, 8] }[
      preset.dataset.gpuPreset
    ];
    f.querySelector('[name=context]').value = fa(context);
    f.querySelector('[name=concurrent]').value = fa(concurrent);
    $('gpuMatchStatus').hidden = false;
    $('gpuMatchStatus').textContent = 'حجم کار تنظیم شد؛ برای دیدن نتیجه، محاسبه کنید.';
  }
  if (e.target.closest('[data-gpu-edit]')) {
    const field = $('gpuMatchForm').querySelector('[name=parameters]');
    field.focus({ preventScroll: true });
    field.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'center'
    });
  }
});
