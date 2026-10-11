# Research and decisions for v0.5 — 11 October 2026

The latest user correction preserves the previous consumption-based comparison.
The changes below concern discovery, product recognition and reliability. This
extends the four-product Torob study documented in RESEARCH.md. Sources were
retrieved across several targeted passes, not inferred from a single search.

## Marketplace patterns

| Primary source inspected | Observation and implemented decision |
|---|---|
| https://torob.com/ and https://torob.com/search/?query=rtx%204090 | Product identity, compact navigation and category-specific narrowing: larger maker marks, contextual specifications and horizontal filters. |
| https://torob.com/shop-list/ | Dedicated provider discovery and return paths: add an eight-provider directory with actual destinations and catalog counts. |
| https://torob.com/pages/safe-shopping-guide/ | Purchase conditions belong near the next action: preserve minimum credit, access, billing commitment and the seller destination. |
| https://torob.com/pages/support/ | Clear ownership of the transaction: torobai compares; the seller fulfills the service. No invented internal checkout. |
| https://www.digikala.com/search/category-graphic-card/ and https://www.digikala.com/brand/apple/ | Retail category discovery and visible filter state: quick conditions, individually removable chips and an advanced dialog. Direct category retrieval was a thin shell; no screenshot-based claim. |
| https://www.digikala.com/product/dkp-20481188/ | Seller offers, conditions and grouped specifications: retain distinct provider rows and useful details. Physical delivery, seller scores and stock are not transferred to API services. |
| https://openrouter.ai/openai/gpt-4o-mini | Separate input/output unit rates and provider-level facts: show output alongside input from the same offer. Preserve the user's consumption comparison. |
| https://openrouter.ai/tencent/hy3 | Provider uptime/availability have defined scopes. Adopt a distinct reliability section, not an unexplained green dot. |
| https://openrouter.ai/docs/guides/routing/provider-selection | Provider selection is meaningful only with its constraints. A provider filter narrows catalog rates, offer rows and scenario summaries consistently. |
| https://getdeploying.com/gpus | GPU memory filters, real billing units and exclusion of unpriced offers from cheapest rankings. Preserve per-card VRAM, SSH and booking commitments. |
| https://www.gpurun.com/ | Compute-rental context and provider access paths. No retail shipping semantics added. |

Recent visits and saved selections support returning buyers. Search suggestions
and Ctrl/Cmd+K make the catalog easier to reach. Filters use native labeled form
controls; advanced choices apply together, and cancel leaves the URL unchanged.
No account shell, fake reviews, invented purchases, stock counts or nonfunctional
price-alert signup were added.

## Typography

Torob's current global CSS declares `iranyekan`. The RTX 4090 search response
preloads regular and bold files under `/static/fonts/iranyekan/`. Verified CSS:
https://torob.com/static/css/index-version-2.8.0.min.css.

The publisher's product page distinguishes desktop use from web/app embedding:
https://fontiran.com/fonts/iranyekan. The delivered project contains no copied
IRANYekan font. It bundles official OFL-licensed Vazirmatn instead, including its
license, and documents the licensed IRANYekan replacement in ASSETS.md.

## Reliability: evidence, not simulated telemetry

Source: https://www.1xai.ir/status, captured on 2026-10-11. The last retrieved
published aggregate covers **2026-09-12 through 2026-10-11**. The last day is
partial. Snapshot data is stored in `app/data/reliability.json`.

| Upstream group through 1xAi | Reported success | Eligible requests |
|---|---:|---:|
| OpenAI | 99.9% | 81,376 |
| Gemini | 99.9% | 29,491 |
| Anthropic | 99.9% | 22,773 |
| DeepSeek | 95.4% | 18,144 |

These are the publisher's eligible-request success rates for model groups, not
model-specific or wall-clock uptime, independent probes, or current guarantees.
The denominator excludes caller errors under its published method. Only original
1xAi offers map to a matching upstream group; planning-catalog offers do not
inherit those numbers. Each visible measure retains the group, fixed window,
source and a methodology note. CC BY 4.0 attribution is linked in the panel.

The dataset endpoint was located at https://www.1xai.ir/status/dataset but its
full daily history was not obtained. No daily series is presented. The scalar
meter represents only the published aggregate; the current 24-hour summary is
not imported as a live indicator. A previous retrieval returned an earlier
window; the stored snapshot uses the final retrieval above.

https://servernet.cloud/status states that historical uptime percentages are not
yet published. https://servernet.cloud/sla describes contractual credits. Neither
establishes a measured GPU percentage. Show official status/SLA destinations and
an explicit unknown percentage. Other providers without verified public data
also remain unknown; absence of data does not mean an outage.

## Research limits

Torob HTML, CSS, search, shop directory and information pages were read. Browser
navigation did not return usable images in the earlier study. This is a
structural/content/CSS investigation, not a completed pixel audit. No customer
interview, purchase, API call or independent infrastructure monitoring took place.
