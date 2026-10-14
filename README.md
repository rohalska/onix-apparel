# ONIX Wares

A modern department storefront built with React, TypeScript, Vite and Tailwind CSS, wired
to Google Cloud Vertex AI Search for Retail. It runs as a demo of agent-driven
commerce: a Gemini Enterprise agent can drive the UI over a typed action bus
while the storefront's searches and user events go to the live Retail API.

It runs in two GCP projects, both in `us-central1`, both public:

| Environment | Project                       | URL                                                               |
| ----------- | ----------------------------- | ----------------------------------------------------------------- |
| `dev`       | `onx-dev-int-shop-demo-qes8`  | https://gecx-shopping-agent-demo-835936341567.us-central1.run.app |
| `prd`       | `onx-prod-int-shop-demo-gml8` | https://gecx-shopping-agent-demo-210812903728.us-central1.run.app |

Cloud Run also answers on an older `*.a.run.app` address for each service. Page
loads there are redirected to the addresses above (`server/canonicalUrl.mjs`),
which are the only ones FullStory records and the ones to share. The API,
`/.well-known` and anything that names a file, such as `/openapi.yaml`, still
answer on both, so nothing that holds an old address breaks.

The two addresses are separate origins to the browser. Someone who used the old
address before the redirect existed arrives at the new one with an empty bag,
an empty wishlist, a new `onix_visitor_id` (so Retail sees a new visitor) and
the consent banner again, because all of that lives in per-origin storage. That
is a one-off cost for anyone who bookmarked the old address.

Dev deploys on every release. Prd is promoted from a version already running in
dev, behind an approval. Both run the same image digest.

## Features

### Search and discovery

- **Two modes.** With `GCP_PROJECT_ID` set, the proxy calls the Retail API
  (`retail.googleapis.com`) using Application Default Credentials. Without it,
  a local simulation serves semantic search, query expansion and facet counts
  from the bundled catalog, so the app runs with no cloud setup at all.
- **Semantic matching** across titles, descriptions, categories, tags and
  attributes.
- **Query autocorrection**: `"jacet"` becomes `"jacket"`, `"dimond"` becomes
  `"diamond"`, and the UI shows what it changed.
- **Faceted filtering** over sizes, colours and hierarchical categories, with
  live counts.
- **Event telemetry.** In live mode, user interactions are validated and
  written to the Retail API (`userEvents:write`), and the call reports success
  only when the API accepts it. In simulation mode they are validated against
  the same schema and logged. The event types are `detail-page-view` (quick-view
  modal), `add-to-cart`, and `purchase-complete`, which goes out once per order
  covering every item in it. A persistent anonymous `visitorId` is generated and
  reused from `localStorage`.
- **Catalog export** into strict `google.cloud.retail.v2.Product` form: `PRIMARY`
  type, hierarchical categories, custom attributes, price info, validated CDN
  image URIs.

### Storefront

- Menswear, womenswear and jewellery, with CDN-hosted imagery.
- Product detail modal: image gallery, size selector (`XS` to `XXL`), colour
  swatches, stock state, quantity picker.
- Slide-over bag with a free shipping progress bar, promo codes, and automatic
  tax, shipping and discount maths, persisted to `localStorage`.
- Wishlist drawer with a heart toggle on every card and a "Move to Bag" action.
- Multi-step checkout with an address form, dummy payment selection and a
  confirmation receipt carrying a generated order ID (`ONX-XXXXXX`).

## Project structure

