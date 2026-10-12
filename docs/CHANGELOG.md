# Deployment review fixes — 12 October 2026

Docker normalizes root-owned application permissions so a private checkout does
not break the non-root runtime. The container check serves an asset copied from
a restricted directory and file. The server runbook confines its private umask,
filters structured requests from Caddy runtime logs, fails acceptance on incorrect
Origin status codes and preserves the accepted release separately from a candidate
for retry and rollback.

# Production operations guide — 12 October 2026

DEPLOYMENT.md is the common runbook for release builds, single-host Docker
deployment, private configuration, HTTPS proxy trust, unpaid acceptance checks,
updates, rollback, monitoring and recovery. It distinguishes server backups from
browser-local records and Pages publication from full-service deployment.
AGENTS.md, the setup guide and README point to that operational reference.
Runtime code, container configuration and CI behavior are unchanged.

# Shared secure development guide — 12 October 2026

AGENTS.md routes security-relevant changes to docs/SECURE_CODING.md. Claude Code
reaches the same rules through its existing AGENTS.md import. The guide covers
HTTP validation, browser imports and rendering, chatbot authority and cost,
catalog integrity, secrets, Docker and CI, with checks tied to existing files.
The setup guide includes a fresh-session check for this instruction path.
Application behavior and deployment configuration are unchanged.

# Docker runtime — 12 October 2026

The full FastAPI application runs with Docker Compose. The image pins Python
and runtime dependencies, runs without root and excludes env files and development
tools. Compose adds a read-only filesystem, a local host binding, health checks,
rotating logs and graceful shutdown. Provider credentials are supplied at runtime.
CI builds and exercises the container before allowing Pages publication.

# Complete implementation rules — 12 October 2026

AGENTS.md now makes the smallest-complete-change rules explicit: an ordered
reuse decision, caller tracing before bug fixes, no new dependency for a few
lines, preserved validation and error handling, and a meaningful check for new
non-trivial logic. The same guide integrates readable code, one-line rationale
comments and natural writing for readers without the original conversation.
Product contracts, chatbot requirements and application behavior are unchanged.

# Unified development guide — 12 October 2026

AGENTS.md now integrates scope, implementation, writing and verification into one
guide. It adds practical standards for readable code, purposeful comments and
clear product copy. Policy attribution, conversational context and the separate
Ponytail preamble are removed from active instructions; their useful principles
are expressed directly. Related setup and chatbot references follow the same guide.

# Development instructions — 12 October 2026

The root AGENTS.md now starts with the complete, unchanged Ponytail policy and
contains current working rules, code ownership and focused checks. Detailed
behavior is organized in PRODUCT_CONTRACTS.md; chatbot/AGENTS.md adds only local
requirements. CLAUDE.md continues to import the shared root file.

Superseded pagination delays, preserved page-only scroll, weighted benchmark
scores and the old weight-tab restriction are removed from active instructions.
Historical design and architecture records remain explicitly labeled. The setup
guide includes a clean-session instruction check; that client check was not run
as part of this documentation change. Application behavior and HTML are unchanged.

# torobai v0.26

The selection guide now uses compact conversation bubbles, a new SVG identity,
small product rows and separate animated settings. Previous messages and links
remain readable; opening settings does not add filler to the conversation.
See `docs/REVIEW_V026.md` and `chatbot/README.md` for behavior and validation.

# torobai v0.25

The Persian selection guide is in [`chatbot/`](../chatbot/README.md). Set
`OPENROUTER_API_KEY` on the server and run the existing FastAPI application.
`OPENROUTER_MODEL` defaults to `openai/gpt-4.1-mini`. No new runtime dependency.
The portable HTML supports guided choices without a key; free text uses OpenRouter
through the served application. Read chatbot/README.md for setup and test boundaries.

# torobai — Iran, v0.24

torobai is a Persian-language catalog for models, API offers and GPU rental.
The default route shows all 53 model entries. Persian-specialized models are an
optional, named category; they are not the site's brand or default landing page.
Individuals and organizations can offer API access, model-weight licenses or both.

