# v0.24 verification — 11 October 2026

- Python: 64 tests passed. Node: 35 test entries passed, including 4,140 exact
  Python/JavaScript pricing cases and all existing navigation/GPU regressions.
- Benchmark coverage: all 62 product profiles, plus 123 source-group/view states.
  Tests cover every model, proper unknowns, incompatible-task rejection, source
  links, protocol-aware highlights, local picker staging/cancel/limits/search,
  full-table/common-only modes, CSV provenance, consumption and rental parity.
- Desktop/mobile CSS uses one aligned comparison sheet with a sticky row-label
  column, a custom scrollbar and constrained horizontal overflow. Controls use
  shared motion and reduced-motion rules. These were structurally inspected.
- Browser control was unavailable. No pixel, real animation or Windows browser
  execution claim is made. No preview server or alternate browser was used.
- Catalog products, API offers, weight offers, Batch tariffs and GPU pricing are
  byte-for-byte unchanged from v0.23. Only benchmark data and presentation changed.

Earlier release verification follows as history.

# v0.23 verification — 11 October 2026

- Python: 62 tests passed. Node: 34 test entries passed, including the existing
  4,140 Python/JavaScript exact-pricing conformance cases.
- New exported-app checks: 10 benchmark groups, 102 metric/view combinations;
  lower-is-better ordering, unknown results, user weighting, API consumption,
  rental period parity, malformed URLs, selection, provenance CSV and product tabs.
- GPU checks: memory arithmetic, per-card eligible offers, new calculation busy
  state, retained results, coalesced submissions, canonical Persian-number cache
  hits, edit/navigation cancellation, catalog-revision invalidation, empty results,
  missing charges, and reduced-motion/normal scroll commands.
- Existing checks cover 62 product routes, 82 portable scenarios, navigation,
  disclosure motion, supplier/import flows, quotes and request/watch persistence.
- Final focused tests were rerun after keyboard-focus and weighting corrections.
  The single pre-existing Starlette/httpx deprecation warning remains.
- Export embeds all JavaScript, CSS, fonts and image assets. No startup resource
  fetch is required by the standalone HTML. Base product/offer/tariff data remain
  unchanged; benchmark snapshots are an additional catalog member.

These are DOM/event, data and scheduling checks. No supported browser rendering
was available, so desktop/mobile pixels, actual frame smoothness and Windows
file-origin operation were not visually verified. No alternative browser path,
preview server or browser installation was used. Published scores are source
snapshots, not newly executed evaluations. Scenario values are explicitly marked
and never presented as independent measurements. GPU fit remains an editable
inference estimate, not runtime compatibility or a training-memory guarantee.

Commands:

```bash
python -m pytest -q
python scripts/export_catalog.py
node --test tests/*.cjs
```

---

# v0.22 verification — 11 October 2026

- app.js and marketplace.js syntax checks passed; standalone export rebuilt.
- Six focused Node entries passed: three structural CSS tests and portable,
  marketplace and navigation runners.
- Every applicable product route asserts the API badge contains its number once
  and its aria-label contains plain text. The active-filter badge is checked with
  two selected capabilities. This reproduces the malformed-attribute regression
  shown in the supplied screenshot without relying on browser pixels.
- Existing 62 product routes/82 scenarios and 19 navigation/tab scenarios pass.
  Catalog prices, offer counts, purchase paths and comparison rules are unchanged.
- Selection rules are scoped to controls; editable fields explicitly allow text
  selection. No global selection handler, preventDefault or body-wide ban added.

The screenshot was viewed; rendered browser appearance and real pointer/drag text
selection were not tested because supported browser control was unavailable.
DOM and CSS parsing checks are not browser QA. Earlier validation follows.

```bash
node --check app/static/app.js
node --check app/static/marketplace.js
python scripts/export_catalog.py
node --test tests/test_portable.cjs tests/test_marketplace_v018.cjs tests/test_layout.cjs tests/test_navigation_update.cjs
```

---

# v0.21 verification — 11 October 2026

