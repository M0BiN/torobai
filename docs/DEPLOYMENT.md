# Put torobai online

The repository contains the full FastAPI application and a standalone HTML
export. Use the Python service for the catalog and free-text chatbot together.

## Docker

Docker Engine with Compose v2, or Docker Desktop, runs the complete application:

```bash
docker compose up --build --detach --wait
```

Open <http://127.0.0.1:8000>. `--wait` returns after the health check succeeds.
For free-text chat, copy `.env.example` to `.env`, fill in the key and run the
command again. Keep `.env` private; it is excluded from Git and the build context.
Compose passes only the declared variables into the container.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8000` | Host port published by Compose, bound to `127.0.0.1`. |
| `OPENROUTER_API_KEY` | Empty | Enables free-text chat when configured. |
| `OPENROUTER_MODEL` | `openai/gpt-4.1-mini` | Structured-output model used by the guide. |
| `FORWARDED_ALLOW_IPS` | Empty | Addresses of reverse proxies trusted to supply client IP and protocol. |

The key is supplied at runtime, never as a build argument or image layer. People
with access to the Docker daemon can inspect container environment variables;
restrict daemon access as you would access to the server itself. A configured
key makes the status endpoint available; it does not prove the provider accepts it.

### Runtime

The image uses the official Python 3.12 slim Bookworm base pinned by digest.
Runtime dependencies, including transitive dependencies, are pinned in
`requirements.txt`; development adds `requirements-dev.txt`. Dependencies are
installed before copying source so ordinary code edits reuse that build layer.
All dependencies use wheels. There is no frontend build step: FastAPI serves the
checked-in HTML, scripts, fonts and catalog directly.

The process runs as UID/GID `10001`, with root-owned application files. Compose
adds a read-only filesystem, drops Linux capabilities and prevents privilege
escalation. Its logs rotate at 10 MB with three files. Uvicorn writes operational
logs to stdout/stderr; access logs are disabled to avoid recording search queries.

Uvicorn runs directly as the container process with one worker. Chat rate and
concurrency limits are process-local; keep one instance until shared limits are
in place. The server allows 25 seconds for active requests to finish, and Compose
allows 30 seconds before forcing termination. The existing upstream deadline is
22 seconds. `/api/health` checks the local application without a provider call.
Docker marks repeated failures as unhealthy; the restart policy restarts an exited
process, not a process that merely becomes unhealthy. Monitor that state on a host.

The service requires no writable volume. Catalog data ships with the image;
saved products, requests and drafts remain in each browser. To change the catalog,
rebuild the image from the updated source.

### Updates and checks

```bash
docker compose build --pull
docker compose up --detach --wait
docker compose ps
docker compose logs --tail=100 web
```

Run `make test-docker` before shipping a changed image. It builds the Compose
service, checks HTTP routes and static assets, verifies non-root/read-only
execution and excluded env files, checks chat configuration without a paid call,
and verifies graceful shutdown. GitHub Actions runs it alongside the application
tests on pull requests and pushes. Pages publication requires both jobs to pass.

Update the base digest deliberately when Python or Debian fixes are available;
`--pull` cannot move a pinned digest. Resolve dependency updates in a clean
Python 3.12 environment, review the full runtime dependency set, then run the
application and container checks. This repository builds images locally and in
CI; it does not upload images to a registry.

### Public hosting

The default host binding is local. Put a TLS reverse proxy in front of it when
hosting publicly, preserve the original `Host`, and send `X-Forwarded-For` and
`X-Forwarded-Proto`. Set `FORWARDED_ALLOW_IPS` to the proxy address as seen by the
container; Docker networking can make it differ from the host's loopback address.
Avoid trusting `*` on a directly reachable service: the client IP controls chat
rate limits. Give the proxy a response timeout above the 22-second chat deadline.

For an existing container platform, build `Dockerfile` and expose port 8000.
The image accepts `UVICORN_PORT` to change its internal listener and health-check
port together; publish the corresponding port in that platform. In Compose,
`PORT` changes only the host port. Configure the provider key in the platform's
runtime environment and set its account spending cap before public free-text use.

### Design references

The reviewed examples below informed the container setup:

| Source | Applied here |
| --- | --- |
| [Aider Dockerfile](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/docker/Dockerfile) | Python slim base and an explicit non-root user. |
| [LiteLLM Dockerfile](https://github.com/BerriAI/litellm/blob/102619d47a78d80f0383c9e8f52446046f0ecc6b/Dockerfile) | Pinned base image, dependency caching and deliberate runtime contents. |
| [OpenHands Dockerfile](https://github.com/OpenHands/OpenHands/blob/fa1f724ab5737a17453ad6081129eb91c5a423c6/docker/Dockerfile) | Copy dependency metadata before source and keep process startup explicit. |

The app needs no compiled frontend, system build tools or process supervisor,
so one image stage is enough. Docker's [build guidance](https://docs.docker.com/build/building/best-practices/)
and the [FastAPI container guide](https://fastapi.tiangolo.com/deployment/docker/)
cover the base-image and process decisions. See [Uvicorn settings](https://uvicorn.dev/settings/)
for proxy trust and shutdown options.

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
4. Set `FORWARDED_ALLOW_IPS` to the trusted proxy addresses or networks for the
   deployment. Uvicorn needs the original HTTPS scheme for the chatbot's origin
   check and the client IP for rate limits. Follow the
   [proxy configuration above](#public-hosting); do not assume a wildcard is safe
   when the service can also receive direct traffic.
5. Wait for the build and health check to succeed, then open the returned URL.

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
- [FastAPI behind a proxy](https://fastapi.tiangolo.com/advanced/behind-a-proxy/)
- [Render Blueprint fields](https://render.com/docs/blueprint-spec)
- [Choose a Python version](https://render.com/docs/python-version)
- [GitHub Pages capabilities](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