## v0.24 benchmark coverage and comparison redesign

- Select models directly by task and name. Compare 1–4 models in one compact
  sheet with exact scores, inline bars, consumption cost and provider links.
  Full-table and cost/performance views are available without duplicate cards.
- All 53 models have an evaluation profile: 40 have published numerical results,
  10 fictional private listings have declared scenario fixtures, and 3 have a
  documented evidence gap (Whisper API, TTS-1, Hezar CRNN v2). Nine GPU entries
  are also covered by reference specifications, scenario or explicit gap status.
- 41 source/protocol groups preserve actual versions, task-specific metrics and
  sources. Common-only filtering does not merge different benchmark variants.
  Different publishers can share a row without being declared a controlled rank.
- Search understands Persian numerals; selection drafts commit once. Comparison
  links, source CSV, Batch mode, usage and GPU rental costs remain available.
- See `docs/BENCHMARK_COVERAGE.md` for every product and `docs/PLAN_V024.md` for
  design and pre-implementation risks. Earlier release notes follow for history.

## v0.23 performance and GPU planning

- `#benchmarks` compares up to four selections in 10 task/protocol groups, using
  metric bars, a performance/cost scatterplot, a matrix and optional user-weighted
  decision scores. Consumption, Batch mode and GPU rental periods use existing
  exact tariff plans. Links retain the comparison; CSV includes provenance.
- Published Google, Qwen and DeepSeek results are separate from Persian and GPU
  execution scenarios. Seven GPU variants have reference specifications; missing
  fields stay unavailable. See `docs/PLAN_V023.md` for research and risks.
- Product pages have a Performance tab alongside seller prices and reliability.
- GPU planning shows per-card weights/KV/runtime/headroom and concurrent-request
  assumptions. New calculations show feedback and smoothly focus the result;
  cache hits are immediate. Edits and navigation cancel stale work.
- `app/static/performance.js` and `app/data/benchmarks.json` are included in the
  self-contained HTML; no external chart, font or data request is required.

## v0.22 control labels

Fixed malformed API-offer and active-filter badges: accessible labels now use
plain numbers rather than HTML-producing number markup. Action controls, tabs,
navigation and disclosure summaries do not select text during repeated clicks.
Ordinary content and editable form text remain selectable.

## v0.21 exclusive product sections

The product section bar now switches between price offers, uptime, specifications
and usage comparison. Only the selected panel is visible. Prices are the default;
the cheapest-offer overview stays prominent. Hidden panels retain their form
state and switch without requests, loading or forced scrolling. Keyboard navigation
follows RTL order. Weight access offers only the relevant file/price and specs tabs.

## v0.20 disclosure animation repair

- Content expands inside a clipped wrapper, measured after native opening on the
  next animation frame. Native closing waits for the exit to finish. Repeated
  clicks reverse from the current height without rebuilding controls.
- Popovers use a downward reveal; mobile viewport height changes no longer cut
  animations short. Motion uses 340 ms for opening and 280 ms for closing, with
  reduced-motion preferences respected. Compact v0.19 layout remains.
- Regression checks cover frame cancellation, forms, all product disclosures,
  navigation and existing consumption behavior. Browser rendering was unavailable;
  see docs/REVIEW_V020.fa.md and docs/VALIDATION.md for the verification boundary.

## v0.19 compact model controls and motion

- API/weight access uses a compact segmented toolbar. The capability filter opens
  a small anchored panel, with an applied-count badge and a responsive mobile fit.
  The breadcrumb has no inherited oversized padding. Prices begin closer to it.
- All native disclosure sections share interruptible height transitions, while
  popovers and dialogs use short opacity/position transitions in both directions.
  Escape, outside-click dismissal and reduced motion are supported. No artificial
  loading was added; existing cached data and pagination behavior remain intact.
- `app/static/motion.js` is embedded in the standalone HTML and loaded in served
  mode. `tests/test_motion.cjs` verifies lifecycle and rapid reversal without
  claiming browser rendering. See `docs/REVIEW_V019.fa.md`.

