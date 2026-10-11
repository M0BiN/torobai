# Design decisions

## v0.26: conversation before controls

The guide uses a charcoal/coral conversation mark, quiet white surfaces and
small user bubbles. Recommendations are 65 px rows at ordinary mobile/desktop
widths. Period and currency are shared across the result list; assumptions and
published coding evidence remain in an animated disclosure.

A single quick-reply tray sits above the composer. Requirements, consumption,
budget and privacy open in a native sheet outside the log. Old text and scoped
result URLs remain available; input actions do not manufacture extra messages.
Reply scrolling keeps the last question visible or preserves the user's reading
position, with an explicit new-message control. Desktop widening and a full-screen
mobile layout support longer reading without altering the rest of the catalog.


## v0.24: choose models before understanding reports

The benchmark page is a single comparison sheet. Task tabs narrow the unit and
use case; a searchable dialog stages up to four choices. The first view uses
exact values and quiet in-cell bars, ordered by shared result coverage. A full
table reveals less-common tests. Cost/performance remains an optional view.
There are no duplicated KPI, legend and offer card sections. Product names and
bold usage costs head the same columns as the results. Source conditions are
one click away and use the shared animated disclosures.

Every catalog identity has a profile. Missing results are explained, never
hidden products or zero scores. Identical benchmark keys can align different
reports visually, but a best-result highlight requires one measured cohort for
all selections. Fictional private-model scenarios have separate metric keys.
All basic flows use ready local data; usage, selection order and scroll persist.

## v0.23: performance with purchasing context

Add a fifth primary destination and a Performance product tab. A source cohort
prevents unlike protocols from silently becoming one leaderboard. Four selected
products fit bars, a scatterplot and an exact matrix. Keep model quality separate
from provider availability; monthly API or rental cost remains the existing
calculation. The optional decision score uses the selected metric and price,
normalizes only complete eligible records, and visibly depends on user weights.

GPU planning uses a narrow assumptions form and a wider result column, stacked
on mobile. The memory breakdown precedes priced offers. Keep old results during
new calculation feedback, then focus and scroll to the result heading. Canonical
cache hits skip progress entirely. Navigation, input and catalog revision guard
against stale commits. See PLAN_V023.md for the pre-implementation risk review.

## v0.22: control labels and text selection

The screenshot's API badge was malformed because num() emits a bdi element whose
quoted class attribute broke the enclosing aria-label. Use plain fa() output in
that attribute and the equivalent filter badge. Gemma 4 31B has three catalog
offers; their count stays unchanged. Disable selection only for action labels,
tabs, navigation and checkbox/radio labels; keep ordinary content and input text
selectable. Do not cancel pointer/keyboard events or globally block copying.

## v0.21: one visible product section

The supplied image showed prices styled as selected while uptime was visible:
the controls were scroll anchors and the first anchor was always highlighted.
Replace them with a tablist and one visible tabpanel. Move the bar above seller
rows; keep the cheapest offer and product identity above it. Group consumption,
seller rows and budget controls under prices; put the Persian profile and example
links under specs. Uptime and the usage chart each have a separate panel.

Switching hides existing nodes instead of rerendering, so input and disclosure
state survive. It performs no navigation, scroll, fetch or presentation pause.
A short entry transition respects reduced motion; rapid switches cancel old
panel animation. API/weight access keeps a still-applicable section and otherwise
returns to prices. RTL arrows plus Home/End use roving focus and explicit labels.

## v0.20: animate content without toggling the native slot to measure

The user still observed abrupt disclosures after v0.19. Its test geometry assumed
that a synchronous native-open toggle always yielded the intended full height;
that was not evidence of actual browser smoothness. It also settled motion on
all resize events, including mobile viewport-height changes.

Keep a dedicated clipping wrapper around existing content and a flow-root inner
box that contains margins. Freeze the start before opening, then measure on the
next frame. Leave native open in place throughout the exit and remove it only
at completion. Do not animate the entire summary/container or toggle it closed
for measurement. Dynamic forms keep their node identity; final height returns to
auto. Rapid reversals cancel old frames and callbacks. Width resize settles the
layout; height-only resize does not. Anchored filters use a visible downward
reveal, with no toolbar-height change. Reduced motion still skips movement.

