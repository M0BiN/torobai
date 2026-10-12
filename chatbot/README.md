# torobai selection guide

A small Persian shopping guide inside the existing FastAPI/vanilla-JavaScript app.
It asks only for missing information, then shows up to three catalog options and
links to the ordinary filtered results. OpenRouter understands free text; the
application owns filters, prices, product identity and links.

## Conversation UI

The header and launcher share a code-native SVG mark. Messages stay short;
recommendations use compact rows with a shared price period and expandable
usage/evidence. There is only one quick-reply tray, outside the transcript.

`showSheet` opens usage, requirements or privacy in a separate native dialog.
It reuses `TorobMotion`, native focus trapping and Escape. Cancel leaves both
needs and history unchanged. Settings and composer choices use separate arrays.
Applying a workload adds a short, readable summary rather than a full form.

`append` keeps the last question visible when following the conversation. If the
reader has moved up, a reply preserves the scroll position and exposes a
new-message button. Closing and reopening retains the conversation. Desktop can
widen; mobile uses the whole viewport. Reduced-motion preferences are honored.

## Run

From the project root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENROUTER_API_KEY='your-openrouter-key'
# Optional; this is already the default.
export OPENROUTER_MODEL='openai/gpt-4.1-mini'
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000` and select **کمک به انتخاب** beside search.

On Windows PowerShell, activate with `.venv\Scripts\Activate.ps1` and set:

```powershell
$env:OPENROUTER_API_KEY = 'your-openrouter-key'
$env:OPENROUTER_MODEL = 'openai/gpt-4.1-mini'
python -m uvicorn app.main:app --reload
```

`chatbot/.env.example` documents the two variables; the application does not
implicitly load an env file. Keep the real key in the server environment. No key
is sent to browsers, included in the portable export, or accepted in requests.
Changing the model requires a model/provider with structured-output support.

Without a configured key, the same panel offers guided choices. The standalone
HTML also supports these choices, consumption/budget edits and real catalog
links without network access. Arbitrary free-text interpretation runs in the
served application. Opening a file is not a workaround for server credentials
or browser origin restrictions.

## Read the code in this order

| File | Responsibility |
| --- | --- |
| `static/core.js` | Pure state changes, next question, task choices and recommendation decisions. |
| `static/panel.js` | Conversation UI, actual pending feedback, retry/cancel, editable needs and navigation. |
| `api.py` | Typed input/output, limits and one OpenRouter request. |
| `prompt.txt` | Persian intent-extraction instructions; no prices or recommendation generation. |
| `catalog.py` | Coding-evidence filter derived from the project's existing published benchmarks. |
| `tests/` | Provider-contract tests and conversations against the exported application. |
| `AGENTS.md` | Chatbot-specific requirements that extend the root development guide. |

The app supplies its existing functions to the panel once at startup. This small
integration is at `start()` in `app/static/app.js`; it is not a second catalog.
New code uses `catalogRows`, `catalogQuote`, `catalogFilterURL`, `href` and the
existing exact compiled pricing plans. Approved local listings and tariff changes
therefore also affect guide results. No new runtime package is required.

## One request, one decision

1. A known choice directly changes needs; it does not call an LLM.
2. Free text goes to `POST /api/chatbot/parse`, with bounded recent messages,
   current needs, the current page and previous card references.
3. OpenRouter returns a validated `set`/`unset` patch and an intent. It does not
   supply executable tools, product cards, prices, arbitrary URLs or HTML.
4. `updateNeeds` applies the patch. Changes in task/access clear incompatible
   fields; privacy and unresolved essential requirements remain explicit.
5. `decide` asks a useful missing question or filters the effective catalog.
6. The existing quote function supplies prices for the same eligible offer.
   A click opens the normal site route. The guide never navigates on its own.

The server makes one non-streaming request, with a 22-second overall deadline.
There is no agent loop, automatic paid repair call, database, vector store or
framework migration. Schema validation occurs even when the provider claims
strict output. Failures keep the previous needs and offer a retry or choices.

## Behavior that matters

- Default discovery covers the ordinary model/API catalog. Persian-specialist
  filtering requires an explicit need, not simply writing a message in Persian.
- Coding means “has a published coding evaluation in this catalog”, not a
  fabricated suitability score. A benchmark source and model revision still
  need checking on the existing performance page. Scenario values never qualify.
- The `usecase=coding` and `max_cost` parameters are normal visible catalog
  filters. Prices, workload, Batch mode and GPU rental preset round-trip in links.
- API costs use the existing monthly consumption basis; weights use their file/
  license price; GPU uses the entire selected 8/24/72-hour rental preset.
  Missing usage fields visibly use the normal preset. Nothing converts an
  unknown workload into zero. Budget period changes need an explicit choice.
- The same offer must support every selected API capability. Unknown support is
  not confirmed. A low-price offer cannot borrow another seller's capabilities.
- Essential requirements without catalog evidence remain visible and results
  are labeled as candidates needing verification. Users can explicitly remove
  those requirements. No automatic relaxation or invented “best model” score.
- Named-model comparisons resolve to exact catalog identities; uncertain names
  go to the existing benchmark selector rather than a guessed model version.
- A multi-model request is split into task choices. Component prices are not
  advertised as a complete system cost. Publishing a user's model opens the
  existing new-model or existing-model offer workflow, without claiming submission.
- Previous recommendation links retain their original identity, provider, workload
  and catalog revision. Current replies live only in the composer. “The second
  one” refers to the last displayed result set. Corrections rerun the full catalog.
- Navigation/need changes defeat stale replies. Changed catalog revisions are
  checked again before accepting a reply or following a recommendation.
- After following a result, changed catalog filters can be adopted explicitly
  back into the conversation. User needs are not silently overwritten.
- The dialog uses the site's motion, native modal focus behavior and Escape.
  Conversation scroll does not scroll the page; reading older messages is
  respected. Ready local choices do not show artificial loading.

## Boundaries

Visible conversation history is held only in memory for the current document.
Reloading or **گفتگوی تازه** clears it. Parser context keeps at most 60 short
messages internally; only the recent six
messages and required structured context go to OpenRouter. The application does
not log prompt bodies or persist a chat transcript. OpenRouter/provider retention
is governed separately by the account and provider settings; no zero-retention
claim is made by the guide. The panel explains this before sending messages.

The endpoint rejects foreign/null browser origins, unexpected fields, oversized
bodies and invalid model output. Its limits are 20 requests/minute per source IP,
120 requests/minute total and eight concurrent calls **per process**. Before
multi-worker public hosting, enforce an equivalent shared limit at the edge and
set a spending limit on the OpenRouter key. There is no new authentication system.
Client cancellation stops applying the reply; an already accepted upstream call
may still finish and be billed.

The existing inference-memory planner is not a training guarantee. Dialect
quality, realtime audio deadlines, commercial rights and deployment geography
remain unverified unless the catalog explicitly supports them. The guide does
not execute model jobs, buy weights, create accounts, or send support tickets.

## Check

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q tests chatbot/tests
python scripts/export_catalog.py
node --test tests/*.cjs chatbot/tests/*.cjs
```

Node DOM tests use the project's existing `linkedom` test dependency. The test
transport checks the actual OpenRouter URL, authentication header, JSON schema,
provider parameters and result validation without a paid API call. The UI test
executes the full export and checks quote/destination parity, Persian consumption,
zero budgets, task changes, GPU presets, empty-result recovery, seller links,
named benchmarks, pending feedback and stale replies.

Browser checks for v0.26 cover actual Chromium desktop/mobile layouts, compact
rows, visible last question, settings bounds, nested-dialog Escape and history
preservation. See docs/REVIEW_V026.md for tested sizes. A paid live Persian-language
evaluation remains necessary for language quality and latency. No measured
two-turn success rate is claimed.

Official integration references checked on 2026-10-11:

- https://openrouter.ai/docs/api/reference/overview
- https://openrouter.ai/docs/guides/features/structured-outputs
- https://openrouter.ai/openai/gpt-4.1-mini
