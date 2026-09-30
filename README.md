# ONIX APPAREL - E-Commerce Store with Vertex AI Commerce Search

A modern, high-performance apparel e-commerce store built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**, integrated with **Google Cloud Vertex AI Search for Retail (Commerce Search)**.

---

## ✨ Features

### 🔍 Vertex AI Commerce Search & Discovery

- **Dual-Mode Architecture**:
  - **Live Google Cloud Mode**: Connects directly to Google Cloud's Retail API (`retail.googleapis.com`) using OAuth2 / Application Default Credentials.
  - **Local Simulation Mode**: Works out of the box with zero cloud setup, providing high-fidelity semantic search, query expansion, and facet calculation powered by the local catalog.
- **Semantic & Vector Search**: Full-text and semantic matching across product titles, descriptions, categories, tags, and attributes.
- **Query Autocorrection & Expansion**: Detects typos (e.g., `"jacet"` &rarr; `"jacket"`, `"dimond"` &rarr; `"diamond"`) and provides instant query adjustment in the UI.
- **Dynamic Facets**: Real-time faceted filtering for sizes, colors, and hierarchical categories with dynamic counts.
- **Retail ML Event Telemetry (Quality Flywheel)**:
  - Automatically logs e-commerce user events to train Vertex AI's personalization and ranking models:
    - `detail-page-view`: Triggered when inspecting a product in the quick-view modal.
    - `add-to-cart`: Triggered when adding items to the shopping bag.
    - `purchase-complete`: Triggered upon checkout completion with itemized order details.
  - Generates and reuses an anonymous persistent `visitorId` stored in `localStorage`.
- **Google Cloud Retail API Catalog Exporter**:
  - Exports products into strict Google Cloud `google.cloud.retail.v2.Product` format (`PRIMARY` type, hierarchical categories, custom attributes, price info, and validated CDN image URIs).

### 🛍️ Modern E-Commerce Experience

- **Curated Fashion Catalog**:
  - Menswear, womenswear, and fine jewelry accessories with high-resolution imagery and verified CDN links.
- **Interactive Product Detail Modal**:
  - Image showcase, apparel size selector (`XS` to `XXL`), color swatches, stock availability, and quantity picker.
- **Slide-Over Shopping Bag (Cart)**:
  - Slide-out drawer with free shipping progress bar (_"Add $X more for Free Express Shipping"_).
  - Promo code discounts (supports `SAVE20`, `WELCOME10`, and `FREESHIP`).
  - Automatic tax, shipping, and discount calculation with `localStorage` persistence.
- **Wishlist & Favorites Drawer**:
  - Heart toggle on every product card with persistent saved items and quick _"Move to Bag"_ action.
- **Full Express Checkout Flow**:
  - Multi-step checkout with delivery address form, dummy payment selection, and celebratory confetti confirmation receipt with generated Order IDs (`ONX-XXXXXX`).

---

## 📁 Project Structure

