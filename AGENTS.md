# torobai: working agreements

## v0.26 conversation UI

- Keep quick replies outside transcript messages. Usage/requirements belong in
  the nested native settings dialog, with shared TorobMotion and cancel behavior.
- Preserve visible history and original recommendation URLs. Every link keeps
  its own catalog revision and filter scope; stale prices need a fresh choice.
- Incoming replies must not move a reader away from older messages. When following
  the conversation, retain the last question in view. Never scroll the page.
- Scope typography to chat; the site's generic dialog styles must not change it.
  On mobile, anchor fixed dialogs explicitly from the left to avoid RTL/stable
  scrollbar-gutter overconstraint. Respect reduced motion and keyboard focus.
- Keep runtime dependencies and the OpenRouter backend unchanged for this UI.


## v0.25 selection guide

- Keep all new guide code in `chatbot/`; its AGENTS.md is the user-supplied
  Ponytail file and applies alongside these project contracts.
- OpenRouter is the default language parser. Keep credentials on the server,
  validate both request and structured output, and never generate price/URL HTML.
- Reuse the effective catalog, exact quote path and `catalogFilterURL`. Guide
  requirements must match the same offer; unknown is not verified.
- `usecase=coding` means published coding evidence, not guaranteed suitability.
  `max_cost` uses the current native workload/access unit. Retain both in links.
- Guide choices run locally without delays. Portable HTML contains no API key or
  cloud-language calls. Free text uses the served application only.
- Keep pending/retry/cancel states, explicit requirement edits, session-only
  memory and catalog-revision checks. Do not relax hard needs silently.
- Run chatbot/tests with the existing tests and export. HTTP mocks and DOM tests
  are not a paid language evaluation or a visual browser check.


## v0.24 model-first comparison and complete coverage

- Benchmarks now start with task and a searchable 1–4 model selection. Keep the
  selection order stable across metrics, views, price changes and shared links.
  One comparison sheet owns model identity, cost, exact values and in-cell bars.
  The old report selector, duplicate summary/offer cards and weighted score are
  superseded by this flow. Keep the existing GPU planner and pricing engine.
- Every catalog product has a benchmarks.profiles record. New local listings use
  an explicit unreported fallback until evidence is added. No product disappears
  from selection solely because its score is missing.
- Metric keys identify actual benchmark variants. Matching keys permit display
  on one row, not a controlled ranking. Highlight a best result only when all
  selected entries share a measured source cohort. Never rank scenario fixtures.
- Preserve exact tested snapshots and units. GPT-4o simple-evals uses GPQA Diamond
  (verified in gpqa_eval.py), not Main. Distinguish PT/IT, thinking mode, years,
  MTEB language, full SWE-bench versus 477-task subsets, and ASR speed versus WER.
- Sources and conditions are available per cell and per product. Scenario data
  belongs only to the fictional private listings or declared execution fixtures;
  the real ParsinLU model now uses the original Mofid AI evaluation.
- Keep local search fast, preserve both page and comparison-table scroll, and
  use the shared disclosure/dialog motion. Selection drafts commit on Apply;
  cancel does not change the comparison. No wait or spinner for bundled data.
- See docs/PLAN_V024.md, docs/BENCHMARK_COVERAGE.md and docs/REVIEW_V024.fa.md.
  Run test_benchmarks.py and test_performance.cjs after coverage or UI changes.

## v0.23 performance and GPU planning

- The latest request adds Performance as a fifth primary destination, beside
  Providers. Product tabs now include Performance for both API and weight access.
- Keep benchmarks in source/protocol cohorts in benchmarks.json. Retain exact
  model IDs, metric direction, units, conditions and retrieval date. Never merge
  non-thinking results with thinking or substitute another model revision.
- Scenario fixtures have kind=scenario, measured=false and no external source.
  Display their scenario label and conditions. Publisher reports are not torobai
  measurements. Missing values remain null, outside ranking and decision scores.
- Use the existing compiled billing engine for cost/quality comparisons. Score
  weighting is optional and relative to the selected eligible records only.
  Hardware TGP is not observed power; unspecified PCIe/SXM data stay unknown.
- New GPU calculations keep previous content, show 650 ms feedback (except
  reduced motion), then scroll smoothly to the result heading with header offset.
  Initial rendering does not scroll; a canonical cached calculation has no wait
  or spinner. Edits, navigation and catalog revisions cancel stale work. Cache
  numeric results, not DOM, with a 64-entry session bound.