- Four export tests, app.js syntax and ten focused Node entries passed.
- Navigation now covers 19 scenarios, including one visible product panel,
  selected-state/ARIA mapping, RTL arrows, Home/End, focus without scrolling,
  same-tab no-op, animation cancellation, preserved form values, repricing while
  another panel is selected, API/weight compatibility and reduced motion.
- All 62 portable product routes retain 82 previous scenarios and now assert one
  selected tab, one initially visible price panel and valid tab/panel references.
- Existing usage (9), cache (10), served UI (3), motion lifecycle, CSS structure
  and supplier/admin integration checks passed. No pricing data/rules changed.
- The screenshot was inspected. It showed a permanently highlighted first link
  and several sections displayed together. Controls now own exclusive panels.

Checks use DOM, scheduling and simulated scroll/animation calls. Browser rendering
and real Windows file-origin animation were not available for inspection. No
preview server or alternate browser-control workflow was started.

```bash
python -m pytest -q tests/test_export.py
node --check app/static/app.js
python scripts/export_catalog.py
node --test tests/test_navigation_update.cjs tests/test_portable.cjs tests/test_usage_update.cjs tests/test_motion.cjs tests/test_live_ui.cjs tests/test_estimate_cache.cjs tests/test_marketplace_v018.cjs tests/test_layout.cjs
```

---

# v0.20 verification — 11 October 2026

## Checks

- Four Python export tests passed; motion.js syntax checked.
- Ten focused Node entries passed: motion, three CSS structure tests, served UI,
  estimate/cache, navigation, consumption, portable UI and marketplace integration.
- The revised motion regression schedules animation frames explicitly, disallows
  native details height measurements, checks content wrapping retains input nodes
  and edited values, and checks the native slot is not closed during exit.
- It covers mid-animation and pre-frame reversal, stale callbacks, natural-height
  restoration, popup reveal, Escape/focus, reduced motion while a frame is pending,
  absent/throwing WAAPI, dialog reversal, mobile height-only resize and width resize.
- Portable UI opens/closes the generated disclosures across 62 product routes,
  retains live controls, and passes the existing 82 scenarios. Dialog motion is
  tested separately; portable flow tests retain immediate native dialog states.
- Existing cache (10), navigation (14), usage (9), served UI (3) scenarios pass,
  alongside supplier/admin/import/watch flows. No pricing or data changes.
- The self-contained export includes all scripts, styles, font bytes and assets.

The harness initially needed WAAPI-aware completion for the menu and separate
native dialog handling. Those test harness corrections were made; the complete
focused suite was rerun against the final exported HTML and passed.

These are DOM/event/scheduling checks using simulated geometry and Web Animations,
not browser rendering. The previous user-reported visual failure was not directly
reproduced on their device. No supported browser-control capability was available;
no preview server, alternate browser-control path or browser installation was used.
Real Windows file-origin motion, frame rate and desktop/mobile appearance remain
unverified. Reduced-motion preferences intentionally skip the animation.

Commands:

```bash
python -m pytest -q tests/test_export.py
node --check app/static/motion.js
python scripts/export_catalog.py
node --test tests/test_motion.cjs tests/test_layout.cjs tests/test_live_ui.cjs tests/test_estimate_cache.cjs tests/test_navigation_update.cjs tests/test_usage_update.cjs tests/test_portable.cjs tests/test_marketplace_v018.cjs
```

---

# v0.19 verification — 11 October 2026

## Passed for this change

- Four export tests; syntax checks for app.js, marketplace.js and motion.js.
- Ten Node test entries: three structural CSS checks plus seven runners covering
  motion, served UI, estimate/cache, navigation, consumption, portable application
  and supplier/admin integration.
- New animation lifecycle: expansion and collapse, reversal from current height,
  stale callback suppression, natural-height restoration, popover fade without
  toolbar height changes, outside click, Escape/focus, reduced motion, missing
  animation API, dialog open/close reversal and navigation/resize cleanup.
- Portable UI: 62 product routes and 82 existing scenarios.
- Existing navigation: 14 scenarios; usage: nine; cache: ten; served UI: three.
- Existing v0.18 supplier, pricing import, watches/alerts and management flows.
- Standalone export embeds motion.js alongside existing scripts, styles, fonts
  and logo assets. Base pricing and catalog data are unchanged.