```
gecx-shopping-agent-demo/
├── .env.example                  # Environment configuration template for Google Cloud
├── Dockerfile                    # Multi-stage build; the runner stage is what Cloud Run runs
├── cloudbuild.yaml               # Unused. See Deployment below before touching it
├── .tool-versions                # Pinned toolchain versions (Node, OpenTofu, Terragrunt)
├── Makefile                      # Single entry point for every quality gate
├── lefthook.yml                  # pre-commit and commit-msg hooks
├── openapi.yaml                  # Published API contract (mirrored in public/)
├── scripts/
│   ├── dev.mjs                   # Unified launcher for frontend & proxy server
│   ├── exportVertexCatalog.mjs   # Script to export Vertex AI Retail JSONL catalog
│   ├── importToGcpRetail.sh      # Uploads the exported catalog to the Retail API
│   └── installHooks.mjs          # Guarded lefthook install, run by `npm ci`
├── server/
│   └── proxy.mjs                 # Lightweight Node.js proxy for Vertex AI Retail API
├── shared/
│   └── sortOptions.mjs           # Sort values shared by the UI, the proxy and the contract
├── tests/                        # Vitest suites (services, proxy endpoints, components, contracts)
├── src/
│   ├── components/               # React UI components (Navbar, FilterBar, Cart, Modals...)
│   ├── context/                  # State management (CartContext, WishlistContext)
│   ├── data/                     # Fallback & local catalog data
│   ├── services/
│   │   ├── api.ts                # Base catalog loader & image sanitization
│   │   ├── vertexSearch.ts       # Frontend Vertex AI search client & event tracker
│   │   └── agentActionBus.ts     # Typed bus Gemini agents dispatch on
│   ├── types/                    # TypeScript interfaces (Product, CartItem, Filters...)
│   └── utils/                    # agentActionValidator, filterSanitizer, fuzzySearch
├── vertex-retail-catalog.jsonl   # Ready-to-import Google Cloud Retail API catalog
└── vertex-retail-catalog.json    # Formatted JSON catalog for review
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20. The exact version lives in `.tool-versions` (`nodejs 20.18.1`) and that file is the single source of truth. CI reads it with `actions/setup-node`, and the production image is built on `node:20-alpine`. A version manager that understands `.tool-versions` (asdf, mise) will pick it up on `cd`.
- **npm**: whatever ships with that Node. `package-lock.json` is committed, so installs go through `npm ci`.
- **ShellCheck**: required by `make lint-shell`, which is part of the gate.
  - macOS: `brew install shellcheck`
  - Debian / Ubuntu: `sudo apt install shellcheck`
- **Docker** _(optional)_: only needed to build the container image locally. CI builds it on every pull request.

### Quick Start (Local Development)

1. Clone or navigate to the repository:

   ```bash
   cd clothing-store
   ```

2. Install dependencies and the git hooks:

   ```bash
   make setup
   ```

   This runs `npm ci`, which installs exactly what `package-lock.json` locks and,
   via the `prepare` script, installs the lefthook git hooks described below. If you
   have a global `core.hooksPath` pointing outside the repository, the hook install
   is skipped on purpose; see below for why, and for how to override it.

3. Launch both the React frontend and Vertex AI proxy server:

   ```bash
   npm run dev
   ```
   - **Frontend**: `http://localhost:5173`
   - **Vertex AI Proxy**: `http://localhost:3001`

4. Build for production:

   ```bash
   npm run build
   ```

5. Run the full gate before pushing:
   ```bash
   make check
   ```

---

## ✅ Quality Gate

The `Makefile` is the single entry point for everything that validates the repo.
CI calls the same targets a developer calls, so "green locally" and "green in CI"
mean the same run. `make` on its own lists the targets.

| Target              | Description                                                                        |
| :------------------ | :--------------------------------------------------------------------------------- |
| `make setup`        | Installs dependencies exactly as locked (`npm ci`) and installs the git hooks      |
| `make hooks`        | Installs the git hooks deliberately; refuses if `core.hooksPath` leaves the repo   |
| `make lint`         | ESLint across the tree, with a warning ratchet (`--max-warnings=18`)               |
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

### Git Hooks

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

Two things worth knowing before you type that. **Back the directory up first.**
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

---

## 🛠️ Available NPM Scripts

Prefer the `make` targets above for anything in the gate; these are what they call.

| Command                 | Description                                                                                        |
| :---------------------- | :------------------------------------------------------------------------------------------------- |
| `npm run dev`           | Starts both the Vite frontend (`5173`) and the Vertex AI proxy server (`3001`) simultaneously      |
| `npm run dev:frontend`  | Runs only the Vite frontend dev server                                                             |
| `npm run dev:server`    | Runs only the Vertex AI backend proxy server                                                       |
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

---

## 🚢 Deployment

**Nothing in this repository deploys yet.** There is no pipeline, no registry and
no Cloud Run service. What exists today is the release machinery that a deploy
will hang off, and this section records the shape it will take so that the next
person does not have to reconstruct it.