## v0.18 buyer and publishing workspace

- Search suggestions group models, suppliers and tasks. API requirements (JSON,
  tools, streaming, no retention) match the same offer, including its quoted cost.
- Compare up to three suppliers of one model, with differences-only view. Bills
  separate input/output consumption, tax and the minimum initial account funding.
  Batch remains independently priced; unknown cache/tool fees are disclosed.
- `#studio` creates API or weight offers on an existing model. Drafts, revision,
  review, rejection and approval work in a persistent browser-local workspace.
  Editing a published offer retains its approved terms until the revision passes.
- `#manage` reviews offers, new model requests and discrepancy reports. It previews
  and imports CSV/JSON tariff changes, flags stale records and merges exact
  duplicate model/version identities with a restore action. API and weight
  licenses stay separate. GPU imports preserve their existing rental billing unit.
- `#samples` compares registered outputs for the same text, audio or document.
  Source and execution conditions stay visible. Included examples illustrate
  output formats; they are not executions or independent benchmark results.
- `#gpu-match` estimates per-card memory from adjustable assumptions and displays
  rental offers, with optional entered disk/transfer rates. It is not a hardware
  compatibility guarantee or an inference runner.
- Price watches retain the selected usage and build history from recorded changes.
  Target-price, restock and version notifications appear in `#notifications`;
  browser notifications require explicit permission and a supported secure origin.
  No closed-page background delivery, email/SMS, account sync or shared admin login.
- Python owns tariff rules and rental rounding. The portable file evaluates
  compiled terms exactly. Local edits invalidate quotes and reject late stale
  responses. Base catalog prices, cached navigation and pagination are preserved.

Run `python -m pytest -q`, export, then `node --test tests/*.cjs` with Linkedom and
CSSOM available. See `docs/REVIEW_V018.fa.md` and `docs/VALIDATION.md`.
For the portable application, open `dist/torobai.html` directly. The full project
also runs through the FastAPI setup below; workspace changes stay browser-local
in both modes. There are no production identity or multi-user write endpoints.

## v0.17 comparison and seller referral

- Searchable seller directory and #providers/:id profiles, including terms,
  service types, product search and distinct API/weight-license prices per model.
- Product offers link to the supplier profile, show dated tariff evidence when
  recorded and provide a clear supplier purchase action. No payment or API gateway.
- Browser-local price watch retains version, workload, request mode and provider
  filters; GPU links retain the selected rental preset. Removed models remain in
  the watchlist, while version changes suspend price-delta comparisons.
- Per-offer discrepancy reports are editable and exportable as readable text.
  Reports are not submitted remotely; watchlists do not send external alerts.
- Compact product identity, responsive seller rows and collapsible mobile terms.
  Default catalog, prices, Batch, uptime squares, cached loading and scrolling stay.
- AGENTS.md and CLAUDE.md document the comparison/referral role for future work.

Check `node tests/test_marketplace.cjs` after export, alongside the existing checks.
See `docs/REVIEW_V017.fa.md` and `docs/VALIDATION.md` for evidence and limitations.

## v0.16 pagination scroll

A page-only change renders ready results immediately, then scrolls smoothly to
the first product card. Account for the actual sticky-header height and focus
the first product link with preventScroll. Reduced motion uses an instant scroll.
Re-selecting the active page does nothing, so it cannot interrupt the animation.
Filters, consumption, categories and page-size changes retain their existing
viewport behavior. The data cache and loading rules from v0.15 are unchanged.
See `docs/REVIEW_V016.fa.md` and `tests/test_navigation_update.cjs`.

## v0.15 ready data displays immediately

The fetched catalog already contains every result page, category and ordinary
preset quote. Switching these views is immediate, including a first visit;
there is no presentation pause or brief spinner flash. Weight offers are also
ready locally. The existing viewport, rail, focus and history contract remains.