```
gecx-shopping-agent-demo/
├── .env.example                  # Environment configuration template
├── .github/workflows/            # ci, infra-ci, infra-plan, release, promote, deploy-env, catalog-import
├── .tool-versions                # Pinned toolchain versions (Node, OpenTofu, Terragrunt)
├── Dockerfile                    # Multi-stage build; the runner stage is what Cloud Run runs
├── Makefile                      # Single entry point for every quality gate
├── docs/
│   ├── FDE_INTEGRATION_RUNBOOK.md  # GCP setup, deploy, agent registration, rollback
│   └── promotion.md              # How a released version reaches prd
├── infra/                        # OpenTofu modules and Terragrunt live config for dev and prd
├── lefthook.yml                  # pre-commit and commit-msg hooks
├── openapi.yaml                  # Published API contract (mirrored in public/)
├── public/.well-known/           # A2A agent card
├── scripts/
│   ├── dev.mjs                   # Unified launcher for frontend and proxy
│   ├── exportVertexCatalog.mjs   # Regenerates the Retail catalog files
│   ├── importToGcpRetail.sh      # Stages the catalog in GCS and imports it
│   └── installHooks.mjs          # Guarded lefthook install, run by `npm ci`
├── server/
│   └── proxy.mjs                 # Node proxy for the Retail API, and the static server
├── shared/
│   └── sortOptions.mjs           # Sort values shared by the UI, the proxy and the contract
├── src/
│   ├── components/               # React UI (Navbar, FilterBar, Cart, modals)
│   ├── context/                  # CartContext, WishlistContext
│   ├── data/                     # Fallback and local catalog data
│   ├── services/
│   │   ├── api.ts                # Base catalog loader and image sanitization
│   │   ├── vertexSearch.ts       # Frontend search client and event tracker
│   │   └── agentActionBus.ts     # Typed bus Gemini agents dispatch on
│   ├── types/                    # Product, CartItem, Filters
│   └── utils/                    # agentActionValidator, filterSanitizer, fuzzySearch
├── tests/                        # Vitest suites (services, proxy, components, contracts)
├── vertex-retail-catalog.jsonl   # Ready-to-import Retail catalog, 14 products
└── vertex-retail-catalog.json    # The same catalog, formatted for review
```

## Getting started

### Prerequisites

- **Node.js**: v20. The exact version lives in `.tool-versions` (`nodejs 20.18.1`) and that file is the single source of truth. CI reads it with `actions/setup-node`, and the production image is built on `node:20-alpine`. A version manager that understands `.tool-versions` (asdf, mise) will pick it up on `cd`.
- **npm**: whatever ships with that Node. `package-lock.json` is committed, so installs go through `npm ci`.
- **ShellCheck**: required by `make lint-shell`, which is part of the gate.
  - macOS: `brew install shellcheck`
  - Debian / Ubuntu: `sudo apt install shellcheck`
- **Docker** _(optional)_: only needed to build the container image locally. CI builds it on every pull request.

### Local development

1. Install dependencies and the git hooks:

   ```bash
   make setup
   ```

   This runs `npm ci`, which installs exactly what `package-lock.json` locks and,
   via the `prepare` script, installs the lefthook git hooks described below. If you
   have a global `core.hooksPath` pointing outside the repository, the hook install
   is skipped on purpose; see below for why, and for how to override it.

2. Launch the frontend and the proxy together:

   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Proxy: `http://localhost:3001`

3. Run the full gate before pushing:

   ```bash
   make check
   ```

## Quality gate

The `Makefile` is the single entry point for everything that validates the repo.
CI calls the same targets a developer calls, so "green locally" and "green in CI"
mean the same run. `make` on its own lists the targets.

| Target              | Description                                                                        |
| :------------------ | :--------------------------------------------------------------------------------- |
| `make setup`        | Installs dependencies exactly as locked (`npm ci`) and installs the git hooks      |
| `make hooks`        | Installs the git hooks deliberately; refuses if `core.hooksPath` leaves the repo   |
| `make lint`         | ESLint across the tree, with a warning ratchet (`--max-warnings=17`)               |
| `make format`       | Rewrites files with Prettier                                                       |
| `make format-check` | Fails if anything is unformatted                                                   |
| `make typecheck`    | `tsc --noEmit`                                                                     |
| `make test`         | Runs the Vitest suite once                                                         |
| `make coverage`     | Runs the suite with V8 coverage and enforces the thresholds in `vite.config.ts`    |
| `make build`        | Production build (`tsc` then `vite build`)                                         |
| `make lint-shell`   | ShellCheck over every tracked `*.sh`                                               |
| `make check-fast`   | `lint` + `format-check` + `typecheck` + `test` + `lint-shell` (what the hook runs) |
| `make check`        | `lint` + `format-check` + `typecheck` + `build` + `coverage` + `lint-shell`        |

`make check` is the full gate and is what CI runs, followed by a `docker build` of
the production image. The image build is part of the gate because a change can
lint, typecheck and test green and still fail to start in a container. A missing
`COPY` in the Dockerfile's runner stage looks like nothing at all until the
container boots.

`make check-fast` is the same run minus the coverage instrumentation, the coverage
thresholds and the production build. It exists so the pre-commit hook costs a few
seconds rather than a wait long enough to make `--no-verify` tempting.

### Git hooks