Commands after export:

```bash
python -m pytest -q tests/test_export.py
node --check app/static/app.js
node --check app/static/marketplace.js
node --check app/static/motion.js
node --test tests/test_motion.cjs tests/test_layout.cjs tests/test_live_ui.cjs tests/test_estimate_cache.cjs tests/test_navigation_update.cjs tests/test_usage_update.cjs tests/test_portable.cjs tests/test_marketplace_v018.cjs
```

The supplied screenshot was inspected to identify the oversized access cards,
breadcrumb padding and full-width filter. Lifecycle tests use a controlled Web
Animations API harness: they verify frame endpoints, events and final states,
not pixels or actual animation smoothness. No browser-rendered desktop/mobile
inspection or Windows file-origin check was available. No preview server or
alternative browser-control path was used. Previous version checks follow below.

---

# v0.18 verification — 11 October 2026

## Passed

- Python: 60 tests, including GPU tariff-template parity, decimal tax rounding,
  unknown capability handling and every API billing-unit template. The existing
  Starlette/httpx deprecation warning remains; it is not a test failure.
- JavaScript syntax: app.js, ui.js and marketplace.js.
- Node: 32 passing test entries. This includes 21 pure UI tests, three structural
  CSS tests and eight integration/conformance runners (each has multiple scenarios).
- Exact API pricing parity: 4,140 Python/JavaScript cases.
- Portable catalog: 62 product routes and 82 behavior scenarios; no startup fetch.
- Navigation: 14 scenarios; consumption updates: nine; served UI: three.
- Served quote/cache: ten scenarios, including late network results after catalog
  revision, coalescing, failure recovery and replacement of a pending calculation.
- v0.17 seller profiles, scoped watches, reports and file-origin history tests.
- v0.18 integration: same-offer capability requirements, grouped search/keyboard,
  provider comparison and differences toggle, bills, supplier draft/review/approval,
  preservation of approved offers during edits and API plus weights on one model.
- CSV/JSON validation, monetary preview, atomic storage failure, availability
  transitions, partial API tariffs and Python-compiled GPU tariff changes.
- Saved history/exports, price target/restock notifications, unsupported browser
  notification handling, read status, GPU matching, task-matched sample outputs,
  escaped input, new model approval, report replies, exact merge and restoration.
- State rebuild retains approved records and tariff edits. Unknown new-offer
  reliability is displayed as unrecorded; no performance observations are invented.
- Export embeds CSS, scripts, 20 assets and licensed font bytes. The source
  catalog datasets are unchanged; edits only modify the effective local catalog.

## Commands

```bash
python -m pytest -q
python scripts/export_catalog.py
node --check app/static/app.js
node --check app/static/ui.js
node --check app/static/marketplace.js
node --test tests/*.cjs
```

Node DOM checks use Linkedom and structural CSS checks use CSSOM. These and the
formatter were already installed in the validation environment. Set
TOROBAI_TEST_PYTHON when the default Python lacks requirements.txt dependencies.

## Limits

DOM/event checks do not render pixels. Desktop/mobile browser appearance, native
notification delivery, audio/image playback and real Windows file-origin behavior
were not inspected. No browser or preview server was installed to bypass the
environment's browser-control restrictions. Supplier sites and current tariffs
were not exercised. Existing reference/fictional provenance stays unchanged.

Supplier/admin work and notifications are local to the browser. No shared
authentication, remote publication, email/SMS or closed-page processing exists.
Samples support recorded outputs; included examples are explicitly format examples,
not actual model executions or independent benchmark data. GPU matching is a
capacity estimate; rental repricing retains the three existing preset workloads.
Missing cache/tool/network charges remain unknown, and no discount is fabricated.

---

# v0.17 verification — 11 October 2026

## Passed

- Python: 56 tests; existing Starlette/httpx deprecation warning only.
- JavaScript syntax checks for app.js and ui.js.
- Node test run: 31 passing test entries, zero failures. This includes 21 pure
  UI checks, three structural CSS checks and the seven integration/conformance
  runners listed below (a runner includes multiple scenarios).
