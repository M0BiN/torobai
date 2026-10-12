# Current product contracts

Read the section affected by the task, after the root [AGENTS.md](../AGENTS.md).
These are current behavior requirements, not a release history. Update the
relevant rule in place; older [design notes](DESIGN.md), plans and
[release notes](CHANGELOG.md) record the reasons and previous implementations.

## Identity and evidence

- torobai compares and refers buyers to suppliers. Keep five primary destinations,
  with Models/API first and Performance beside Providers. `#fa` is an optional
  Persian-specialist category. Do not rename the product after that category.
- Separate canonical model/version, seller, API/GPU offer and weight license.
  Individuals and companies can offer API access, weights or both. Keep the
  creator's own API and license attached to the same model as other hosts.
- Separate task from acquisition: conversation, transcription, translation,
  speech, OCR, document extraction, retrieval, classification and decision models;
  API, public weights and paid licenses. Decision output is typed choice, not a
  disguised chat workflow. Zero API sellers does not make a download unavailable.
- Keep model IDs, base model/license, publisher type, version, language/dialect,
  training-data provenance, evaluation conditions, limits and deployment needs.
  A model limit is not a seller limit; an Iranian seller does not establish that
  processing or hardware is physically in Iran. Never collect private training
  data or API secrets through listings.
- Open weights, open-source license, commercial rights and file access are
  separate facts. Gated/noncommercial downloads remain restricted. A weight
  purchase licenses use by default; it does not transfer copyright, exclusivity
  or training-data ownership. Show use/modification/redistribution/support terms.
- Real specifications and benchmark claims retain their actual source and
  revision. Reference tariffs and fictional listings keep provenance in data/docs.
  Do not invent partnerships, purchases, ratings, reviews, live tests, verified
  identity or guarantees. Use ordinary product language in the buyer interface;
  implementation-stage labels are not a substitute for clear terms.
- Illustrative uptime stays in `presentation_reliability.json`, with
  `basis: illustrative_scenario` and `measured: false`. Keep 30 fixed full UTC days,
  a dated window, square daily cells and a text equivalent. Their arithmetic mean
  must match the aggregate. Do not randomize on render or call it live monitoring.
  Observed request-success evidence stays separate. Weight files have no service
  uptime; explain self-hosting. Availability is not seller credibility.
- Seller identities link to `#providers/:id`; directory and product searches
  support name/service type. Existing public purchase links use HTTPS sources.
  Request-only sellers use local inquiry, never invented business/checkout URLs.
  Tariff evidence is dated only when recorded; no fabricated freshness claims.

## Pricing and eligibility

- Keep the standard consumption preset and the user's applied workload as the
  comparison basis. Cards, cheapest/most-expensive order, ranges, detail quotes
  and chat use the same eligible offer, workload and request mode. Keep the
  30-day basis and input/output unit rates visible; other tasks use native units.
- Python owns tariff and eligibility rules. `app/pricing_plan.py` compiles the
  declarative plans; Python uses Decimal and portable JS uses exact rational
  arithmetic. Do not duplicate rules, change ordinary preset totals or use
  floating-point money intermediates. Keep Python/JS conformance coverage.
- GPU quantities come from the existing Python billing for the three rental
  presets. Portable tariff edits substitute rates, not rental rounding/minimums.
  A monthly commitment is not a purchasable hourly offer. VRAM is per card, never
  several cards added together as a single device.
- Compare identical tasks and billing units. Price sorting in a mixed catalog
  opens an explicit task chooser; legacy sort-only links keep their task defaults.
  Unknown/unpriced/unavailable offers stay last in either price direction.
  Provider count is not the primary price-order control.
- Keep subtotal, declared tax, initial credit and recurring consumption distinct.
  Missing disk, transfer, cache or tool charges are unknown, never free. One-time
  `weight_offers.json` prices never enter API consumption estimates or sort keys.
- Requirements apply to the same offer; do not borrow another seller's capability.
  Unknown support is not supported. Preserve offer-specific minimum credit,
  noncommercial use restrictions and monthly quotas in Python and snapshots;
  show free research-only restrictions before the action, not only in a disclosure.
- Batch terms belong to offers, not globally to a model. Unknown Batch support
  is unpriced; do not substitute the ordinary tariff or invent streaming support.
  Show completion window, effective rates and requests per job. Monthly workload
  is not one batch job. Preserve mode/terms in inquiries and exports. This site
  compares offers; it does not execute jobs or accept API keys.

## Navigation and loading