Reference: https://developer.chrome.com/blog/styling-details documents the native
content slot and its visibility lifecycle. This informs the implementation; it
is not browser validation of this project. Browser control was unavailable here.

## v0.19: less space before the price

The supplied screenshot showed oversized API/weight cards and a full-width closed
capability filter above the offer. Access now uses compact segmented links, and
the filter is a small anchored popover in the same toolbar. Its count remains
visible while closed; it fits the toolbar width on mobile and does not move offers
on opening. Remove inherited breadcrumb padding rather than hiding product context.

One small native-DOM controller animates all disclosures. Flow sections animate
their measured height, releasing that height at completion. Popovers/dialogs use
opacity and a slight translation/scale. Reversals start from the current frame;
stale callbacks cannot commit old states. Native summary activation, focus and
reduced-motion preferences remain effective. No framework or loading delay added.

## v0.18: an integrated catalog workspace

Offer capabilities, rates and provider identity remain separate from the model.
Requirements must match a single eligible offer before its cost participates in
sorting. The supplier comparison uses one workload and 2–3 offers of one model.
Consumption, tax and wallet funding are distinct values, never additive charges.

`marketplace.py` supplies capability metadata and Python-compiled tariff templates.
GPU quantities are compiled from `gpu_cost` for the three existing rental presets.
`marketplace.js` rebuilds an effective catalog from the base catalog plus approved
models/offers, partial tariff updates and exact identity merges. A catalog revision
invalidates estimates; pre-revision network replies cannot refill that cache.
The storage commit precedes catalog changes so quota/permission errors are visible.

Seller drafts and reviews form a browser-local workspace with explicit status.
Previously approved terms remain in force while a revision awaits review.
Imports validate the complete file and show monetary changes before commitment.
New models use the existing rights/terms checks. Merges preserve old links and can
be reset. No public authentication, multi-user writes or inference endpoint exists.

Persian comparisons accept recorded outputs with conditions and shared input;
seed examples demonstrate output format, not measured model performance. Memory
matching is an editable per-GPU capacity estimate, never a compatibility claim.
Watches build history from recorded prices, retain their original usage and
suspend numeric price deltas after version changes. Alerts have a site channel
and optional permission-gated browser channel; no closed-page background delivery.

All previous ready-data, in-place consumption and page-only smooth-scroll rules
remain. See REVIEW_V018.fa.md for the three review passes and VALIDATION.md for
the actual verification boundary.

## The job

Recognize the model, understand its use, compare purchase paths and keep a shortlist.
The first screen needs enough context to make sense without a tour.

- Catalog: descriptive heading, compact editorial collections, categories and
  filters, visual product cards with actual billing units.
- Product: visual identity, use, model ID, license, key specs, rate summary,
  seller rows, consumption estimate and related products.
- GPU: access, VRAM per card and commitment replace context and tokens.
- Decision: explain typed-choice output and give the official model/weights path.
  Keep the zero-API-seller state useful.
- Compare: up to three products, specs and access first. Cost comparisons require
  matching tasks and units. Saved items live in this browser only.

## Visual system

Cool off-white surfaces, charcoal, red actions, mint for weights and lilac for decisions.
Product stages use local brand marks, fine grids and geometric details. Hardware
uses an accelerator-board illustration. The cost chart is arithmetic at three
defined workloads, not a historical price series.

Vazirmatn for Persian prose and numbers, system sans for Latin identifiers.
Use supported comma separators and LTR-isolated numbers. Spacious imagery above
dense, aligned facts; intact model names; natural Persian explanations.

## Torob study, 11 October 2026

Read the server-rendered RTX 4090 search and four product pages: Hyundai TECHNO745,
ASUS ROG Strix RTX 4090, NVIDIA H200 and ASUS Dual RTX 5070. They expose breadcrumbs,
product imagery, cheapest-offer summaries, seller-specific names/conditions,
purchase links, specification groups and related products. One-seller and
many-seller products keep the same hierarchy. Search has category-specific filters.