Custom estimates share a session cache keyed by product, complete numeric usage
and request mode. Catalog calculations, product offers, presets and charts reuse
successful results. Equivalent parameter order/default instant mode share a key;
Batch, other products and changed usage do not. Concurrent identical remote
requests share one promise; failures are never cached. Custom cache entries are
bounded to 256; bundled presets remain available independently of that bound.

Only genuinely unavailable estimates show a pending state. Applying a new local
catalog workload keeps its 650 ms calculation feedback; repeating it or restoring
ready defaults is immediate. Initial server loading lasts only until the catalog
arrives; the portable file has its catalog embedded and needs no startup pause.
See `docs/REVIEW_V015.fa.md` and `tests/test_estimate_cache.cjs`.

## v0.14 in-place browsing (historical delays superseded by v0.15)

Category/access tabs, filters, ordering, page size and pagination use a shared
transition. Keep the previous content visible during the brief loading state;
commit the latest choice and retain the viewport, horizontal rail and keyboard
focus. Same-model API/weight tabs prepare the next offer before replacing it.
New products open at their heading once; late quotes never reset user scrolling.

Catalog transitions take 550 ms and same-model access changes 600 ms; reduced
motion skips these pauses. Newer navigation or consumption edits cancel stale
work. Failed rendering restores the previous screen with usable controls.
History uses guarded pushState and real fragment links remain available for
sharing/new tabs. Restrictive file hosts retain a working screen without falling
back to native hash navigation. Back/forward fragments use the same transition.

Run `node tests/test_navigation_update.cjs` for 15 focused scenarios. These are
DOM/event/scroll-command checks, not browser rendering. See `docs/REVIEW_V014.fa.md`.

## v0.13 in-place consumption updates

Applying or resetting consumption no longer goes through hash routing. The live
form and category rail stay mounted while dependent results update. A 650 ms
loading state uses a stable-width button spinner, a thin result progress line,
busy semantics and temporarily inactive old results. Reduced motion bypasses
the delay and animations. The status area reserves space for feedback.

URL replacement retains shareable settings without navigation, and never falls
back to changing the hash when a file-origin host rejects history changes. The
scroll coordinates at commit are restored, including any scrolling during loading.
Shorter result lists reserve only the bottom space needed to retain that viewport.
New destinations clear that space; same-context browsing recalculates it. Duplicate submissions, edits during calculation,
route changes and failed quotes all release controls or cancel stale results.

Focused check: `node tests/test_usage_update.cjs`. It verifies DOM identity,
loading, scroll commands, cancellation, retry, reset and restrictive file origins;
it is not a real-browser layout test. See `docs/REVIEW_V013.fa.md`.

## v0.12 consumption, Batch and pagination

- Card footer stacks contain actual logo assets only. The count still includes
  every matching provider; unknown brands remain named in full seller listings.
- Every API card leads with the cost of its displayed 30-day workload. Input and
  output rates are shown together from the same selected offer. The catalog has
  editable request count, input/output tokens or the current task's native unit.
  Applied consumption follows sorting, pagination, comparison and product links.
- Arbitrary model/API consumption works offline as well as in FastAPI. Python
  compiles tariff rules, caps and long-context branches into declarative plans;
  the portable evaluator uses exact rational arithmetic and half-up rounding.
  The HTTP path evaluates the same plans with Decimal. No remote call is needed
  in the exported file. GPU portable consumption retains its three presets.
- Batch is an explicit request mode, with separate rates, completion window and
  per-job request cap. Unknown support never falls back to ordinary pricing.
  79 offers have illustrative Batch terms, separate from the existing tariffs.
  This is a comparison and inquiry flow; it does not submit inference jobs.
  Publisher drafts can declare and validate Batch terms; inquiry snapshots and
  text exports retain the quoted mode and effective rates.
- Catalog pages use 20/40/60 results, previous/next links, numbered pages, result
  ranges, and a jump field for long lists. Filtering/sorting applies before slicing
  and returns to page 1. Invalid page links recover to page 1. Page size is retained
  locally where storage is available; all result settings are linkable.