| Action | Current behavior |
| --- | --- |
| Ready catalog/category/page/section or cached quote | Render immediately; no artificial wait or transient busy state. |
| Apply/reset usage, change a filter, category, sort or page size | Preserve the live form, category rail, focus and page position. Reset the result page when appropriate, without triggering pagination scrolling. |
| Different numbered result page, including page-only history changes | After rendering, smoothly scroll to the first product, 16 px below the actual sticky header; a static mobile header adds no offset. Focus its link with `preventScroll`. Reduced motion uses instant scrolling. |
| Same catalog URL/page selected again | No-op; do not cancel an active scroll. |
| New product entry | Start at its heading once; a late quote must not reset the viewport. |
| Same product, API/weight access change | Prepare the quote before replacement, keep applicable section/form state and position; no delay for ready data. |
| New uncached catalog consumption calculation | Keep content in place, show the existing 650 ms calculation feedback, omit it for reduced motion. Reapplying a ready workload/reset is immediate. |
| Remote estimate | Loading lasts only while outstanding; no minimum delay. Errors clear all loading surfaces and offer recovery. |

- URL state carries acquisition, workload, request mode, filters, sort, page and
  page size. Filter/sort the full catalog before slicing. Returning from a product
  restores its originating results page. Keep genuine hrefs and modified clicks.
- Apply usage in place with guarded `replaceState`, not ordinary hash navigation.
  Do not fall back to `location.hash` on restricted file origins. Capture scroll
  at commit so movement during pending work is retained. Restore focus without
  scrolling and retain only necessary space when a result list becomes shorter.
- A detail URL owns its provider/SSH/access filters; a previous catalog is only a
  return destination. Keep resets visible even with one offer. Offer filtering
  preserves consumption. API-host filters must not hide the publisher's weights.
- Use local/preset data before fetching. Cache complete successful numeric quotes
  by product and canonical workload, including instant/Batch mode. Equivalent
  presets and custom inputs share a key; coalesce concurrent requests. Never cache
  failures or rendered DOM. Custom cache is session-scoped, bounded to 256 entries;
  bundled presets remain available independently.
- New choices, edits, navigation and catalog revisions cancel stale work. Earlier
  replies must not restore outdated prices, overwrite current state or clear a
  newer pending calculation. Guard double submits and leave usable error states.

## Interface and motion

- Use RTL with LTR isolation for identifiers, code and numbers. Write natural
  Persian with U+06F0–U+06F9 digits and no final-heh hamza. Use concrete actions
  and facts, not slogans. Keep the torobai name and the user-supplied Torob SVG.
- Use warm paper, coral actions and purposeful category artwork. Keep creative
  visual treatment out of money tables and technical copy. No large introductory
  hero, generic dashboard statistics, repeated headings or oversized controls.
- Keep the category rail in one horizontal row at every width. Style its scrollbar
  with a thin rounded thumb, transparent track and no native arrows where supported;
  retain touch/keyboard access. Other quick filters/tabs may wrap. Keep a labeled
  advanced-filter dialog and individually removable URL-backed applied filters.
- Lead product details with the cheapest eligible provider, bold total and period,
  comparable range, unit rates, reliability and supplier action. Keep identity
  compact; list the other offers next without duplicating the featured seller.
- Keep acquisition links compact and the capability control in one toolbar.
  Its closed state uses a count; its open panel overlays nearby content rather
  than pushing prices down. Retain 44 px targets, including mobile controls.
- Use bundled Vazirmatn and its OFL license. Torob's IRANYekan cannot be copied
  without licensed web files. Follow [ASSETS.md](ASSETS.md). Use actual local brand
  assets with provenance. Unknown brands get plain text in full listings, but
  only existing logos enter card footer stacks. Keep complete seller counts.
- Every price uses the bold price-number style, including secondary output rates.
  `money()` and `num()` return trusted HTML; render them as markup, never inside
  quoted attributes. Use `fa()` for plain numeric labels and escape user strings
  separately. Preserve checks against visible HTML tags and malformed labels.
- Disable selection on buttons, tabs, navigation and summaries only. Ordinary
  descriptions, specifications, prices and editable text remain selectable.
- Product sections are accessible tabs with one selected tab and visible panel.
  New product visits default to prices; the cheapest-offer overview stays visible.
  Consumption/sellers/settings belong in prices and profiles/examples in specs.
  Preserve nodes and form edits; ready tab changes do not fetch, delay, alter
  history or force scrolling. Preserve applicable selection across access changes.
  Both API and weights include Performance; weights have no uptime/cost panel.
  Use roving tabindex, RTL arrows, Home/End and visible focus after repricing.
- `motion.js` owns disclosures and dialogs. Use `TorobMotion.setOpen` and shared
  `closeDialog`; preserve native summary, Escape/outside dismissal and focus.
  Animate both directions; repeated activation reverses from the current state.
- Animate a dedicated content wrapper, not the native details element. Freeze
  the start and measure inner content on `requestAnimationFrame`; keep the native
  slot open until closing finishes. Never close/reopen just to measure. Preserve
  child nodes/listeners/forms; flow-root contains margins and CSS accounts for
  both wrappers. Popovers reveal downward without changing toolbar height.
