# v0.25 — an integrated selection guide

## Scope before implementation

- Keep the existing FastAPI and browser catalog. One readable `chatbot/` folder
  holds the backend, prompt, pure dialogue decisions, panel, styles and tests.
- The user's attached Ponytail instructions apply; copy them unchanged into the
  folder. Use the existing httpx/Pydantic dependencies and price/navigation tools.
- Default language parsing uses OpenRouter, with server-only configuration.
- Reach the server router/static mount, page scripts/entry, catalog evidence,
  shared filters/quotes, portable export and existing guide-button test caller.

## Predicted failures and decisions

- A second server catalog disagrees with approved browser-local listings: keep
  recommendations on the effective catalog; only parse language on the server.
- Generated URLs do not apply real filters: add visible coding-evidence and cost
  filters and one state-independent URL builder shared with ordinary results.
- Model capabilities differ by offer: share the exact current offer/quote path.
- GPU rental cards formerly quoted the standard preset regardless of view: let
  shared catalog values/quotes respect the selected preset, including guide links.
- Provider-scoped weight quotes must respect the provider in the same shared helper.
- A correction, new choice or route can race an LLM response: use cancellation and
  request/catalog revisions; don't cache rendered replies or silently overwrite needs.
- Free-text in file mode would expose a key or break origins: offer ready guided
  choices; the served app owns language parsing. Do not permit null-origin CORS.
- Unsupported essential conditions cannot be treated as satisfied: preserve them
  next to provisional options and permit explicit removal only.

## Review passes

Buyer: supports discovery without knowing tokens, selecting API versus weights,
price-first choices, Persian tasks, GPUs, benchmark links and offering one's model.
Usage assumptions are visible; no price is labeled as a total multi-model system.

Developer: one typed provider call, explicit patches, no agent loop, no new runtime
package, bounded context and request rates, neutral upstream errors. Tests cover
invalid output and the integration contract without spending API credits.

Product: use a compact entry near search and the existing guide entry. Do not
open automatically. Cards show real catalog prices and their units. Missing
provider capability can produce zero matches; never fabricate support to fill it.
Current public real-model offers lack confirmed tool metadata in several cases,
so combining published coding evidence with tools can legitimately be empty.

## Validation boundary

See chatbot/README.md and docs/REVIEW_V025.fa.md for actual checks and limitations.
No paid OpenRouter inference or confirmed browser-rendering inspection is claimed.
