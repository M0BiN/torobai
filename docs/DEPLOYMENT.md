# Build, deploy and operate torobai

This is the operational runbook for torobai: building a release, serving it,
checking it, updating it and recovering from a failed deployment. Read it with
[AGENTS.md](../AGENTS.md) and [SECURE_CODING.md](SECURE_CODING.md). Keep operational
procedures here, security rules in that guide and local development in
[GETTING_STARTED.md](GETTING_STARTED.md).

| Target | Use |
| --- | --- |
| Local development | Python 3.12 and `make run`; Node 24 is needed for tests, not serving. |
| Full application on a server | The [production server procedure](#production-server): one Docker container behind a TLS proxy. |
| Static website or downloadable HTML | [GitHub Pages](#github-pages); guided choices work, but free-text chat needs the Python service. |
| Managed Python hosting | The existing [Render service](#render-service). |

There is no frontend compilation or database migration. FastAPI serves the
checked-in interface and catalog. `python scripts/export_catalog.py` builds the
separate self-contained HTML; it is not a prerequisite for serving FastAPI.
The full application expects the root of a dedicated hostname. Do not place it
under `/torobai/` without adapting and testing its absolute API and asset paths;
the Pages export already supports its repository subpath.

Use [release checks](#release-checks) before deployment, [acceptance checks](#acceptance-checks)
before opening traffic, and [routine operations](#routine-operations) afterward.
The host instructions below are a recipe to validate on the chosen server;
repository CI does not verify that server's DNS, TLS, firewall or backup recovery.

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

For a disposable local Compose installation:

```bash
docker compose build --pull
docker compose up --detach --wait
docker compose ps
docker compose logs --tail=100 web
```

On a real server, use the retained images and configuration in
[updates and rollback](#updates-and-rollback) instead of overwriting the only
available image. A failed health check does not automatically roll a release back.

Run `make test-docker` before shipping a changed image. It builds the Compose
service, checks HTTP routes and static assets, verifies non-root/read-only
execution, readable assets from a private checkout and excluded env files. It
also checks chat configuration without a paid call and verifies graceful shutdown.
GitHub Actions runs it alongside the application
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
The [server procedure](#production-server) gives a concrete host-proxy setup and
checks the HTTPS origin without making a paid request.

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

## Release checks

Choose a full commit SHA whose application and container jobs passed. Keep the
checkout clean and record the SHA, image ID, CPU architecture, deployment time
and configuration changes. A branch name or the application version string is
not enough to identify the running release.

On a development machine or CI runner with Python 3.12, Node 24 and Docker:

```bash
python -m pip install -r requirements-dev.txt
npm ci
make test
make test-docker
```

`make test` checks Python behavior, generates the portable HTML, runs the Node
checks and validates the main script's syntax. The container check uses a separate
Compose project, a temporary port and absent/dummy credentials. It makes no paid
call. Run builds and these checks away from a busy production host; the Docker
check starts real containers and consumes host resources.

CI exercises its Linux runner architecture. If the destination uses a different
architecture, run the container check there or on a matching staging machine;
do not assume all pinned wheels are available. The deployment host itself needs
Docker, Compose, Git and curl, with no host Python or Node installation required.

## Production server

This procedure uses a Linux server with systemd, rootful Docker Engine, the
Compose v2 plugin and Caddy running on the host. An existing equivalent TLS proxy
can be retained if it satisfies [public hosting](#public-hosting). The examples
use `/srv/torobai`, `/etc/torobai` and `torobai.example.com`; replace the hostname
with the domain you control. Run the shell blocks in Bash, in order, and stop if
a command fails. Run only one deployment at a time.

### Prepare the host

Install a supported Docker Engine and Compose plugin using the
[official installation instructions](https://docs.docker.com/engine/install/),
and [install Caddy](https://caddyserver.com/docs/install) as a system service.
Use Docker Engine 28 or newer: older releases have a documented limitation that
can expose localhost-published ports to machines on the same network segment.

- Give one trusted deployment account access to the checkout, private configuration
  and Docker. Docker daemon access effectively grants control of the host.
- Point the domain's A record, and AAAA only if IPv6 actually works, at the server.
  Permit public TCP 80 and 443 for this Caddy setup. Keep SSH restricted to the
  management path and verify it before changing firewall rules. Do not expose
  port 8000 or the Docker API publicly; verify from a separate machine.
- Allow DNS and outbound HTTPS for image/package retrieval, certificate issuance
  and OpenRouter when chat is enabled. Keep the host clock synchronized.
- Reserve memory and disk headroom for the running app and at least one previous
  image. Size from observed traffic and container usage; the repository does not
  establish a production capacity guarantee or configure a container memory cap.

```bash
set -euo pipefail
sudo systemctl enable --now docker
docker version
docker compose version
docker context show
docker info --format '{{.Name}} ({{.OSType}}/{{.Architecture}})'
```

Confirm that the Docker context and daemon are the intended server before
creating or replacing containers.

Prepare the source directory once as the deployment account:

```bash
sudo install -d -m 0750 -o "$(id -un)" -g "$(id -gn)" /srv/torobai
git clone https://github.com/M0BiN/torobai.git /srv/torobai
cd /srv/torobai
git fetch origin main
git switch --detach FULL_TESTED_COMMIT_SHA
```

Replace `FULL_TESTED_COMMIT_SHA` with the chosen commit. Do not run a development
server with `--reload`, `make run`, or an unreviewed `git pull` as the production
startup procedure.

### Private runtime configuration

First installation only; do not overwrite an existing configuration:

```bash
sudo install -d -m 0700 -o "$(id -un)" -g "$(id -gn)" /etc/torobai
(
umask 077
cp .env.example /etc/torobai/production.env
chmod 0600 /etc/torobai/production.env
cat > /etc/torobai/compose.production.yaml <<'YAML'
services:
  web:
    image: ${TOROBAI_IMAGE:?Select a built release image}
YAML
)
```

The subshell confines the private umask to configuration creation. The image also
normalizes source permissions so its non-root process can read files from a
restricted checkout; application files remain owned by root and not writable by
the runtime user.

Edit `production.env` with a private editor. Keep `PORT=8000` for the proxy
example, and leave `FORWARDED_ALLOW_IPS` empty until the proxy peer is established.
Leave the provider key empty until the unpaid checks pass; then configure the key
and its account spending limit if free-text chat is needed. Never put the key in
a command argument, build argument, release note or shell history.

The production overlay selects a retained image while inheriting the repository's
port binding, read-only filesystem, dropped capabilities, health check and logging.
Keep it limited to that purpose. Runtime secrets live outside the checkout.
`release.env`, created next, holds only the selected commit and image reference.
It can describe a candidate that has not started or passed acceptance yet.
`release.accepted.env` records the last release that completed acceptance.

### Build and start a release

From the clean checkout of the tested commit:

```bash
set -euo pipefail
cd /srv/torobai
test -z "$(git status --porcelain)"
TOROBAI_COMMIT="$(git rev-parse HEAD)"
TOROBAI_IMAGE="torobai:${TOROBAI_COMMIT}-$(date -u +%Y%m%dT%H%M%SZ)"
docker build --pull --tag "$TOROBAI_IMAGE" .
printf 'TOROBAI_COMMIT=%s\nTOROBAI_IMAGE=%s\n' \
  "$TOROBAI_COMMIT" "$TOROBAI_IMAGE" > /etc/torobai/release.env.tmp
mv /etc/torobai/release.env.tmp /etc/torobai/release.env
docker image inspect "$TOROBAI_IMAGE" --format '{{.Id}}'
```

Retain that image ID with the release record. Each build gets its own tag; do not
retag a previous release. `--pull` fetches the pinned base if needed and does not
upgrade its digest. Base-image and dependency updates require a reviewed source
change and the release checks above. CI currently does not publish a registry image.

Define this command array in each deployment shell. It keeps all operations on
the same project and files, and ignores inherited values that could otherwise
override the selected environment files. It does not print their contents.

```bash
set -euo pipefail
torobai_compose=(env -u PORT -u OPENROUTER_API_KEY -u OPENROUTER_MODEL \
  -u FORWARDED_ALLOW_IPS -u TOROBAI_IMAGE -u TOROBAI_COMMIT \
  docker compose --project-name torobai \
  --env-file /etc/torobai/production.env \
  --env-file /etc/torobai/release.env \
  --file /srv/torobai/compose.yaml \
  --file /etc/torobai/compose.production.yaml)
```

Validate the selected configuration and start the service:

```bash
"${torobai_compose[@]}" config --quiet
"${torobai_compose[@]}" up --detach --no-build --pull never --wait --wait-timeout 90
"${torobai_compose[@]}" ps
curl --max-time 10 --fail --silent --show-error http://127.0.0.1:8000/api/health
```

Use `config --quiet`; the full resolved configuration contains the provider key.
Do not use an unqualified `docker compose` command for this installation. `up`
uses the already built local image; a missing image fails instead of silently
fetching or building something else. Wait for a healthy container before adding
the proxy. The standard 90-second wait is a startup bound, not a performance target.

### HTTPS and proxy trust

Add this site block to `/etc/caddy/Caddyfile`, preserving other hosted sites.
Merge the logging settings into the existing global options block if one exists;
the Caddyfile may have only one global options block, before the site blocks.
The example assumes Caddy is the public edge, with no CDN or load balancer before it.

```caddyfile
{
    log default {
        format filter {
            wrap json
            request delete
        }
    }
}

torobai.example.com {
    reverse_proxy 127.0.0.1:8000 {
        transport http {
            response_header_timeout 30s
        }
    }
}
```

Caddy manages certificates for the configured public hostname. Its default proxy
behavior preserves Host, supplies forwarding headers and ignores client-supplied
forwarding values. If another proxy is added ahead of it, configure that trust
chain explicitly. Do not enable response caching or automatic POST retries for
chat. Access logging is not enabled here. Caddy's runtime error logs can still
include a structured request with its URI and headers; the global
[log filter](https://caddyserver.com/docs/caddyfile/directives/log#filter) removes
that field while retaining error messages and status. It does not sanitize every
possible message or another logger's output. Review any existing logging rules
and downstream log collectors as well. On staging, trigger a proxy failure with
a dummy query and confirm the request is absent from the emitted logs before
serving real traffic.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
```

The application also needs to trust the actual peer carrying those headers.
For this rootful Linux bridge setup, inspect the bridge gateway as a candidate:

```bash
docker inspect --format '{{range .NetworkSettings.Networks}}{{.Gateway}}{{"\n"}}{{end}}' \
  "$("${torobai_compose[@]}" ps --quiet web)"
```

Set `FORWARDED_ALLOW_IPS` in `production.env` to the proxy peer address seen by
the container, usually that gateway for this host-proxy setup, then recreate:

```bash
"${torobai_compose[@]}" up --detach --no-build --pull never --force-recreate --wait --wait-timeout 90
```

The gateway is a candidate, not proof for every Docker network mode. Confirm the
unpaid same-origin check below. If it fails, inspect the actual connection path
and peer rather than setting `*` or weakening the Origin check. Keep this bridge
dedicated to trusted application containers. A rootless daemon, containerized
proxy, CDN or different network requires its own verified peer configuration.
Recheck trust whenever the network is recreated; routine updates use `up`, not `down`.

### Acceptance checks

Run these against the real HTTPS hostname, replacing the example:

```bash
set -euo pipefail
TOROBAI_ORIGIN='https://torobai.example.com'
curl --max-time 10 --fail --silent --show-error "$TOROBAI_ORIGIN/api/health"
curl --max-time 10 --fail --silent --show-error --output /dev/null "$TOROBAI_ORIGIN/api/catalog"
curl --max-time 10 --fail --silent --show-error "$TOROBAI_ORIGIN/api/chatbot/status"

torobai_status="$(curl --max-time 10 --silent --show-error --output /dev/null --write-out '%{http_code}' \
  -H "Origin: $TOROBAI_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$TOROBAI_ORIGIN/api/chatbot/parse")"
test "$torobai_status" = 422
torobai_status="$(curl --max-time 10 --silent --show-error --output /dev/null --write-out '%{http_code}' \
  -H 'Origin: https://untrusted.invalid' -H 'Content-Type: application/json' \
  --data '{}' "$TOROBAI_ORIGIN/api/chatbot/parse")"
test "$torobai_status" = 403
```

Health must report `ok: true`; catalog must return 200. The two parse checks must
return **422** and **403**, respectively. The first confirms that HTTPS origin
handling reaches validation; the second confirms foreign-origin rejection. Both
use an invalid body and stop before any provider call, with or without a key.
Do not replace `{}` with valid chat text in unattended monitoring.

In a desktop and mobile browser, check the catalog, a product, custom consumption,
Persian fonts, navigation and guided recommendations. Check asset/API requests
for failures and mixed content. From another machine, confirm direct port 8000
is unreachable and HTTPS has a valid certificate. DNS, proxy, firewall and
forwarded-client-IP behavior are deployment checks, not claims established by CI.

To enable free-text chat, set the private key and spending cap, recreate the
container with the command above and confirm `available: true`. Then, as a
deliberate paid check, send one short message through the browser and verify a
catalog-backed recommendation. Status only proves a nonempty configured key;
it cannot verify the account, model, credit or provider availability.

After all required checks pass, confirm that the running image matches the
selected release, then record acceptance. Do not run this block after a failed
or skipped required check:

```bash
set -euo pipefail
torobai_selected_image="$("${torobai_compose[@]}" config --images)"
torobai_selected_id="$(docker image inspect "$torobai_selected_image" --format '{{.Id}}')"
torobai_running_id="$(docker inspect "$("${torobai_compose[@]}" ps --quiet web)" --format '{{.Image}}')"
test "$torobai_selected_id" = "$torobai_running_id"
cp /etc/torobai/release.env /etc/torobai/release.accepted.env.tmp
mv /etc/torobai/release.accepted.env.tmp /etc/torobai/release.accepted.env
```

### Updates and rollback

Updating one container creates a brief interruption; this procedure does not
provide zero-downtime deployment. Preserve the last known working release until
the new one passes acceptance. Before the first attempt at an update:

```bash
cd /srv/torobai
test -z "$(git status --porcelain)"
cp /etc/torobai/release.accepted.env /etc/torobai/release.previous.env.tmp
mv /etc/torobai/release.previous.env.tmp /etc/torobai/release.previous.env
git fetch origin main
git switch --detach NEXT_FULL_TESTED_COMMIT_SHA
```

Replace the commit placeholder, run **Build and start a release**, then repeat
the acceptance checks. Building does not stop the old container; `up` performs
the replacement. Keep the previous image and record until the release is accepted.
Always preserve the accepted record, even if a failed attempt changed the
selected record. If the host overlay, proxy or runtime settings changed, keep their
restricted backups as well and record which revision belongs to each release.

If startup or acceptance fails, capture safe logs and return to the previous
commit and already built image. Read the two non-secret values in the previous
release record and substitute them below:

```bash
cd /srv/torobai
cat /etc/torobai/release.previous.env
docker image inspect 'PREVIOUS_IMAGE_TAG' --format '{{.Id}}'
git switch --detach PREVIOUS_FULL_COMMIT_SHA
cp /etc/torobai/release.previous.env /etc/torobai/release.env.tmp
mv /etc/torobai/release.env.tmp /etc/torobai/release.env
"${torobai_compose[@]}" config --quiet
"${torobai_compose[@]}" up --detach --no-build --pull never --wait --wait-timeout 90
```

Use the earlier commit's Compose file and verify the recorded image ID. Review
any changed overlay/proxy settings for compatibility; do not blindly restore a
revoked key from a backup. Repeat acceptance checks and record the restored
release as accepted. A rollback
does not restore browser-local records or undo changes to their format; review
storage compatibility before releasing code that changes persisted records.
If the first installation fails, there is no accepted release to restore; leave
the key absent and fix the candidate before continuing.

Keep at least the current and previous image locally and retain an off-host
copy when recovery must work without registry/package access. `docker image save`
and `docker image load` preserve built images. Do not run broad image pruning
until the retained release IDs and their recoverable copies are accounted for.

## Routine operations

In a new SSH session, define `torobai_compose` from the server procedure first.
After an interrupted or failed rollout, reconcile the selected and running release
using the acceptance or rollback procedure before any routine recreation.
These commands inspect state without dumping environment variables:

```bash
"${torobai_compose[@]}" ps --all
"${torobai_compose[@]}" logs --since=30m --tail=200 web
docker inspect --format '{{.State.Status}} {{.State.Health.Status}} {{.RestartCount}} {{.State.OOMKilled}} {{.Image}}' \
  "$("${torobai_compose[@]}" ps --all --quiet web)"
docker stats --no-stream "$("${torobai_compose[@]}" ps --quiet web)"
docker system df
sudo journalctl -u caddy --since '30 minutes ago' --no-pager
```

Monitor public HTTPS health, container health/restarts, 5xx failures, disk and
memory pressure, certificate renewal and provider spending. Use unpaid health
requests, never synthetic free-text chat, for routine availability monitoring.
Avoid logging private messages, headers, env values or search URLs. If access
logs are later required, configure their data fields and retention deliberately.

`restart: unless-stopped` restarts an exited process and resumes a running service
after a daemon/host restart; it does not heal a process that stays unhealthy.
An explicitly stopped container remains stopped. Investigate logs and resource
pressure before restarting, and verify recovery afterward. Test a controlled
host reboot during initial commissioning to check Docker, Caddy and TLS recovery.

Changing env files requires recreation with the documented `up --force-recreate`
command. `restart` does not reload environment configuration. To disable paid
chat quickly, clear `OPENROUTER_API_KEY` in the private file and recreate; guided
choices continue to work. Revoke an exposed key at the provider as well. For a
planned shutdown use `"${torobai_compose[@]}" stop web`; start it again with the
documented `up` command. Expect proxy errors while the application is stopped.

### Backups and recovery

| State | Recovery requirement |
| --- | --- |
| Application and catalog | Tested Git commit, image ID/tag and retained image; catalog updates ship as a new release. |
| Host configuration | Restricted, encrypted off-host copies of `/etc/torobai`, the proxy configuration, DNS/firewall notes and release records. Store decryption access separately. |
| TLS state | Protect the Caddy service's data directory and renewal configuration; restore it with correct ownership or deliberately reissue certificates. |
| Saved products, supplier drafts, requests and reviews | Browser-local; use the application's available exports. A server backup does not contain them. |
| Chat history | Memory-only in the current browser document; there is no server transcript to restore. |

Record backup frequency and retention for the actual service, and rehearse a
restore to an isolated host with the key absent. Restore the matching source,
image and host settings, perform the unpaid acceptance checks, then enable the
intended credentials and switch traffic. Do not activate a second public chat
instance during recovery without coordinated limits.

Changing domain, port or HTTP/HTTPS origin creates a different browser storage
scope. Plan user exports before moving origins; records do not transfer merely
because the same application is deployed. There is currently no database volume,
scheduled catalog refresh, shared authentication or server-side user-data backup.

### Troubleshooting

| Symptom | Check and action |
| --- | --- |
| Proxy 502 or public health fails | Compare loopback health with public health; check Caddy, container state, port and DNS. Keep the backend private. |
| Health is 200 but browser chat is 403 | Check the exact public scheme/host/port, preserved Host and trusted proxy peer. Run the unpaid 422/403 checks; do not disable Origin validation. |
| Chat status is false or parse is 503 | Check whether the private file was loaded and the container recreated. A configured key can still have invalid credit/model/output; inspect safe operational evidence, not raw provider bodies. |
| Chat returns 429 | Per-process IP/global/concurrency limits may be reached. Verify client IP forwarding and traffic; do not add workers to bypass the limit. |
| Chat returns 504 or the proxy times out | Check upstream availability and the proxy's 30-second response-header timeout against the app's 22-second deadline. Do not enable automatic paid retries. |
| Container is unhealthy, restarting or OOM-killed | Inspect state, bounded logs, memory and disk; fix the cause or roll back. The health endpoint does not test OpenRouter. |
| Old catalog, scripts or missing assets | Confirm the running image ID and source commit; check proxy/browser caching and root-path routing. Rebuild a release for changed catalog data. |
| Drafts disappear after a domain move | Check the original browser/origin and available exports. Server restart and rollback do not migrate localStorage. |

Before adding replicas or workers, implement equivalent shared request and
concurrency limits, retain a provider spend cap and test forwarded IP handling.
Measure the actual bottleneck first. The current Caddy example supplies TLS and
proxying; it does not install a shared rate limiter or a monitoring service.

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

## GitHub repository and deployment automation

`M0BiN/torobai` uses `main`. Pull requests run application and container checks;
successful `main` runs publish Pages. This workflow does not deploy a VPS or push
an image to a registry. The server procedure is an explicit operator action;
a connected Render service has its own deployment trigger.

Keep source and configuration changes reviewed and linked to a tested commit.
Real env files, generated output and dependency folders stay outside Git. Do not
place a production provider key in CI to make ordinary checks pass. Deployment
permissions stay scoped to the existing Pages job; further automation needs its
own defined target, credential scope and rollback path.

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

For a Python deployment, follow [acceptance checks](#acceptance-checks), including
the unpaid HTTPS origin probes and the separately identified paid chat check.
For Pages, check the exported browser flows only; Python endpoints are absent.

## What hosting changes

The server serves the site and handles text understanding. Saved items, seller
drafts and review workspaces still belong to the current browser. No shared user
database or checkout is added by deployment.

GitHub Pages can serve the exported HTML but cannot run the Python API. Keep the
OpenRouter key on the Python service, never in the HTML or repository.

## References

- [Compose environment files and precedence](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Compose startup and recreation options](https://docs.docker.com/reference/cli/docker/compose/up/)
- [Docker port publishing and localhost restrictions](https://docs.docker.com/engine/network/port-publishing/)
- [Caddy reverse proxy and forwarding headers](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Running Caddy as a service](https://caddyserver.com/docs/running)
- [Deploy FastAPI on Render](https://render.com/docs/deploy-fastapi)
- [FastAPI behind a proxy](https://fastapi.tiangolo.com/advanced/behind-a-proxy/)
- [Render Blueprint fields](https://render.com/docs/blueprint-spec)
- [Choose a Python version](https://render.com/docs/python-version)
- [GitHub Pages capabilities](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