- Cancel frames/animations on reversal or navigation; clear heights and inert
  state on completion, errors or reduced-motion changes. Width changes can settle
  motion; height-only mobile keyboard/browser changes must not end it early.
  Reduced motion or missing WAAPI uses immediate native states. Motion is not
  a loading delay. Include motion.js in served/export/test paths.
- Keep labels, contrast, keyboard access and visible focus. Include meaningful
  empty, error, unavailable and zero-seller states; no empty extra-seller block.

## Performance and GPU planning

- Benchmarks start with task and a searchable selection of 1–4 models. One sheet
  owns identity, cost, exact values and in-cell bars. Preserve selection order
  across metrics/views/price changes/shared links. Do not restore a report-first
  selector, duplicate summary cards or weighted composite decision score.
- Every product has a `benchmarks.profiles` record; new local listings receive
  an explicit unreported fallback. Missing values stay null and selectable,
  outside ranking. Do not silently drop a product or substitute zero.
- Keep source/protocol cohorts in `benchmarks.json`, with exact model IDs,
  revision, metric direction, units, conditions and retrieval date. Matching
  metric keys permit a shared row, not controlled ranking. Highlight a best result
  only when all selected entries share a measured source cohort.
- Preserve benchmark variants: PT/IT, thinking mode, year, MTEB language,
  full SWE-bench versus 477-task subsets, ASR speed versus WER. GPT-4o simple-evals
  is GPQA Diamond, not Main. Never substitute another model revision or mode.
- Publisher results are not torobai measurements. Scenario records use
  `kind=scenario`, `measured=false`, no external source and explicit conditions.
  They belong to fictional private listings or declared execution fixtures and
  never enter measured rankings. ParsinLU uses the original Mofid AI evaluation.
  Keep sources/conditions accessible per cell/product; consult
  [BENCHMARK_COVERAGE.md](BENCHMARK_COVERAGE.md) when changing coverage.
- Reuse the compiled billing engine for cost/quality views. Hardware TGP is not
  observed power; unspecified PCIe/SXM remains unknown. Draft selections apply
  once; cancel preserves the comparison. Keep page and table scroll, shared
  disclosure motion, and immediate local search/bundled data.
- GPU planning estimates inference memory in GiB per card: total weights, KV
  per concurrent request, runtime and headroom. It is not a training, compatibility
  or execution guarantee. Unknown storage/network costs remain unknown.
- A new uncached GPU calculation keeps old content, shows existing 650 ms feedback
  (except reduced motion), then scrolls smoothly to results with header offset.
  Initial rendering does not scroll; canonical cache hits have no wait/spinner.
  Edits/navigation/catalog changes invalidate stale work. Cache numeric results,
  not DOM, with a 64-entry session limit. Keep `performance.js` before `app.js`
  in served mode, the export and test harnesses.

## Local marketplace records

- Read `app/marketplace.py` and `app/static/marketplace.js` for supplier/admin,
  samples, matching and recorded alerts. Reuse catalog, price plans and navigation.
  Drafts, review state, requests and notifications are browser-local; do not claim
  public publication, identity verification, authentication, payment, support
  submission, background email/SMS delivery or real inference.
- Preserve in-progress authoring across navigation, including in-memory recovery
  when storage is blocked. Offer partial export before completion. Text exports
  accompany JSON; a file-only export is distinct from a browser-saved record.
  Failed storage cannot claim persistence, advance review or change the catalog.
- Keep an approved offer active until its replacement is approved. Draft/approved
  state survives reload. Validate CSV/JSON batches, preview and commit atomically;
  reject duplicate/unknown IDs, wrong units, invalid dates and negative rates.
  Partial patches retain earlier field changes. Persist before updating catalog
  state, invalidate quotes and prevent pre-revision replies from refilling caches.
- New listings require the existing model/data-rights and access-terms checks.
  Merge only identical canonical identity/version/unit, never similar names.
  Preserve old routes and offer restoration. Never upload private weights/data
  or infer redistribution rights from draft metadata.
- Request edits and text/JSON exports preserve original terms, unit, workload,
  mode and price snapshot. Do not reprice old requests silently. Validate stored
  routes, modes, dates and amounts and escape previews. Malformed records must
  not become actions or be silently erased merely by visiting a page.
- Samples accept user-provided outputs with source, conditions, shared input and
  task-matched models. Media is restricted to limited raster/audio data URLs.
  Presentation examples are not actual model runs or independent benchmarks.
- `#watchlist` records exact model version, acquisition, workload, mode,
  provider/SSH filters and price; GPU uses complete rental presets. History starts
  when saved, uses the same basis and retains removed products. Version changes
  suspend numeric deltas. Do not invent prior history.
- `#reports` holds editable price/availability/model/terms/link discrepancies
  with readable exports. Saving is not sending. Alert events derive from recorded
  changes; request native permission only after channel choice. No fake successful
  subscription or delivery. All storage failures stay visible and recoverable.