- Portable application: all 62 product routes and 82 behavior scenarios.
- Navigation: 14 scenarios covering cached routes, history, focus and scroll commands.
- Usage update: nine scenarios covering in-place state, cancellation and recovery.
- Served quote/cache path: nine scenarios with real Python fixtures.
- Served UI: three scenarios using the existing catalog and calculation fixtures.
- Pricing conformance: 4,140 exact Python/JavaScript cases.
- New marketplace runner: seller/profile search, provider and acquisition scope,
  API plus weights, escaped input, fixed-workload Batch watch, version changes,
  removed products, GPU rental presets, exports, report editing/deletion,
  malformed storage, blocked storage and guarded file-origin navigation.
- Catalog data files are unchanged from v0.16. No new monetary tariff rules.
- Export embeds CSS, scripts, logo assets and licensed font bytes. No startup
  fetch is allowed by the portable DOM harness.

## Commands

```bash
python -m pytest -q
python scripts/export_catalog.py
node --check app/static/app.js
node --check app/static/ui.js
node --test tests/test_ui.cjs tests/test_layout.cjs tests/test_navigation_update.cjs tests/test_usage_update.cjs tests/test_estimate_cache.cjs tests/test_portable.cjs tests/test_pricing_conformance.cjs tests/test_live_ui.cjs tests/test_marketplace.cjs
```

Node DOM tests require Linkedom; structural CSS tests require CSSOM. Set
TOROBAI_TEST_PYTHON to the environment's Python executable when the shell's default
Python does not include requirements.txt. These dependencies were already present
in the validation environment; no browser or server was installed for this check.

## Limits

These checks execute DOM and events; they do not render browser pixels. Desktop
and mobile visual appearance, animation and a real Windows file-origin browser
were not inspected. Existing browser-control restrictions were respected.
External supplier availability, checkout and current tariffs were not exercised.

Watchlists and reports are local to the browser, with explicit export and storage
failure handling. There is no remote support submission, notification delivery,
account sync or complete market-price history. GPU watches retain one of three
bundled presets; an arbitrary server-side rental quote is not watchable yet.
Illustrative uptime remains separate from observed data. No new verification,
reviews, guarantee or real-time monitoring claims were added.

---

# v0.16 verification — 11 October 2026

Current run: 14 navigation/scroll scenarios, 9 in-place usage scenarios,
62 product routes and 82 portable DOM scenarios passed. Pagination checks cover
smooth first-card targeting, sticky/static header offsets, reduced motion,
re-selection and separation from filter/page-size resets. Data, pricing and CSS
are byte-identical to v0.15. The 9 served-cache and 3 served-page checks are
retained from v0.15; Python/helpers/pricing conformance from v0.12; CSS structural
checks from v0.14. These unchanged layers were not rerun.


- 56 Python tests passed, including ordinary prices, Batch exclusion, independent rates, long-context branches, validation and export.
- 21 JavaScript helper tests and 3 existing CSS structural checks passed.
- The actual portable HTML executed through 62 product routes and 82 grouped DOM scenarios, including pagination, no text fallbacks in seller stacks, custom consumption, Batch, snapshots and publisher fields.
- Served-page DOM checks passed in 3 scenarios using real Python fixtures.
- 4,140 API quote cases matched Python and JavaScript exactly, including exclusions, fractional workloads, zero, maximum inputs and both execution modes.
- 186 inherited preset records / 468 offer calculations matched v0.11 in amount, funding and exclusion reason. All inherited JSON data files are byte-identical. Batch terms are a new separate fixture.
- Portable startup and custom API calculations make no network calls. Assets and fonts are embedded. No literal price HTML is visible in DOM checks.
- The archive is checked for integrity and contains the matching portable HTML.

These are programmatic, DOM and stylesheet checks, not browser viewport or pixel tests. Browser rendering, keyboard/touch behavior, file-origin clipboard/storage behavior on Windows, external seller APIs and actual inference-job execution were not tested. The server remains read-only except for stateless quote calculations; local requests/drafts do not represent delivered messages.

See `evidence/v012-regression.json` for inherited price preservation and `REVIEW_V012.fa.md` for the product changes.