Adapt hierarchy, specificity and prominent seller destinations. Do not transplant
pickup/city filters to APIs, invent trust scores, or add history without data.
GPU rental is not hardware retail. The cloud browser did not return usable images;
this was an HTML/structure study, not a completed pixel-level visual audit.

## Catalog basis

Published specifications retain primary sources. Existing quotes retain their
recorded basis. Added reference tariffs are budget scenarios, not verified seller
quotations. No claim of live price or live stock. The seller has the final quote.
Decision products need not pretend to have Iranian API sellers.

## Review gate

Can a visitor explain this page in five seconds? Can they identify the unit,
next action and unknown condition? Can they return without losing filters?
Check a narrow mobile view and a keyboard path. Simplify only after the buyer
has enough information to decide.

## v0.5 refinements

The user explicitly restored the existing comparison basis. Keep consumption
estimates and default provider ordering; do not promote an input-token-only price
into a replacement ranking metric. An output rate on a card belongs to the same
offer as its displayed input rate.

Replace the right filter column with a full-width discovery bar, a few quick
conditions and a dialog for advanced choices. Persist each condition in the URL.
Add visible applied chips, provider discovery and recent visits. Enlarge maker
marks while keeping billing units, seller identity and next actions readable.

Reliability has its own section and card entry point. The panel separates a
sourced historical request-success measurement, an official status destination,
and missing data. Use a scalar meter for an aggregate; never fabricate daily
bars. Model-group evidence must keep its group label and time window. GPU status
and SLA links must not become measured uptime percentages.

See RESEARCH_V05.md for current sources, the font decision and evidence limits.

## v0.6 price-first revision

The user's screenshots exposed an overly tall category row and a literal HTML
price. Money markup had been assigned through textContent. The entire summary
now renders a structured provider offer; regression checks reject visible tags.

Keep identity compact beside a featured provider panel: cheapest eligible
provider, bold consumption total, its unit rates, comparable range, reliability,
direct purchase/rental link and conditions. List the remaining providers next.
Keep the comparison engine unchanged; both catalog sorting and product detail
use Python-calculated workloads. Collapsible consumption settings replace the
large sidebar. Specs and related models follow the purchase choices.

The catalog exposes both price directions at all times. With mixed API tasks,
price sorting selects chat/text and shows the active category and shared workload.
Within embedding, audio or image categories it uses that category's own workload.
Never compare incompatible units by their numeric tariff alone.

Category panels target 110 px desktop and 88 px narrow mobile, with plain titles:
models to download, decision models, and GPU rental. A short skeleton transition
is bounded to 1.5 seconds of intentional delay on a direct product-page load.
Reduced motion removes both shimmer and intentional delay.

The user-supplied Torob SVG replaces the previous search emblem. Model/product
source links and actual license distinctions remain intact.


## v0.7 Persian-market direction (supersedes earlier home and uptime decisions)

The user defines the distinction as Persian-specialized models, including private
person/company models. Home now starts with those tasks; all-model APIs and GPU
rental remain navigation destinations. Compact Persian speech, translation and
seller-entry panels replace generic collections. Persian product marks use plain
type rather than fabricated official logos. Task and acquisition filters are
separate, immediately visible and URL-preserved.

Product identity is stable when moving between API and weights. API retains the
featured cheapest consumption offer. Weights use a dedicated offer with one-time
price, license and rights at the top, followed by delivery/support/hardware.
Model cards add training-data provenance, language variety, examples, privacy and
limitations. Seller drafts use three stages and a preview. Local requests capture
selected license terms and can be exported; no sending or payment is simulated.

Illustrative uptime now fills API/GPU service panels at the user's explicit
request. The backing fixture is separate from the old observed history. Never
show a service uptime for a weight file before deployment.


## v0.8 navigation and decision clarity (supersedes earlier rail/banner rules)

The supplied screenshot showed a horizontal native scrollbar under all category
tabs at desktop width. Long, nonwrapping labels plus overflow-x:auto caused it.
Replace all competing component selectors, including mobile overrides, with one
coherent discovery section. Do not conceal the bar with scrollbar-width:none.

