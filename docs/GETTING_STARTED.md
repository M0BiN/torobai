# Run and develop torobai

Compare AI models, API providers and GPU rentals in one place.

torobai helps Persian-speaking users find a model, understand its cost and
choose a provider. The same model can have several API offers, downloadable
weights or a paid license. Those choices stay together, with their prices and
terms kept separate.

## What you can do

- Search models by task, language, access and required capabilities.
- Compare costs using your own workload, including Batch requests.
- Compare model benchmarks and GPU specifications with their sources.
- Find Persian speech, translation, OCR and other specialized models.
- Ask the selection guide for help and open results with the right filters.

The interface is plain HTML, CSS and JavaScript. FastAPI serves the catalog,
pricing and chatbot. OpenRouter handles the chatbot's language understanding;
the application builds recommendations from the catalog.

## Run locally

Use Python 3.12. From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Open <http://127.0.0.1:8000>. On Windows, activate the environment with
`.venv\Scripts\Activate.ps1` in PowerShell.

To enable free-text chat, set `OPENROUTER_API_KEY` in the server environment
before starting the app. `OPENROUTER_MODEL` defaults to `openai/gpt-4.1-mini`.
The key stays on the server. Without it, the guide still works through its
ready-made choices. See [the chatbot guide](../chatbot/README.md) for details.

## Deploy

[render.yaml](../render.yaml) runs the full application as a Python web service.
Connect this repository to Render, create a Blueprint, and add the OpenRouter
key in the service's environment settings. The file selects a free instance
and waits for passing GitHub checks before automatic redeploys.

See [deployment notes](DEPLOYMENT.md) for the first deployment and checks.
GitHub Pages can host the standalone HTML, but cannot run the Python chatbot.

## Check a change

Node 24 is used for the JavaScript tests. It is not needed to run the server.

```bash
npm ci
python -m pytest -q tests chatbot/tests
python scripts/export_catalog.py
npm test
```

The tests cover catalog filtering, exact prices, navigation, conversations and
the standalone export. GitHub Actions runs the same checks on pushes and pull
requests. HTTP tests use controlled replies rather than paid model calls.

## Build a standalone page

```bash
python scripts/export_catalog.py
```

Open `dist/torobai.html` directly in a browser. Fonts, catalog data and scripts
are embedded. Guided chat works offline; free-text chat uses the hosted app.

## Find your way around

| Path | Contents |
| --- | --- |
| `app/main.py` | HTTP routes and application setup |
| `app/market.py`, `app/pricing_plan.py` | Filtering and price calculations |
| `app/data/` | Models, provider offers, benchmarks and provenance |
| `app/static/` | The Persian interface |
| `chatbot/` | Selection guide, OpenRouter integration and tests |
| `scripts/` | Catalog export and maintenance commands |
| `tests/` | Application regression checks |
| `docs/` | Design decisions, sources and release notes |

## Working with the catalog

Prices are checked-in observations and reference entries, not a live price
feed. Benchmark records distinguish published results, scenarios and missing
evidence. Illustrative availability history is kept separate from measured
service reliability.

Saved items, seller drafts and review workspaces currently live in the browser.
Hosting the app does not turn these into shared accounts or a payment service.
Read [AGENTS.md](../AGENTS.md) before changing product behavior; earlier changes
are recorded in [the release notes](CHANGELOG.md).