- Estimate inference memory in GiB per card, including total weights, KV per
  concurrent request, runtime and headroom. No training or execution guarantee.
- Load performance.js before app.js in served mode, export and test harnesses.
  Run test_performance.cjs and test_benchmarks.py for changed cohorts or flow.


## v0.22 control text

- num() returns HTML. Use fa() for plain numeric attribute values such as
  aria-label; never inject markup helpers inside quoted attributes.
- Control labels do not select text. Scope user-select:none to controls, tabs,
  navigation and summaries, never the body. Preserve selection in editable fields
  and ordinary descriptions/specifications/prices.

## v0.21 product section tabs

- Product section controls are actual accessible tabs, not scroll links. Keep
  only the selected panel visible; new product visits default to prices.
- The cheapest offer stays in the overview. Consumption, seller rows and usage
  settings belong to the price panel; model profile/examples belong to specs.
- Preserve panel nodes and edited forms when switching. Do not fetch, pause,
  update route/history or force scrolling for ready section content.
- Preserve an applicable section across API/weight access changes; fall back to
  prices if unavailable. Weight access has price/file and specs tabs only.
- Use selected-state styling, roving tabindex, RTL arrows and Home/End. Respect
  reduced motion. Maintain one selected tab and one visible panel after repricing.

## v0.20 disclosure motion

- Animate a dedicated content wrapper, not the native details element. Freeze
  its start before opening and measure the inner content on requestAnimationFrame.
  Keep the native slot open until exit completes; never close/reopen for measuring.
- Preserve existing child nodes, form state and listeners. Flow-root contains
  content margins; selectors must account for the two content wrappers.
- Cancel scheduled frames and animations on reversal/navigation. Release the
  height and inert state on completion, failures and reduced-motion changes.
- A viewport height-only resize must not finish an animation (mobile chrome or
  keyboard). Settle only for width changes. Popovers reveal downwards while
  keeping toolbar height unchanged. No new loading delay or scroll commands.
- test_motion.cjs models deferred layout and unavailable native slot geometry;
  test_portable.cjs exercises disclosure expansion/collapse on all product routes.
  These remain DOM/scheduling tests, not visual proof of smoothness.

## v0.19 detail layout and motion

- Keep model access as compact segmented links and the API capability control in
  one toolbar. No two-story acquisition cards or full-width closed filter block.
  Applied filters remain visible as a count; opening their panel overlays nearby
  content rather than moving prices. Mobile controls retain a 44 px target.
- `motion.js` owns native details and dialog animation. Use TorobMotion.setOpen
  for programmatic disclosure changes and the shared closeDialog function.
  Both directions are animated; repeated activation reverses from the current
  height/appearance. Clear fixed heights after completion, cancellation or resize.
- Retain native summary keyboard semantics, Escape/outside dismissal for popovers
  and focus without scrolling. Reduced motion and unavailable WAAPI use immediate
  native states. Do not turn these interaction animations into loading delays.
- Include motion.js in served tests and the self-contained export. Run the motion
  lifecycle, existing portable, navigation and usage tests. Report that lifecycle
  assertions do not inspect rendered animation or browser pixels.

