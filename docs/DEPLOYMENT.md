# Put torobai online

The repository contains the full FastAPI application and a standalone HTML
export. Use the Python service for the catalog and free-text chatbot together.

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