See `docs/REVIEW_V012.fa.md` and `docs/VALIDATION.md` for scope and verification.

## v0.11 full-project review

This revision fixes concrete navigation, comparison, persistence and recovery
issues without changing the catalog or its pricing basis. All data files and
186 complete preset records (468 offer calculations) remain identical to v0.10.

- Provider and SSH filters belong to the product URL. Direct links work without
  visiting a catalog first; unrelated products no longer inherit a hidden filter.
  Filter reset stays visible even when only the featured offer remains. Changing
  an offer filter retains the selected workload. History replacement is guarded
  for restrictive file-origin hosts; the selected offers remain usable.
- API/file switching keeps the model identity and does not let an API host filter
  conceal files available from the original publisher. File access does not wait
  for a successful API cost calculation.
- Comparison recognizes paid weights as downloadable and includes the existing
  Python-calculated common workload. Mixed units are labeled separately. Saved
  APIs and GPUs have an explicit price category and visible removable filters.
- Malformed URLs get a recovery page. Price errors replace loading states and
  offer retry. Unsupported query values cannot leak undefined labels into the UI.
- Offline sharing creates readable product/price text, not a local filesystem URL.
- Partial listing export works at every step. Failed storage never claims durable
  favorites. Requests keep quoted units, prices, use restrictions and workload;
  buyers can review/edit without changing the original terms, or export without
  saving. Malformed saved request records cannot break the export path.
- Decision listing units match the catalog. Numeric parsing rejects malformed
  grouping; the HTTP API no longer treats booleans or numeric strings as amounts.
- Dialog overflow, long identifiers, request actions and mobile filter targets
  have scoped CSS fixes. Brand, home, category rail and daily uptime are preserved.

See `docs/REVIEW_V011.fa.md`, `docs/WALKTHROUGH.fa.md` and `docs/VALIDATION.md`.

## v0.10 service history and dual access (preserved)

Uptime now uses 30 separated daily squares instead of the stretched native meter.
Desktop uses a single row, narrow screens two rows. A dated legend, hover details
and an expandable text history make both the aggregate and the daily values clear.
The daily records are fixed presentation fixtures; their equal-day average matches
each existing aggregate exactly. They cover 11 September–10 October 2026 UTC.

Three fictional hosting companies add 35 API offers. All 13 Persian entries and
four decision models now have multiple hosted API options. The seven paid-weight
models also have an API offered by the same fictional publisher. Public download
links and private weight licenses keep their original product identities and terms.
API consumption, research access and one-time weight purchases stay separate.

The ParsinLU checkpoint retains its noncommercial license. Its two illustrative
API offers are free, research-only and capped at one million characters per month;
the Python engine excludes over-quota workloads. This does not assert commercial
rights or a real hosted deployment. Whisper's gated download/no timestamps and
Hezar's short-text scope remain visible. Fictional hosts use local request/export
flows, with no invented external domain, login or issued API key.

See `docs/REVIEW_V010.fa.md` and `docs/VALIDATION.md`.

## v0.9 home correction (preserved)

The user's latest clarification restores the horizontal category rail and the
complete model/API home. The scrollbar is styled with a thin rounded thumb and a
transparent track; Chromium/WebKit and standard scrollbar declarations are kept
separate so they do not override each other. No category grid replaces the rail.
The header, catalog title, access controls and filters use less vertical space.
Model cards use smaller illustrations and fewer decorations. Wide screens show
five columns; the catalog still adapts to narrower screens. The initial selection
is an editorial mix of existing models, not a popularity or usage claim.

Brand, home links, empty states, search/reset and guide destinations follow the
same general-catalog default. `#fa` remains a deliberate Persian-specialist choice.
All pricing, acquisition, local authoring and request flows are preserved.
See `docs/REVIEW_V09.fa.md` and `docs/VALIDATION.md`.

## Run locally

Python 3.11+ is required. Node 20+ is used only for JavaScript checks.

