# Put torobai online

The repository contains the full FastAPI application and a standalone HTML
export. Use the Python service for the catalog and free-text chatbot together.

## GitHub Pages

The standalone site is published by `.github/workflows/checks.yml`. It runs the
Python and JavaScript checks, exports the application, then uploads only the
generated HTML for deployment. Pull requests run checks without publishing.

### Enable the site once

1. Open [Settings → Pages](https://github.com/M0BiN/torobai/settings/pages).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open [Check and publish torobai](https://github.com/M0BiN/torobai/actions/workflows/checks.yml).
   Choose **Run workflow** on `main`, or re-run a deployment that failed before
   Pages was enabled.
4. Wait for **Publish on GitHub Pages** to finish. Its `github-pages` environment
   links to the published site.

The project URL is `https://m0bin.github.io/torobai/`. The same self-contained
file is available at `https://m0bin.github.io/torobai/torobai.html` for saving
locally. These URLs become available after Pages is enabled and deployment succeeds.
Every successful check on a later `main` push publishes the updated export.

The upload directory contains `index.html` and `torobai.html`, both built from
`dist/torobai.html`; it does not expose the Python source or environment files.
The export embeds its catalog, fonts, images, styles and scripts, so product
links and hash-based navigation work under the repository's `/torobai/` path.

Pages hosts static files only. Catalog browsing, comparisons, local saved state
and guided chat choices run in the browser. Free-text OpenRouter chat requires
the Python service below. Never add an OpenRouter key to the export or workflow.

If the configuration step reports that the Pages site cannot be found, check the
one-time Source setting above. The workflow deliberately does not try to enable
Pages with its `GITHUB_TOKEN`: initial enablement needs repository administration
access. A failed test does not replace the previously published site.

## GitHub repository

Use `torobai` as the repository name. Suggested description:

> Compare AI models, API providers and GPU rentals, with a Persian-first interface.

Start with a private repository unless its owner chooses to publish the source.
The default branch is `main`. A suitable first commit is:

> Add the model catalog, comparisons and selection guide

The repository excludes local environments, generated exports, dependency
folders and real env files. `chatbot/.env.example` documents the two chatbot
settings. Keep credentials in the hosting service's secret environment settings.

## Render service

1. Connect the GitHub repository to Render and create a Blueprint from `render.yaml`.
2. Set `OPENROUTER_API_KEY` in the environment settings to enable free-text chat.
3. Keep the default `OPENROUTER_MODEL`, or choose an OpenRouter model that supports
   the structured-output contract described in the chatbot guide.
4. Wait for the build and health check to succeed, then open the returned URL.

The Blueprint uses Python 3.12 and a free web-service instance in Frankfurt.
One Uvicorn worker keeps the chatbot's process-local request limits consistent.
No database or paid compute resource is created by this configuration.
After the first deployment, automatic redeploys wait for passing GitHub checks.

## Check the first deployment

- `/api/health` should return `ok: true`.
- `/api/catalog` should return products and price scenarios.
- `/api/chatbot/status` should report `available: true` after the key is set.
- Open a model, edit consumption and follow a recommendation from the chatbot.
- Send one short chat message to check the provider connection. This uses the
  configured OpenRouter account and may incur model charges.

A successful status response only confirms that a key is configured. A real chat
request is still needed to verify the upstream account and selected model.

## What hosting changes

The server serves the site and handles text understanding. Saved items, seller
drafts and review workspaces still belong to the current browser. No shared user
database or checkout is added by deployment.

GitHub Pages can serve the exported HTML but cannot run the Python API. Keep the
OpenRouter key on the Python service, never in the HTML or repository.

## References

- [Deploy FastAPI on Render](https://render.com/docs/deploy-fastapi)
- [Render Blueprint fields](https://render.com/docs/blueprint-spec)
- [Choose a Python version](https://render.com/docs/python-version)
- [GitHub Pages capabilities](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