`cloudbuild.yaml` is **vestigial** and has never run here. It arrived with the
code from a personal repository, and nothing _executes_ it: no trigger, no
workflow, no Make target, no npm script. It builds an image in Cloud Build and
deploys a service still named `onix-apparel`, referenced by tag rather than by
digest, so what runs is whatever that tag points at when the deploy happens.

It is scheduled for deletion with the deploy work rather than kept as a second,
divergent path. Do not wire it up.

Two tests hold it in place and will fail the moment it is removed, so deleting it
is not a one-line change: `tests/fde_agent_readiness.test.ts` asserts the file
exists and contains specific Cloud Run flags, and `tests/shell_import_script.test.ts`
asserts it contains a `bash -n` step — under a test name claiming that is how CI
checks shell scripts, which stopped being true when `make lint-shell` took over
with ShellCheck. Both tests encode the belief this section corrects, and both have
to go with the file.

### The intended model

Build in GitHub Actions, store in Artifact Registry, apply with OpenTofu through
Terragrunt. Cloud Build is not used.

1. Merging the standing release pull request cuts a `v*` tag.
2. That same run builds the image **once**, pushes it to Artifact Registry tagged
   with the version and the git SHA, and resolves it to a digest.
3. Dev is applied with that digest as a Terragrunt input, never a floating tag,
   so nothing can repoint what dev is running.
4. Promotion to prod is a manual job: it checks the version is a real release,
   creates `prd-v<version>` on that exact commit, and the deploy copies **the same
   digest** into prod and applies it. No rebuild, so prod runs bit-for-bit what
   dev ran.
5. Rollback is promoting an older `v*`.

### Why OpenTofu owns the image and not just the service

The digest is an input to the Cloud Run resource rather than something a deploy
script pushes past it. That is what makes `tofu plan` on a promotion show the
reviewer the actual image change before it is applied, which is the whole point of
gating prod on a plan rather than on a version number. A deploy that ran
`gcloud run deploy` outside state would leave that plan with nothing to say.

---

## ☁️ Google Cloud Vertex AI Setup (Live Mode)

By default, Onix Apparel runs in **Local Simulation Mode**, giving you full search, autocorrection, and facet functionality immediately.

To switch to **Live Google Cloud Vertex AI Search for Retail**:

### 1. Configure Environment Variables

Copy `.env.example` to `.env` (or update existing `.env`):

```env
PORT=3001
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=global
GCP_CATALOG_ID=default_catalog
GCP_SERVING_CONFIG_ID=default_search
```

### 2. Google Cloud Authentication

Authenticate with your Google Cloud account:

```bash
gcloud auth application-default login
```

_(Alternatively, provide the path to your service account key file in `GOOGLE_APPLICATION_CREDENTIALS`)_.

### 3. Import Product Catalog

Upload the generated catalog to Google Cloud Storage and import it into Vertex AI Retail:

```bash
# Upload catalog to your GCS bucket
gcloud storage cp vertex-retail-catalog.jsonl gs://<YOUR-BUCKET-NAME>/
```

Then in the [Google Cloud Console](https://console.cloud.google.com/ai/retail):

1. Navigate to **Vertex AI Search for Retail > Data > Products**.
2. Click **Import Products**.
3. Select **Cloud Storage (JSON Lines)** and provide `gs://<YOUR-BUCKET-NAME>/vertex-retail-catalog.jsonl`.
4. Run the import.

### 4. Restart Dev Server

Restart `npm run dev`. The store badge will now display:
`🟢 Vertex AI Commerce Search (Live GCP)`

---

## 🏷️ Demo Promo Codes

Try entering these codes in the shopping bag drawer:

- `SAVE20` — 20% discount on order subtotal
- `WELCOME10` — 10% new customer discount
- `FREESHIP` — Free express delivery

---

## 📄 License

MIT