Build torobai, a Persian-language comparison and referral marketplace for models,
APIs and GPU rental. Torob is the product analogy: one product/version, multiple
seller offers, transparent comparisons and a clear handoff to the supplier.
Do not reinterpret “proxy” as authorization to build an API gateway, shared API
key, unified wallet, inference router or payment system. Those require a new scope.
The default home is the complete model/API catalog (#api). Persian-specialized
models are an explicit optional category (#fa), not the site name or default.
Individuals and organizations can offer API access, model-weight licenses, or both.
Keep model identity/version separate from provider offers and weight licenses.

## Start here

- Read the requested change and the code it touches. Search callers with `rg`;
  include affected tests, data, assets and exports in the scope.
- Read `README.md` for setup and `docs/DESIGN.md` before changing a user flow.
- `app/main.py` owns HTTP validation; `app/market.py` owns money and filtering;
  `app/data/` owns catalog records; `app/static/` owns the interface.
- Keep FastAPI plus ordinary HTML, CSS and JavaScript. No framework migration.
- Run: `python -m uvicorn app.main:app --reload`.
- Check: `python -m pytest -q`; `node --test tests/test_ui.cjs`;
  `node --check app/static/app.js`. Python 3.11+; Node 20+ for JS checks.

## The review loop

For a substantial feature, complete three passes. Keep the notes short.

1. **Buyer:** state a concrete task, constraints and next decision. Walk the
   current path; find where someone hesitates or makes the wrong comparison.
2. **Senior developer:** implement the smallest complete fix in the existing
   structure. Check inputs, failure states, callers, keyboard use and mobile flow.
3. **Product manager:** assess whether the buyer can finish. Remove decorative
   controls without behavior. Record the remaining gap; repeat for observed
   failures or unmet requirements, not for perpetual optional polishing.

Use the scenarios affected by the change:

- A small team compares the SAME model across Iranian API sellers. Monthly usage
  and wallet funding must remain separate.
- A researcher needs SSH, persistent storage and 24 GB on EACH GPU. An inexpensive
  managed application without SSH does not satisfy that task.
- A RAG developer compares dimensions, language, context and input billing.
  An audio buyer enters minutes, not chat tokens.
- An automation developer needs a typed choice with probabilities. Decision
  models have their own output and access path, not a disguised chat workflow.
- A user selects open weights, checks the actual license, opens the model card,
  and chooses between an available API and self-hosting.
- A mobile visitor searches in Persian, opens a product, saves it, compares it,
  follows a seller link, and returns without losing their filters.

## Human-readable code

Keep the supplied senior-developer principle: be lazy about the solution, never
about completing the change. The original is in docs/ORIGINAL_DEVELOPER_RULES.md.

- Prefer existing code, then the standard library, then an installed dependency.
  Do not add a package for a few straightforward lines.
- No speculative adapters, factories, wrapper layers, generic component systems,
  background services or configuration knobs. Preserve the current structure.
- A short function reads top to bottom. A dense one-liner is not a win.
- Comments explain a non-obvious reason. Code/docs use plain English; UI copy is
  natural Persian. Do not narrate each line of code.
- Preserve validation and errors when moving code. Escape inserted data, restrict
  outbound links to HTTPS, and never inject fetched source HTML into the UI.
- API tariff rules are compiled in Python as declarative plans. Python evaluates
  them with Decimal; the portable file evaluates the same terms with exact rational
  arithmetic. Never duplicate tariff/eligibility rules or use floating-point money
  intermediates in JavaScript. Keep the Python/JS conformance check. GPU billing
  quantities are compiled by Python at the original three presets; portable
  tariff updates only substitute their rates, not rental rounding or minimums.
- New meaningful branches, parsers and money rules need small behavior tests.
  Do not test trivial markup or mirror implementation line for line.
- Mark a deliberate shortcut `shortcut: <limit>, <when to upgrade>`.

## Product and data

- Keep Iran and toman prices prominent. A Persian seller does not establish that
  its hardware or model processing is physically in Iran.
- Keep products, offers and shared seller terms separate.
- The latest user correction preserves the existing consumption comparison.
  Keep the default standard preset and seller sorting by estimated consumption;
  input/output unit rates remain supporting facts. Do not replace this basis
  with per-million input ordering without a later explicit request.
- The latest user instruction explicitly permits realistic illustrative uptime.
  Keep those fixed display values in `presentation_reliability.json` with
  `basis: illustrative_scenario` and `measured: false`. Never copy them into
  observed evidence, label them as independent monitoring, or attach a real
  source as if it supported them. Real request-success history stays separate.
  The latest request adds GitHub-style daily squares. Daily history stays in the
  same illustrative file, over 30 fixed full UTC days; its arithmetic mean must
  match each displayed aggregate. Do not randomize values during rendering or
  call the fixture live monitoring. Keep a text equivalent and dated window.
  Weight files have no service uptime; explain self-hosting instead.
- Reference prices and fictional private model listings are presentation catalog
  entries, with provenance in data and documentation. Never invent verified
  partnerships, ratings, purchases, live tests or benchmarks. Real model cards
  retain their actual license and access limitations.
- Do not put implementation-stage labels in the buyer interface. Use ordinary
  product language: rate, estimated consumption, rental period and seller terms.
- Unknown is not zero, false, free or verified. An unavailable or unpriced offer
  must not rank cheapest. A downloadable model may have zero API sellers.
- Compare identical billing units. Never divide a monthly commitment into a
  purchasable hourly price or merge several GPU memories into one large GPU.
- Open weights and open-source licenses are separate fields. Use model cards for
  identifiers, modality and limits. Distinguish a model limit from a seller limit.
- No account, payment, simulated reviews or fake alert subscription unless a
  later task requests it and supplies the required behavior.

## Persian market contract

- Task and acquisition are separate: transcription, translation, speech, OCR,
  document extraction, semantic retrieval, classification and conversation;
  API, public weights, or a paid weight license.
- `weight_offers.json` is not API billing. Never mix its one-time amounts into
  consumption estimates or API sort keys. State the license and price period.
- A paid closed model is not open weights. A public downloadable model can have
  a noncommercial license or gated access. Preserve that distinction.
- Capture base model/license, publisher type, version, language/dialect,
  training-data provenance, evaluation conditions, privacy and deployment needs.
  Do not upload private training data or API secrets into the listing form.
- Recover in-progress authoring after navigation. Keep a readable text export
  for requests alongside JSON, without claiming the request was delivered.
- Seller drafts and purchase requests are browser-local, editable/exportable
  records. Never claim they were remotely submitted, published, paid or delivered.
  Show storage failures. Escape every user-entered field in previews.
- Weight purchase is a license by default, not transfer of copyright, exclusive
  ownership or training-data ownership. Show permitted use, modification,
  redistribution, support and updates next to the offer.
- Fictional hosts are independent seller offers, not duplicate products. Keep the
  creator's API alongside the same creator's weight license when available.
  Show free research-only API restrictions before its action, not just inside
  collapsed terms. Enforce the monthly quota and offer-specific minimum credit
  in Python. Preserve those terms in local request and text/JSON snapshots.
- Detail provider/SSH filters come from that detail URL, never a previous catalog.
  Keep reset controls outside sections hidden for single-offer results. Preserve
  current consumption when changing an offer filter. API-host filters must not
  hide the original publisher's file when switching access tabs.
- Never equate paid weights with unavailable downloads. Separate open publication,
  license rights and actual file access in comparison tables.
- Preserve request terms/unit/workload snapshots on edits and exports; never
  silently reprice an old request from the current catalog. Readable export must
  distinguish a file-only request from a record saved in the browser.
- Partial listing export must remain available before completion and storage.
  Missing storage cannot produce a false persistence confirmation. Product quote
  errors must replace every loading surface and leave a working recovery action.
- Keep the existing consumption basis and all inherited API/GPU estimates.
  Add new units and pricing rules in Python only. Keep ordinary preset totals unchanged.

## Visual and interaction rules

- RTL throughout; isolate model identifiers, code and numbers LTR.
- Brand spelling is torobai. Write natural Persian without a hamza above final
  heh (U+0647 U+0654) or U+06C0.
- Keep five primary destinations with Models/API first and Performance beside Providers. The user restored
  the single-row horizontal category rail: customize its scrollbar rather than
  replacing it with tiles or hiding it. Use a thin rounded thumb, transparent track
  and no native arrow buttons where supported; keep touch/keyboard scrolling.
  Quick filters and product tabs can wrap. Keep a labeled advanced-filter dialog.
  Preserve applied filters in URLs and let buyers remove them individually.
- Bundle Vazirmatn with its OFL license. Torob uses IRANYekan; replace the font
  only when licensed web files are supplied. Follow docs/ASSETS.md. Never copy
  a commercial font from another site into the deliverable. Persian digits use
  U+06F0–U+06F9. Do not depend on locally installed fonts.
- Use real local brand assets; unknown brands get a plain text mark, never an
  invented official logo. Keep asset provenance.
- The first product screen leads with the cheapest eligible provider, bold total
  price, comparison period, comparable price range, unit rates, reliability and
  direct seller action. Keep product identity compact. List other providers next;
  do not repeat the featured provider as a second ordinary offer.
- Warm paper, coral actions and purposeful category artwork. Keep playfulness
  in product stages, not in money tables or technical copy.
- Adapt Torob's product identity, seller rows, clear prices and scannable specs.
  Keep the torobai wordmark and the Torob SVG explicitly supplied by the user.
  No generic SaaS hero or dashboard statistics.
- Always expose cheapest and most-expensive catalog ordering. Rank by the
  cheapest eligible offer at the standard workload. Restrict to one task/unit;
  choosing price order in a mixed catalog opens an explicit task chooser. Legacy
  sort-only deep links retain their previous task defaults for compatibility.
  Keep unknown prices last in both directions. Never rank a minute against a
  million tokens. Do not restore provider count as the primary price control.
- Money returns trusted markup, not plain text. Render it as markup only; escape
  provider/product strings separately. A DOM test must reject visible HTML tags.
- Categories remain one horizontal row at every width; controls are at least
  44 px tall. The catalog begins with compact search/category/filter controls.
  Avoid a large introductory hero, duplicate headings and multi-row category tiles. All prices use the bold price-number class, including
  secondary output rates. Zero additional providers needs no empty seller block.
- Use plain Persian labels. Prefer concrete actions and facts over slogans.
- Ready data must render immediately (v0.15). Show loading for unavailable data
  only; never simulate live checks or block route changes.
- Every visible control works. Include loading, empty, error, unavailable and
  zero-seller states. Preserve filters in URLs and safe local selections.
- Keep visible focus, labels, sufficient contrast and reduced-motion support.

## Finish

Run focused checks and `python scripts/export_catalog.py`. The portable output
must embed its complete CSS and font bytes; inspect startup resource URLs and
run `node tests/test_portable.cjs` after export when Linkedom is available. In a browser-capable
environment inspect catalog, API, GPU, decision and comparison pages at 1440 px
and 390 px; check keyboard focus and overflow. Never call a structural/DOM check
a browser test. Report what changed, why, and what actually passed. End with one
or two lines on unchecked behavior and material risks. Do not expose credentials
or make publication a side effect of setup.

## v0.12 current contract

- A card footer logo stack renders only existing logo assets, never fallback words.
  Keep the complete provider count and full seller listings accessible.
- Card totals, sorting, range summaries and details use the same applied workload.
  Keep both token rates and the 30-day basis visible. Other tasks use native units.
- Carry consumption, request mode, filters, sort and page size in URL state.
  Slice only after full-catalog filtering and sorting. Changing a filter or usage
  resets to page 1; returning from a product preserves the originating result page.
- Batch terms belong to each offer, never globally to a model. Unknown support is
  unpriced; never substitute the ordinary tariff or invent a streaming guarantee.
  Display the time window and requests per job. Catalog monthly volume is not
  the size of one batch job. Fictional Batch terms keep their provenance.
- Keep Batch mode, effective rates and delivery terms in inquiry snapshots and
  readable exports. This marketplace does not execute jobs or accept API keys.

## v0.13 consumption interaction

Applying/resetting catalog usage is an in-place operation, never ordinary hash
navigation. Preserve the live form, category rail, focused control and scroll.
Show a brief busy state without collapsing/replacing the grid during loading;
respect reduced motion. Guard double submits, stale edits, route changes and
errors. Capture scroll at commit so a user's movement during loading is retained.
Keep the shareable URL through guarded replaceState, with no hash fallback.

## v0.14 navigation contract

The latest user instruction extends in-place loading and preserved scroll to
catalog tabs, filters, sorting, page size and pagination. This supersedes the
older instruction to scroll pagination to the result heading. Capture coordinates
at commit, respect movement during loading, and preserve the horizontal rail.
Restore keyboard focus with preventScroll; never force scrollIntoView on these
transitions. Keep old content in place until commit and reserve only the minimum
bottom space needed for shorter lists. Same-product API/weight tabs prepare the
next quote before replacing the old offer. New product entry starts at its heading
once; a late quote must not reset the viewport. Presentation pauses are 550 ms for
catalogs and 600 ms for same-product tabs, omitted for reduced motion.

Use the shared navigate/route flow with guarded history writes. Preserve genuine
hrefs and modified-click behavior. No location.hash fallback for restricted file
origins. Newer choices, consumption edits and route changes cancel stale work;
errors release busy controls and leave a usable previous screen or quote retry.
Run test_navigation_update.cjs against the exported HTML after editing this flow.

## v0.15 current cache/loading contract

The latest correction supersedes unconditional presentation delays from v0.13/14.
Loading depends on data availability, not a visited-URL flag. The initial catalog
includes all result pages/categories and ordinary preset prices, so these render
immediately on first and subsequent visits. Weight offers are also local. Do not
briefly toggle a spinner/busy state for a cache hit. Preserve v0.14 scroll, rail,
focus, cancellation and guarded-history behavior.

Cache complete successful quote data by product and canonical numeric workload,
including instant/Batch mode. Equivalent preset/custom inputs share the same key.
Use existing local/preset data before fetching, coalesce concurrent requests and
never cache errors. Keep the custom cache session-scoped and bounded to 256 entries;
all bundled presets remain independently available. Do not cache rendered DOM,
which would hide changes to saved products or requests.

Retain brief calculation feedback only for new catalog consumption (650 ms,
skipped with reduced motion). Reapplying ready consumption or resetting to fetched
defaults must be synchronous and have no spinner. Remote estimates show loading
only while outstanding, without a minimum artificial delay. Test both cache hits
and real pending/failing requests, including cancellation and mode separation.

## v0.16 current pagination scroll contract

The latest request overrides preserved scroll for page-only changes. After
rendering a different numbered result page, scroll smoothly to its first product
card, leaving 16 px below the actual sticky header. A static mobile header adds
no offset. Focus the first product link using preventScroll. Respect reduced
motion with an instant scroll. Re-selecting the same catalog URL is a no-op and
must not cancel a running scroll. Previous/next links, page jump and page-only
history changes share this route behavior. Filter/usage/category/size changes
retain position even when they reset the page number. Do not add any loading or
pause for ready data. Verify scroll commands; do not claim browser animation QA.

## v0.17 seller/referral contract

- Seller identities link to #providers/:id. Search the directory or a seller's
  products by name and service type. API and weight licenses remain offers of
  one canonical model. Provider-scoped links and all-provider links are separate.
- Public outbound purchase actions must target the existing HTTPS source.
  Request-only sellers keep the local inquiry flow; never invent checkout URLs.
- Display dated tariff evidence only when recorded; do not manufacture “updated
  just now”, seller reviews, verified identity, guarantees or complaint scores.
  Uptime is service availability, not seller credibility. Keep those distinct.
- #watchlist saves the exact model version, acquisition, workload, request mode,
  provider/SSH filters and price. Compare with that same basis on revisit; stop
  price-delta claims on version changes. Retain records for removed products.
  GPU watches support the three complete rental presets via the rental URL key.
- #reports records a price/availability/model/terms/link discrepancy. Reports are
  editable and have a readable export. Saving is browser-local, not a support
  submission. Never claim a report was sent or a notification was subscribed.
- Snapshot/report storage errors must stay visible and must not imply success.
  Escape saved input; validate routes, modes, dates and amounts when reading it.
  No fabricated price-history chart: watch entries start when the user saves one.
- Run tests/test_marketplace.cjs after exporting. Preserve the cache, workload and
  pagination contracts above. The standalone file must not fetch local resources.

## v0.18 working catalog contract

- Read `app/marketplace.py` and `app/static/marketplace.js` for the supplier/admin,
  samples, matching and recorded-alert workflows. Keep these integrated with the
  existing catalog, declarative price plans and shared navigation.
- Requirements are per offer. Unknown capability is not false or supported.
  Comparing supplier differences must retain one model, workload and request mode.
- Keep subtotal, declared tax and initial credit distinct. Unspecified disk,
  transfer, tool or cache charges are unknown, never free or a guessed discount.
- An API offer and a weight license attach to one canonical model. Keep an approved
  offer active until its replacement is approved. Failed storage cannot advance
  review status or change the catalog. Draft and approved state must survive reload.
- CSV/JSON changes are validated as a batch, previewed and committed atomically.
  Reject duplicate/unknown IDs, wrong billing units, invalid dates and negative
  rates. Preserve earlier field changes when a later import is a partial patch.
  Clear calculated quotes on catalog edits; older in-flight results cannot
  repopulate them or delete a newer pending calculation.
- New models require the existing listing validation, model/data rights and
  access-specific terms. Merge only identical canonical identity/version/unit;
  keep old routes usable and offer restoration. Similar names are insufficient.
- Samples accept user-provided outputs, with source/conditions and task-matched
  models. Audio/images are limited raster/audio data URLs. Never attribute a
  presentation example to an actual model execution or independent benchmark.
- GPU fit is an editable memory estimate per card, not a guarantee. Do not add
  memory across cards or silently price unknown disk/network charges at zero.
- History starts when a watch is saved and uses that exact comparison basis.
  Version changes suspend price deltas. Notification events derive from recorded
  changes, with native permission requested only after channel selection.
- Supplier/admin state and notifications are browser-local. Do not claim public
  publication, verified identity, server delivery, background email/SMS, real
  inference or production authentication. This version adds no inference gateway.
- Run `tests/test_marketplace_v018.cjs`, `tests/test_marketplace_meta.py` and the
  existing cache/price/navigation suites after export. Inspect rendered pixels
  only with an authorized browser-control capability; DOM tests are not visual QA.