- Four primary destinations: Persian models, all models, GPU rental, providers.
  Saved/recent/requests/drafts/guide are in a native details menu. Seller entry is
  a separate header action. The search row moves below the brand on narrower screens.
- Categories are four-column tiles, two below 650 px, with minmax(0,1fr) and normal
  text wrapping. The general catalog can use three rows without clipping choices.
- One compact heading, task selector, access/filter area and results toolbar.
  The seller invitation is after results, not a repeated category banner.
- Price sorting from mixed tasks opens an explicit task chooser. Existing deep
  links retain their old defaults. Currency and the consumption engine are unchanged.
- API rates and one-time weight licenses stay distinct. Single-offer products
  have no redundant range or empty seller section; the section link follows the
  visible offer. Public noncommercial weights have a label on the catalog card.
- Search matches the base model, language and task aliases. Scope expansion shows
  actual counts and a route into all models or GPUs, without claiming no matches
  exist globally. Advanced fields are relevant to the selected task.
- Form edits recover locally after navigation. Request export includes a readable
  text file and structured JSON. Neither is presented as a sent message.

Only the multi-product comparison table retains horizontal scrolling when its
columns genuinely require it. Navigation, filters and detail tabs wrap. Structural
CSS assertions cover this contract; actual browser layout remains unverified here.


## v0.9 explicit home correction (preserved)

The previous grid and default Persian-specialist home were rejected. Treat this
section and current AGENTS.md as authoritative over the historical v0.7/v0.8 notes.

- torobai is the brand. The first navigation item and root route open #api; #fa is
  the optional Persian-specialist category. Remove the former marketplace phrase
  from brand caption, title and footer. Keep specialized sellers and weight licenses.
- Restore one horizontal category row at every width. The user requested scrollbar
  styling, not elimination of horizontal scrolling. Keep native scrolling, focusable
  category links and a focusable rail; bring the selected category into view.
- Use a standard thin scrollbar fallback. Under WebKit scrollbar support, reset
  standard width/color to auto, then use an 8 px transparent track, rounded inset
  thumb and hidden native arrow buttons. Do not hide the whole scrollbar.
- A compact heading replaces the introductory paragraph. Access and quick filters
  share one line where width permits; applied chips only exist when active. Avoid
  decorative banners and large blank introductory areas before products.
- Catalog visuals are 108 px desktop / 96 px mobile; brand marks stay visible, while
  orbit/spark decorations are removed from catalog cards. Detail visuals are kept.
  Five columns at 1440 px+, four normally, three below 1000, two below 700.
- The first catalog row is a curated mix of existing models. It does not imply
  popularity, verified transactions or live usage. Cost sorting is unchanged.

Scrollbar compatibility reference: MDN, ::-webkit-scrollbar (read 11 October 2026):
https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::-webkit-scrollbar
Non-auto standard scrollbar properties override the WebKit pseudo-element styles.
Browser rendering remains a separate, uncompleted verification step on this host.


## v0.10 current uptime and access contract

The user's screenshot rejects the long native meter. Replace it with separated,
rounded square days, inspired by GitHub contribution cells. Green shades indicate
higher availability; warm amber flags the lower daily range. Keep a numerical
legend, date endpoints, aggregate percentage and plain-text expandable daily
history. No animated fake monitoring, countdown or fabricated live status.
The user expressly authorized realistic illustrative data; this supersedes the
historical v0.5 ban on generating a daily display. Provenance remains in data/docs.
The home, horizontal category rail and all v0.9 navigation choices stay intact.

Models can have public or paid files and multiple API providers simultaneously.
Default model pages lead with the cheapest eligible API offer. The access tabs
keep both choices visible; weight mode leads with the file license and never
shows service uptime as a property of the file. The creator's own API is labeled
as such. Added hosting providers quote the exact model version, not an unrelated
checkpoint. Every Persian model has at least two API providers; all four decision
models now have two API offers and their original public download.

Fictional providers have plain text marks, distinct tariff/credit terms and
working local inquiry actions. They do not link to invented businesses. Free
research API access carries its noncommercial scope prominently, including in
requests. Weight purchase is never combined with API monthly costs or implied
to include API hosting, copyright ownership or training data.


## v0.11 review corrections (current interaction contract)