`make setup` installs [lefthook](https://github.com/evilmartians/lefthook) from
`lefthook.yml`:

- **pre-commit** runs `make check-fast`.
- **commit-msg** rejects a subject that is not a
  [Conventional Commit](https://www.conventionalcommits.org/), skipping the
  subjects git generates for merges, reverts and fixups.

The same Conventional Commits pattern is checked in CI against the **pull request
title**, because the landing path is squash-merge: the title becomes the commit
subject on `main`, and that subject is what release automation reads to decide the
version bump and the changelog entry. A pull request titled "Repo foundation"
passes every other gate and then releases nothing.

#### If you have a global `core.hooksPath`

`lefthook install` writes to whatever git resolves as the hooks directory. A
global `core.hooksPath` in `~/.gitconfig` moves that out of the repository and
into a shared directory, and the install **overwrites the hooks already there**,
replacing them with lefthook's own stubs. Anything else that installed hooks in
that directory stops running, in every repository on the machine, and nothing says
so: the replacement files look perfectly healthy.

So `npm ci` does not install hooks when `core.hooksPath` points outside the
repository. It prints one line saying it skipped and stops.

`make hooks` does not override that on its own either. It refuses, prints what
would be destroyed, and exits non-zero unless you say so a second time:

```bash
LEFTHOOK_CLOBBER_GLOBAL_HOOKS=1 make hooks
```

Two things to know before you type that. **Back the directory up first.**
lefthook renames a hook it displaces to `<hook>.old` beside it, but that backup
only survives the first displacement: a forced install overwrites an existing
`<hook>.old` as readily as it overwrites the hook, so a second run leaves no copy
of the original at all. Restoring from `.old` works exactly once, and only if you
notice before running the install again. And if the shared directory already
dispatches to lefthook itself, `lefthook.yml` is picked up in this repository with
no install at all, so there is usually nothing to do.

None of this applies when `core.hooksPath` points inside the repository, say to
`.githooks`. Nothing outside the checkout can be displaced, so `make hooks` just
installs.

## NPM scripts

Prefer the `make` targets above for anything in the gate; these are what they call.

| Command                 | Description                                                                                        |
| :---------------------- | :------------------------------------------------------------------------------------------------- |
| `npm run dev`           | Starts the Vite frontend (`5173`) and the proxy server (`3001`) together                           |
| `npm run dev:frontend`  | Runs only the Vite frontend dev server                                                             |
| `npm run dev:server`    | Runs only the backend proxy server                                                                 |
| `npm run export:vertex` | Generates `vertex-retail-catalog.jsonl` and `vertex-retail-catalog.json`                           |
| `npm run build`         | Compiles TypeScript and builds the production bundle                                               |
| `npm run preview`       | Previews the production build locally                                                              |
| `npm test`              | Runs the Vitest suite once                                                                         |
| `npm run test:watch`    | Runs Vitest in watch mode                                                                          |
| `npm run coverage`      | Runs the suite with coverage and enforces the thresholds                                           |
| `npm run lint`          | ESLint across the tree                                                                             |
| `npm run format`        | Rewrites files with Prettier                                                                       |
| `npm run format:check`  | Checks formatting without writing                                                                  |
| `npm run prepare`       | Installs the lefthook git hooks, unless `core.hooksPath` points outside the repo; runs on `npm ci` |
| `npm run hooks`         | What `make hooks` calls: installs deliberately, refusing a `core.hooksPath` outside the repo       |

## Workflows

| Workflow             | Trigger                                          | What it does                                                                            |
| :------------------- | :----------------------------------------------- | :-------------------------------------------------------------------------------------- |
| `ci.yml`             | pull requests, push to main                      | Pull request title check, `make check`, then a build of the runtime image               |
| `infra-ci.yml`       | pull requests touching `infra/**`, push to main  | `fmt`, `validate`, `tflint`, `tofu test`. No cloud credentials                          |
| `infra-plan.yml`     | pull requests touching `infra/**`                | Plans dev as `gecx-shop-plan` with `-lock=false`, comments the plan on the pull request |
| `release.yml`        | push to main                                     | release-please, then `deploy-dev` when a release was cut                                |
| `promote.yml`        | `workflow_dispatch` from main                    | Tags `<env>-<version>` and calls `deploy-env.yml` to deploy that version                |
| `deploy-env.yml`     | called by `promote.yml`                          | Plans the environment, waits for its reviewers, then copies the digest and applies      |
| `catalog-import.yml` | `workflow_dispatch` from main, `confirm: import` | Runs `scripts/importToGcpRetail.sh` as `gecx-shop-catalog`                              |

## Deployment

Merging a feature pull request into main **does not deploy**. It opens or
updates release-please's standing release pull request. Merging that release
pull request is what deploys:

1. release-please cuts a `v*` tag on main.
2. The `deploy-dev` job in `.github/workflows/release.yml` checks out the tag,
   builds the image once, pushes it to Artifact Registry tagged with the
   version, and reads the digest back from the push.
3. It applies `infra/live/dev/us-central1/cloud-run` with that digest as
   `IMAGE_DIGEST`, so the Cloud Run resource is pinned by digest and never by a
   floating tag.
4. It reads the deployed image back and fails if it is not the digest it built.

That path has run for real.

Prd is deployed by promoting a version that is already running in dev. Run the
**Promote** workflow from main with the version and the target environment; it
cuts a `prd-v*` provenance tag, plans the environment, waits on the required
reviewers, then copies the released digest into the prd registry and applies.
Nothing is rebuilt, so prd runs the image dev ran. See
[docs/promotion.md](docs/promotion.md).

The service is named `gecx-shopping-agent-demo`. It was previously called
`onix-apparel`, the name from the repository this code came from, so a URL
containing that name belongs to the old service. The old service still exists
and is not managed by `infra/`. It is retired separately.

Everything the pipeline applies lives in [`infra/`](infra/README.md): the four
service accounts, the custom runtime and plan-reader roles, the Artifact
Registry repository, the catalog staging bucket, Workload Identity Federation
for GitHub Actions, and the Cloud Run service. Cloud Build is not used and the
former `cloudbuild.yaml` is gone.

### Why OpenTofu owns the image and not the service alone

The digest is an input to the Cloud Run resource rather than something a deploy
script pushes past it. That is what lets `tofu plan` show a reviewer the actual
image change before it is applied, and it is why `infra-plan.yml` reads the
live digest before planning. A `gcloud run deploy` run outside state would
leave that plan with nothing to say, and the next apply would revert it.

Rolling back prd means promoting an older release, and that works only when
nothing but the image has moved since. The deploy plans the whole environment as
the older tag defines it, so if any stack other than Cloud Run differs from what
is applied, an IAM change, a service enablement, a new `env_inputs` value, the
plan reports changes in a stack the deployer cannot apply and the run stops
before the gate. A rollback is therefore refused in the case where the release
also changed infrastructure, which is often the case where it is most wanted.
Clearing it needs an elevated apply out of band. Versions cut before
`infra/live/prd/env.hcl` existed are refused too.

For an incident, do not wait on that. Shift traffic to the previous revision and
sort the state out afterwards; see Break-glass below.

In dev, cut a revert commit and let the next release deploy it.

### Break-glass

The fastest way out of a bad release is to move traffic off it. It needs no
build and no apply:

```bash
# Newest first, with readiness and the digest each revision runs. Without
# --sort-by the order is not guaranteed, and a revision that never served can
# sit between two releases.
gcloud run revisions list --service gecx-shopping-agent-demo \
  --region us-central1 --project <project-id> \
  --sort-by='~metadata.creationTimestamp' \
  --format='table(metadata.name, metadata.creationTimestamp, status.conditions[0].status, spec.containers[0].image)'

# What is serving now, before changing it.
gcloud run services describe gecx-shopping-agent-demo \
  --region us-central1 --project <project-id> --format='value(status.traffic)'

# Pick a revision whose STATUS is True and whose digest you recognise.
gcloud run services update-traffic gecx-shopping-agent-demo \
  --region us-central1 --project <project-id> \
  --to-revisions <previous-revision>=100

# Confirm it took, then check the service actually answers.
gcloud run services describe gecx-shopping-agent-demo \
  --region us-central1 --project <project-id> --format='value(status.traffic)'
curl -fsS -o /dev/null -w '%{http_code}\n' \
  https://gecx-shopping-agent-demo-<project-number>.us-central1.run.app/api/health
```

The module serves `TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST` at 100, so pinning a
revision is drift and the next apply moves traffic back to the newest revision.
Promote the older version properly once the incident is over, or the next
unrelated apply will undo the rollback.

A manual `gcloud run deploy` is for when the pipeline is unavailable and the
service has to come back now. It deploys outside OpenTofu state, so the next
plan reports drift that has to be reconciled. The command is in
[`docs/FDE_INTEGRATION_RUNBOOK.md`](docs/FDE_INTEGRATION_RUNBOOK.md).

## Live mode

By default the storefront runs in local simulation mode, with search,
autocorrection and facets all working against the bundled catalog. To point it
at Vertex AI Search for Retail:

### 1. Configure environment variables

Copy `.env.example` to `.env`:

```env
PORT=3001
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=global
GCP_CATALOG_ID=default_catalog
GCP_SERVING_CONFIG_ID=default_search
```

### 2. Authenticate

```bash
gcloud auth application-default login
```

### 3. Import the catalog

Dispatch the `catalog-import` workflow from the Actions tab. It takes an
`environment` (`dev` or `prd`) and a `confirm` input that has to be the literal
string `import`, and must be dispatched from `main`. It runs as
`gecx-shop-catalog`, the only identity holding `roles/retail.editor`. Importing
into prd waits on that environment's reviewers.

Locally, against a project you own:

```bash
scripts/importToGcpRetail.sh <PROJECT_ID>
```

The script stages `vertex-retail-catalog.jsonl` in
`gs://<PROJECT_ID>-retail-catalog-staging` and imports it into branch
`default_branch` of `default_catalog`. It does not create the bucket; apply
`infra/live/<env>/us-central1/catalog-staging` first, or the script exits with
an error.

Each environment holds 14 imported products. A freshly imported catalog answers
searches with zero results until Retail finishes building its first index, which
takes hours. An empty result set with a 200 response is the expected state in
that window, not a misconfiguration.

### 4. Restart

Restart `npm run dev`. The store badge reads
`🟢 Vertex AI Commerce Search (Live GCP)`.

## Session capture

Dev and prd record sessions to FullStory (org `o-25B85Y-na1`). Both
environments share the org, and every page carries an `environment` page
property (`dev` or `prd`) so they can be segmented.

The org id is set at runtime, not at build time, because one image is built and
then promoted from dev to prd. `infra/live/_envcommon/cloud-run.hcl` sets
`FULLSTORY_ORG_ID` and `FULLSTORY_ENVIRONMENT` on the service, and
`server/proxy.mjs` writes them into `index.html` as `window.__FULLSTORY__` when
it serves the page. `src/services/fullstory.ts` reads that and starts the
`@fullstory/browser` SDK with capture held back. With no org id set nothing is injected and nothing is
recorded, which covers `npm run dev` too, since Vite serves `index.html` itself.

### Consent

Nothing is recorded until the visitor agrees. `src/services/consent.ts` runs a
[vanilla-cookieconsent](https://cookieconsent.orestbida.com/) banner with one
optional category, session replay. Accepting it calls FullStory's `start`;
declining, or ignoring the banner, records nothing. Accept and Decline carry
equal weight. The choice is kept in the first-party `onix_consent` cookie.

Visitors are asked again over time:

- A choice lasts `CONSENT_TTL_DAYS` (30 days), then the banner returns.
- Raising `CONSENT_REVISION` voids every stored choice, so everyone is asked
  again on their next visit. Raise it when what is recorded changes.
- The footer's "Cookie preferences" link reopens the choice at any time.
  Withdrawing calls FullStory's `shutdown` and clears its `fs_*` cookies.

The banner is hidden from bots by default (the library's `hideFromBots`), so
crawlers and uptime checks never consent and never use up sessions. That
includes automated browsers that set `navigator.webdriver`, which is worth
knowing before writing a browser test against it.

### Exclusions

Form inputs that take personal details carry `fs-exclude`: checkout address and
payment, contact, track order and the newsletter signup. So do the name, email
and address the checkout's confirmation screen repeats. Anything typed into
those fields that surfaces elsewhere on the page can still be recorded.
Concierge chat text is captured on purpose.

The server logs whether capture is on when it starts, and says so when it
refused a value. Removing `FULLSTORY_ORG_ID` from the service turns capture off
without a new image.

FullStory only accepts sessions from domains the org allows. The org allows the
two project-number addresses in the table at the top, not the older
`*.a.run.app` ones, which is one reason the server redirects page loads away
from those. A session from a host FullStory does not know is refused with
`Org blocks origin domain`, so a new environment's address has to be added in
FullStory under Settings > Data Capture before it will record.

## Demo promo codes

Try these in the bag drawer:

- `SAVE20`: 20% off the subtotal
- `WELCOME10`: 10% new customer discount
- `FREESHIP`: free express delivery

## License

Internal to Onix. There is no `LICENSE` file and `package.json` declares no
license, so nothing here is published under open source terms. If this is ever
meant to be MIT, add the file rather than the claim.