```bash
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell instead:
# .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000. No npm build, account, model API key or paid call is
required. Run from the project root. Keep the virtual environment active when
running the commands below.

## Working with coding agents

Open this folder in Codex, Claude Code or your editor. `AGENTS.md` is the shared
project contract: buyer → senior developer → product manager review, plain code,
Iranian buying conditions, pricing rules, RTL visuals and completion checks.
`CLAUDE.md` imports it instead of maintaining a conflicting copy. Do not paste
project instructions into global settings. The original supplied developer rules
are preserved in `docs/ORIGINAL_DEVELOPER_RULES.md`.

`.editorconfig`, `.gitignore`, `.prettierrc.json` and VS Code run/test settings are
included. No agent extension, personal skill, credential or global configuration
is installed. VS Code's debug launch requires its Python debugger extension.

## What works

- Complete model/API home, with an optional category of 13 specialist entries across ASR, English/Persian
  translation, TTS, OCR, document extraction, retrieval, classification and chat.
  Overall: 62 products (53 model entries + 9 GPU groups), 156 API/GPU offers,
  7 paid weight-license offers, and 33 models with public weight destinations.
- API/weights filters, person/organization filtering, Persian search, cheapest
  and most-expensive sorting, saved models and three-product comparison.
- One versioned product can have API, weights or both. API ranking still uses
  the same Python-calculated consumption. Weight prices are one-time license
  fees and never enter API arithmetic. A free public download retains its license.
- Provider-first product pages; weight pages expose price, permitted commercial
  use, modification, redistribution, support, format and hardware needs.
- Persian capability cards describe language variety, base model, training-data
  provenance, privacy, limitations and evaluation. Static input/output examples
  explain the intended task; they do not claim live inference.
- Seller workspace: three-stage form, access-specific validation, escaped preview,
  automatic recovery, browser-local save/edit/delete and JSON export. Base license and data rights
  are required. Private training files, credentials and weights are not uploaded.
- Purchase requests retain the chosen offer, unit, workload and license as an editable local snapshot;
  buyers can download readable text or JSON, or delete them. There is no remote send confirmation.
- Requested illustrative uptime for every API/GPU offer, with deterministic
  display fixtures separated from the original observed reliability file.
- Existing GPU constraints, custom model/API consumption in the running app and portable HTML, provider directory, recent visits and reference price sources.
- Self-contained CSS/fonts/assets, the supplied SVG, compact RTL layouts, bold
  prices, 900 ms startup + 600 ms product presentation delay, reduced motion.

## Runtime boundaries

The running FastAPI service is read-only except for stateless cost calculations.
Drafts and requests persist only in the current browser. Text/JSON export is the handoff
path; no central publication, payment, account, access-key issuance or protected
weight delivery is implemented. The UI says when a record is merely saved locally.
See `docs/ARCHITECTURE.md` for the records and the boundaries of future integration.

## Catalog and prices

The original public-source observations retain their dates and provenance.
121 API/GPU offers are **reference tariffs for budgeting**, not verified commercial
quotes or evidence that the named seller currently serves that checkpoint.
They carry `price_status: reference_tariff`, `pricing_basis: planning_catalog`
and no fabricated observation date. Model specifications use primary model cards.
The interface presents ordinary tariffs and estimates; final price and availability
must be checked at the seller. No live-price, stock or vendor-rating claim.
Ten private listings, four publisher identities and three added hosting companies
are fictional presentation fixtures, with no claimed relationship to real businesses.
The three real Persian model cards retain their primary sources; their added hosted
API offers are explicitly fictional in the data. None establishes an actual provider
partnership or live endpoint. All seven paid weight licenses are fictional.
Their prices and terms are reference records.

The user explicitly requested filled illustrative uptime. Those values live in
`presentation_reliability.json`; `measured` is false. Do not use them as commercial
monitoring evidence. The earlier real request-success report remains unchanged
in `reliability.json` and is not conflated with time-based uptime. Before a real
launch, replace display fixtures with telemetry or show unavailable measurements.

**Comparison basis is unchanged:** monthly consumption estimates and the
selected GPU rental period still determine default provider ranking. Funding
remains separate. All 468 ordinary offer calculations across 186 complete preset records match
v0.11 exactly. All inherited data files remain byte-identical. The added
`batch_terms.json` is a separate illustrative dataset; no original source price
or observation has been changed.

Two inherited AvalAI quotes remain `needs_recheck` and cannot win estimates.
See `docs/SOURCES.md` and `docs/RESEARCH.md` for the precise evidence boundaries.

The optional manual command `python scripts/refresh_netarz.py` updates the eleven
original Netarz quotes, validates units and writes atomically. It skips reference
catalog additions. Restart the app after updating. No scheduler is installed.

## Portable export and file-origin support

The original v0.4 HTML incorrectly retained `/static/styles.css`: its exporter
expected `<link ...>` while the formatted template used `<link ... />`. This
omitted the entire stylesheet. The exporter now accepts both forms and attribute
formatting changes, fails if the stylesheet cannot be embedded, and removes
redundant font preloads. All application CSS, fonts, images and scripts are in the
portable file. No browser security setting or local server is needed for these
resources. Regression checks reject the original broken file.

## Checks and portable file

```bash
python -m pytest -q
node --test tests/test_ui.cjs
node --check app/static/app.js
python scripts/export_catalog.py
```

`make test`, `make run` and `make export` are shortcuts where Make is available.
The served catalog and portable export use the same Python-calculated presets
and Python-compiled API pricing plans.
The export writes `dist/torobai.html`: open it directly to use search, filters,
product pages, saved items, comparisons and editable model/API consumption. It bundles
all assets and Python-calculated presets, so browsing needs no server or external
font request. Arbitrary model/API consumption works offline. GPU custom rental periods remain
available in the running FastAPI app; the portable GPU page keeps three presets. Outbound supplier/model links
still need internet. Storage/clipboard support on file URLs depends on the browser.

Optional DOM and stylesheet checks use Linkedom and CSSOM, test-only dependencies:

```bash
npm install --no-save --package-lock=false linkedom@0.18.13 cssom@0.5.0
node tests/test_portable.cjs
node tests/test_usage_update.cjs
node tests/test_navigation_update.cjs
node tests/test_estimate_cache.cjs
node tests/test_live_ui.cjs
node tests/test_pricing_conformance.cjs
node --test tests/test_layout.cjs
```

Build the export first. This executes the actual exported scripts; it does **not**
verify browser layout, font rendering or real keyboard interaction. The served-page
harness uses Python-generated fixtures and verifies custom consumption after
catalog presets load. It uses `python` from the active environment; override with
`TOROBAI_TEST_PYTHON` when necessary.

## Code map

| Path | Responsibility |
|---|---|
| `app/main.py` | HTTP routes and validated scenario fields |
| `app/market.py` | Filtering, seller terms and money calculations |
| `app/pricing_plan.py` | Shared declarative API tariffs, exclusions and Decimal evaluation |
| `app/data/` | Products, API/GPU offers, weight licenses, sellers, presets and separate reliability datasets |
| `app/static/app.js` | Catalog, detail, comparison and interaction views |
| `app/static/ui.js` | Small pure formatting, validation and filter helpers |
| `app/static/styles.css` | Responsive RTL visual system |
| `scripts/export_catalog.py` | Self-contained interactive export |
| `tests/` | Pricing, API, parsing/filtering and portable DOM behavior |
| `docs/` | Research, sources, design decisions, review and validation |

## Remaining verification

Browser viewport, mobile, keyboard, clipboard and layout tests have not been
completed in this environment. No live seller API integration, payment, customer
interview, GPU job or Iranian network probe was performed. Torob's IRANYekan webfont is
commercial; this package uses Vazirmatn. See `docs/ASSETS.md` for replacing it
with licensed IRANYekan files.
This code is a local marketplace application, not a deployed purchasing service.