Preserve the established home and visual identity. Fix the interactions where
context or copy contradicted the actual purchase path. A product URL carries its
own seller/access/SSH scope; a prior catalog is used only as a return destination.
Reset controls must remain visible with a single offer. Offer filters keep the
active consumption; API-host and weight-license providers are distinct choices.

Comparison shows both public and paid file access accurately. The common-workload
row uses the same Python estimates as detail pages. Saved mixed product kinds
need an explicit task/unit before price sorting and a removable filter afterward.

Request review includes selected price/usage and immutable original terms, with
editable buyer name and purpose. A file export is not a sent or browser-saved
request. Draft export must work before step 3 so storage failure cannot trap the
user. Offline sharing copies readable information, never a machine-specific path.

Malformed links, failed quotes and blocked storage have visible recovery states.
No pending spinner may remain indefinitely after a known error. Improve dialog
scroll containment, long identifiers and narrow action rows with scoped CSS;
do not replace the restored category rail or add a large home introduction.


## v0.12 current price and browsing contract

The screenshot shows plain provider words colliding inside a tiny logo stack.
Only providers with a local logo enter that stack; all matching sellers remain in
the total and the detail list. No replacement official-looking mark is invented.

One compact workload form above results controls the displayed API totals. In a
mixed catalog, it explicitly identifies text-model settings; each other task keeps
its own native workload. A task category exposes minutes, pages or another relevant
unit. Unapplied edits have a visible pending message. API details allow the same
custom inputs offline and preserve them in links. Two token rates are secondary
facts from the selected offer, not a different seller's cheaper input tariff.

Batch is selectable beside workload, with slower completion stated near the offer.
Only known Batch offers enter that comparison; no support claim is inferred from
the upstream model or general provider reputation. Rates in the presentation catalog
are fixtures, not sourced claims about the named providers.

Result pagination uses full-result filtering and sorting, 20/40/60 items, stable
links, current-page semantics, previous/next controls and a clear result range.
With one page only, hide navigation but retain the page-size control when needed
to reverse an earlier size choice. After page changes, retain the viewport and restore control focus with preventScroll (v0.14).

Design references read 11 October 2026:
- https://design-system.service.gov.uk/components/pagination/ — order of filtering,
  invalid-page recovery and current/previous/next navigation.
- https://developers.openai.com/api/docs/guides/batch — asynchronous job terminology
  and distinction from immediate requests. This source does not substantiate any
  intermediary's Batch support, rates or service window.


## v0.13 in-place consumption updates

Consumption apply/reset stays on the current screen and updates the result region.
Retain the live form and category rail, with no automatic scrollIntoView. The button
shows a fixed-size spinner, results show a subtle progress line and retain their
old geometry until the commit. Busy results cannot open an old offer. Restore
current scroll coordinates after the commit; do not rewind user scrolling during
the pause. Editing cancels the pending update; route changes always win. The
requested presentation pause is 650 ms, omitted for reduced motion. It represents
a local calculation, never a live check against providers.

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


## v0.17: seller discovery and referral

The current product role follows Torob: discovery, consistent comparison and
supplier handoff. A seller profile is reached through every named offer; no
rating, badge or guarantee is inferred from uptime. Profiles combine one model's
API and weight licenses without merging their billing periods. Directory and
profile search use URL state and retain viewport on an in-place query change.

The product overview remains compact and leads with the cheapest eligible offer.
Supplier actions go to existing HTTPS destinations. Request-only offers retain
editable local inquiries. Offer evidence is dated when it exists; no freshness
claim is generated on render. Reports capture a concrete offer, reason and note,
with local storage and text export rather than simulated support delivery.

Price watch is an explicit local snapshot, separate from saved products. It keeps
the workload, acquisition, instant/Batch mode, provider filter, SSH requirement
and version. It compares only that basis with current catalog data. A new version
blocks a price-delta claim, and a removed product remains visible. GPU watches
support bundled rental presets through the rental query key. No synthetic price
history or external alert delivery is presented.

Core pricing and product datasets are unchanged. See REVIEW_V017.fa.md for the
buyer/developer/product-manager review and the official Torob research sources.
