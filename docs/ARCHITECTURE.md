# Architecture — v0.12

This is the v0.12 architecture record, not the current agent entry point.
Use the code ownership map in [AGENTS.md](../AGENTS.md) and the
[current product contracts](PRODUCT_CONTRACTS.md) for new work.

## Records and responsibilities

| Record | Key fields | Responsibility |
|---|---|---|
| Product version | id, model_id, version, task, unit, maker, publisher_type | What the buyer is selecting |
| Persian capability | language_detail, base_model, training_data, privacy, limitations | Why it fits a Persian task |
| API/GPU offer | product_id, seller_id, rates, unit, purchase path | Recurring consumption or rental |
| Weight license | product_id, price_toman, one_time, rights, support, requirements | One-time rights to run this version |
| Seller | identity, person/company, terms, source links | Publisher or reseller |
| Display reliability | basis, measured=false, offer ID, percent, daily dates/percentages | Requested illustrative uptime |
| Observed reliability | existing source and historical group scope | Preserved external evidence |
| Listing draft | model card, base license, data rights, access terms | Browser-local authoring and JSON handoff |
| Purchase request | selected version, offer snapshot, purpose, organization | Browser-local request and text/JSON handoff |

Products use kind=api for the existing model namespace, even if only weights are
available. Acquisition is not inferred from this field: it comes from offers,
weight_offers and weights_url. No framework or billing-engine migration was needed.

## Routes

- Root / `#api`: default complete model/API catalog.
- `#fa`: optional Persian-specialized category, task and acquisition filters.
- `#api`: complete model/API catalog; `#gpu`: existing rental catalog.
- `#api/<id>`: model and API offers; `?access=weights`: weight purchase/download.
- `#publish`: local authoring, preview, drafts, edit/delete and JSON export.
- `#requests`: local purchase requests; export/delete, with no claimed sending.
- Existing saved/compare/providers/recent routes remain.

`GET /api/market` accepts persian_only, access and publisher filters. Catalog
estimates and POST /api/estimate share Python arithmetic. New page and request
units have separate scenario fields. UI sort keys never combine weight purchase
with API consumption. Unknown costs stay last in both price directions.

## Scope of the current transaction path

There is no checkout, remote listing publication, message delivery or entitlement
store. Drafts and requests use localStorage and fail visibly when storage is
unavailable. Exported JSON contains metadata and selected terms, not model files,
secrets or training datasets. Downloads are initiated only by user actions.

For a deployed marketplace, add identity-bound database records, seller review,
version-pinned contracts, payment confirmation and revocable file entitlements.
Private weights need authenticated object storage and signed delivery URLs; they
must never be embedded in this portable catalog. API keys require a server-side
secret store. Draft metadata is not sufficient evidence of redistribution rights.
These are future integration points, not pretend endpoints in the present code.

## Review

A buyer can switch acquisition type without changing model identity. A model
owner can disclose the base license and data provenance without uploading private
data. Support and update terms are explicit. A paid license is neither open-source
access nor automatic ownership transfer. Persian language specialization is not
inferred merely from having an Iranian reseller.


## v0.8 discovery and local recovery

`search_terms` stores task synonyms on products; both Python filtering and the
portable client include it, plus base-model/language metadata. It is search-only,
not a display tag or a pricing field. Public weight offers are enriched with the
same seller identity as API offers. The client provider filter intersects both
acquisition paths and keeps unrelated public download links out of those results.

`torobai.listing.work` stores the one current in-progress listing; each input/change
and route exit persists it. Explicit saved drafts remain in `torobai.listings`.
A new form clears only the current work record. Storage failure remains visible.
`torobai.requests` retains the selected offer snapshot. Text export formats this
snapshot for people; JSON retains its complete structured terms. No server write,
authentication or send operation was added. Local records remain browser-specific.


## v0.10 daily history and provider offers

`presentation_reliability.json` includes `window_start`, `window_end` and 30 daily
percentages per offer. Equal full UTC days make the mean directly comparable to
the aggregate. Daily deficits were distributed deterministically from each offer
ID and the prior aggregate. This is presentation fixture generation, not telemetry.
The UI classifies daily percentages as 100 / [99.5,100) / [98,99.5) / below 98.
A single row becomes two rows at 650 px, keeping every tile square. Text history
exposes the same dates and values without relying on hover or color perception.

A product still owns its model identity and weights destination. Added records
in offers.json point to fictional seller IDs narvan-cloud, rayan-model and
sepidar-ai; they are not inserted as model makers. `provider_role` distinguishes
creator from host. `service_terms` holds request limits, use scope and privacy.
No secrets, invented API endpoints, remote registration or payments are added.

The noncommercial ParsinLU offers set `access_scope: noncommercial`, an explicit
monthly character quota and zero per-offer minimum credit. `estimate_offer`
respects this override and excludes quota violations. Its terms remain visible
before the action and in request snapshots. All inherited offer arithmetic is
unchanged. The seven fictional paid-license publishers now each provide an API
for that same model as well as a separate one-time weight license.


## v0.11 route and snapshot boundaries

`HB.routeState` validates known routes and query values. Product links carry
provider/SSH/access and optional Persian origin. `catalogURL` supplies navigation
back to results only; it is no longer a hidden seller-filter source. Offer-filter
changes update the current view and guarded browser history without replacing
the selected usage. Related cards explicitly use their own unfiltered context.

Pure filtering optionally consumes Python preset estimates when the buyer asks
for calculable prices. Monthly-only GPU terms cannot become a short-term quote.
Common-workload comparison is presentation of existing Python output; no second
JavaScript pricing engine was added. Backend numeric validation is strict.

Request records add `unit`, optional `estimate_toman`, `scenario` and `usage_text`.
Edits preserve the original deal/terms/created date, replace buyer inputs under the
same ID and add `updated_at`. Text export uses the snapshot's unit, not the latest
catalog. An unsaved export uses `status: exported_only`; local saved requests use
`saved_locally`. Neither indicates remote delivery. Legacy valid records remain
readable; malformed request shapes are excluded from actions without deleting
the stored bytes merely because a page was opened.

Incomplete listing JSON exports have `complete: false` and remain drafts. Their
availability does not bypass validation for a completed saved listing. Current
in-memory form state also survives navigation if persistent storage is blocked.
No account, upload endpoint, payment, publication or secret handling was added.


## v0.12 pricing plans and result state

`pricing_plan.py` compiles offers and separate Batch terms into sum-of-products
terms, eligibility checks and a long-context branch. Python and portable JS share
that data contract, round only the final total to 0.01 toman, and are checked against
one another across 4,140 scenarios. Existing GPU billing remains untouched.
`batch_terms.json` carries illustrative per-offer support, rates, completion hours
and max requests per job. It is not a job API, provider integration or live evidence.

Hash state owns applied usage, mode, page, size and filters. Draft form input is
not applied until submission. Prices and ordering use the same state. Pagination
slices the already-sorted full catalog; this implementation loads the finite
catalog locally, and is not server-side pagination over an unbounded inventory.

Publisher draft fields support Batch rates and terms. Buyer snapshots retain the
selected effective rates and mode. These remain browser-local records and exports.
