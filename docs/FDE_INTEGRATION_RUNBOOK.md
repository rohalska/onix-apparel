# Google Forward Deployment Engineer (FDE) Integration Runbook

How the ONIX Wares storefront (`gecx-shopping-agent-demo`) is set up on Cloud
Run, wired to Vertex AI Search for Retail, and registered as a Gemini
Enterprise shopping agent. It ships as one container: a Vite SPA served by the
same Node process that proxies the Retail API.

It runs in two projects, both `us-central1`, both public:

| Environment | Project                       | Number         | URL                                                               |
| ----------- | ----------------------------- | -------------- | ----------------------------------------------------------------- |
| `dev`       | `onx-dev-int-shop-demo-qes8`  | `835936341567` | https://gecx-shopping-agent-demo-835936341567.us-central1.run.app |
| `prd`       | `onx-prod-int-shop-demo-gml8` | `210812903728` | https://gecx-shopping-agent-demo-210812903728.us-central1.run.app |

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

Give the prd URL to anyone demonstrating the storefront.

---

## 1. Architecture Overview

```
                      ┌────────────────────────────────────────────────────────┐
                      │                   GOOGLE CLOUD RUN                     │
                      │                                                        │
                      │   [ Port :8080 ]                                       │
                      │         │                                              │
                      │         ▼                                              │
                      │   ┌────────────────────────────────────────────────┐   │
                      │   │       Unified Node.js Server (proxy.mjs)       │   │
                      │   │                                                │   │
                      │   │  • Rate Limiter (120 req/min/IP)               │   │
                      │   │  • Input Sanitizer (Retail Filter Guard)       │   │
                      │   │  • Metadata Server ADC Token Resolver          │   │
                      │   │  • Static Asset & SPA Fallback (/dist)         │   │
                      │   └───────────────┬────────────────────────────────┘   │
                      └───────────────────┼────────────────────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
    ┌───────────────────────────┐                   ┌───────────────────────────┐
    │  Google Vertex AI Search  │                   │     Gemini Enterprise     │
    │        for Retail         │                   │      Shopping Agent       │
    │  • Serving Config         │                   │  • A2A Agent Card         │
    │  • Vector Search & Facets │                   │  • Client Action Bus      │
    │  • User Event Telemetry   │                   │  • window.onixStore       │
    └───────────────────────────┘                   └───────────────────────────┘
```

---

## 2. Prerequisites & GCP Setup

### 2.1 Enable Google Cloud APIs

In the dev project, API enablement belongs to
`infra/live/dev/global/project-services`. The commands below are for a project
that is not managed with OpenTofu:

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  retail.googleapis.com \
  --project="YOUR_PROJECT_ID"
```

`aiplatform.googleapis.com` is not needed. Search goes to
`retail.googleapis.com`, and nothing in the container calls Vertex AI.

### 2.2 Configure IAM & Service Accounts (Least Privilege & Separation of Duties)

The storefront separates identities by duty. Each environment has its own four
service accounts in its own project, all managed by the OpenTofu code under
`infra/`. None of them can do another's job, and none has a JSON key.

| Service account     | Duty                                                  | Impersonable from                                  |
| ------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `gecx-shop-run`     | Runtime: the identity the Cloud Run container runs as | nothing; it is attached to the service             |
| `gecx-shop-deploy`  | CI deploy: applies the Cloud Run service              | dev: `refs/heads/main`. prd: a job declaring `prd` |
| `gecx-shop-plan`    | CI plan: read-only, runs plans on pull request code   | dev: any ref. prd: `refs/heads/main`               |
| `gecx-shop-catalog` | Catalog import: runs `scripts/importToGcpRetail.sh`   | dev: `refs/heads/main`. prd: a job declaring `prd` |

GitHub Actions reaches the three CI identities through Workload Identity
Federation, pool and provider `github`. The provider only accepts a token whose
`assertion.repository` is `onix-net/gecx-shopping-agent-demo` and whose
`assertion.repository_id` is `1388249424`.

Dev's planner is bound repository-wide, which is why it holds nothing that can
write: a plan runs contributor code. Dev's deployer and catalog importer are
pinned to `refs/heads/main`, so a workflow edited on a branch cannot assume
either.

Prd's deployer and catalog importer are bound instead to the OIDC subject of a
job that declared the `prd` environment, because a ref pin cannot express that
an approval was given. That subject carries no ref, so the branch is restricted
by the `prd` Environment's deployment branch policy rather than by IAM. See
[promotion.md](promotion.md).

The `gcloud` commands below show what each identity needs. They are reference
material for a project that is not managed with OpenTofu. Do not run them
against dev or prd: `infra/` owns these accounts and their bindings.

> [!WARNING]
> **Never use the default Compute Engine service account (`${PROJECT_NUMBER}-compute@developer.gserviceaccount.com`)** for Cloud Run or grant it `roles/retail.editor`. The default account often carries broad legacy project permissions, and pairing it with catalog write privileges on a public-facing web service violates the principle of least privilege. The `cloud-run-service` module rejects it at plan time.
> Never store service-account JSON keys or credentials in the repository.

Define your project variables for the commands below:

```bash
PROJECT_ID="YOUR_PROJECT_ID"
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
```

#### 1. Dedicated Runtime Service Account (`gecx-shop-run`)

Create a dedicated user-managed service account for the Cloud Run instance:

```bash
gcloud iam service-accounts create gecx-shop-run \
  --display-name="GECX shopping agent demo runtime" \
  --description="Minimal identity for storefront container executing Search queries and ingesting User Events" \
  --project="${PROJECT_ID}"

RUNTIME_SA="gecx-shop-run@${PROJECT_ID}.iam.gserviceaccount.com"
```

The runtime holds a **custom role**, not a predefined one. It grants exactly two
permissions, the two that `server/proxy.mjs` needs:

- `retail.servingConfigs.search` for Search and Browse queries
- `retail.userEvents.create` for `userEvents:write` ingestion

No predefined role fits. `roles/retail.viewer` covers search but omits
`retail.userEvents.create`, so event ingestion would fail with a permission
error. `roles/retail.editor` has both and also grants product deletion, catalog
import and model tuning, which a public-facing container must not hold.

```bash
gcloud iam roles create gecxShoppingAgentRuntime \
  --project="${PROJECT_ID}" \
  --title="GECX shopping agent demo runtime" \
  --description="Search queries and user-event ingestion, nothing else" \
  --permissions="retail.servingConfigs.search,retail.userEvents.create" \
  --stage="GA"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="projects/${PROJECT_ID}/roles/gecxShoppingAgentRuntime"
```

##### Runtime Google Cloud API Footprint & IAM Mapping

The storefront container (`server/proxy.mjs`) calls only the following external Google Cloud APIs at runtime:

| Endpoint                                                         | Upstream Service                     | Operation                           | Required Permission            | Bound IAM Role                                          |
| ---------------------------------------------------------------- | ------------------------------------ | ----------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `https://retail.googleapis.com/v2/.../servingConfigs/...:search` | Retail API (`retail.googleapis.com`) | Commerce search and faceted browse  | `retail.servingConfigs.search` | `projects/${PROJECT_ID}/roles/gecxShoppingAgentRuntime` |
| `https://retail.googleapis.com/v2/.../userEvents:write`          | Retail API (`retail.googleapis.com`) | Real-time event ingestion           | `retail.userEvents.create`     | `projects/${PROJECT_ID}/roles/gecxShoppingAgentRuntime` |
| `http://metadata.google.internal/.../token`                      | Compute Engine Metadata Server       | In-container OAuth token generation | _(built-in Cloud Run ADC)_     | Attached `gecx-shop-run` identity                       |

##### Startup Readiness Probe and Shopping Agent CSP

At startup, `server/proxy.mjs` sends a small Retail `:search` request to check
that the upstream dependency is reachable. Retail requires `visitorId` on
search requests, including this one. If it is omitted, Retail returns HTTP 400
(`visitorId` is required), and `/api/health` reports
`dependencyReadiness: "error"` with that response as its `fallbackReason`.
That made a missing field look like a Retail dependency outage even when the
runtime identity and permissions were valid. The probe now supplies the fixed
value `onix-health-check`; it is only a synthetic identifier for this
readiness request, not a shopper identifier or a Gemini chat session ID.

The page's Content Security Policy also needs to allow
`https://www.gstatic.com` in `style-src`: the Google Shopping Agent loads its
Highlight.js stylesheet from that host. Without it, the browser blocks code
syntax highlighting styles. This affects presentation only and does not cause
the agent's chat request to fail.

These changes correct the readiness diagnostic and remove the stylesheet CSP
warning. They do not address failures returned by the separately hosted
Shopping Agent chat service.

**Other Google Cloud APIs Not Invoked at Runtime**:

- **Vertex AI (`aiplatform.googleapis.com`)**: storefront search goes to the Retail API. The container does not call `aiplatform.googleapis.com` or include `@google-cloud/vertexai`, so the runtime account needs no Vertex AI role.
- **Cloud Storage (`storage.googleapis.com`)**: catalog staging is an operator task handled by `scripts/importToGcpRetail.sh` under `gecx-shop-catalog`. The runtime container reads and writes no bucket.
- **Secret Manager (`secretmanager.googleapis.com`)**: Cloud Run gets its configuration from environment variables set on the service by OpenTofu. If you mount secrets instead, grant `roles/secretmanager.secretAccessor` to `gecx-shop-run` as described in §2.3.

#### 2. Authorize the Deploy Identity (`roles/iam.serviceAccountUser`)

Cloud Run will not start a service under an explicit runtime account unless the
deploying identity can act as that account. Without
`roles/iam.serviceAccountUser` the deploy fails with a permission error. Here
the deploying identity is `gecx-shop-deploy`, and the grant is scoped to the
runtime account alone, not project-wide, so the deployer cannot impersonate the
catalog importer.

```bash
DEPLOY_SA="gecx-shop-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --member="serviceAccount:${DEPLOY_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT_ID}"
```

The deployer's other grants are `roles/run.admin`,
`roles/serviceusage.serviceUsageConsumer`, `roles/storage.objectAdmin` on the
state bucket only, and `artifactregistry.writer` on the one repository it
pushes to.

#### 3. Dedicated Catalog Import Identity (`gecx-shop-catalog`)

`scripts/importToGcpRetail.sh` bulk-imports products into branch 0
(`products:import`) and stages the feed in Cloud Storage first. That needs write
access to the catalog, which the public storefront's identity must never hold,
so the import duty gets its own account:

```bash
# Create dedicated catalog import service account for CI / admin ingestion
gcloud iam service-accounts create gecx-shop-catalog \
  --display-name="GECX shopping agent demo catalog import" \
  --description="Deployment identity for catalog schema and product import pipeline" \
  --project="${PROJECT_ID}"

CATALOG_SA="gecx-shop-catalog@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant Retail Editor for catalog import & branch management
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CATALOG_SA}" \
  --role="roles/retail.editor"
```

The staging bucket is `gs://${PROJECT_ID}-retail-catalog-staging`. The account's
grants on it are `roles/storage.objectAdmin`, because the script uploads the
feed and reads it back, and `roles/storage.legacyBucketReader`, because
`objectAdmin` carries no `storage.buckets.*` permission and the script's guard
runs `gcloud storage buckets describe`. Both are bucket-scoped. Do not grant
this account a project-wide storage role.

The bucket and those grants are managed in
`infra/live/dev/us-central1/catalog-staging` and
`infra/live/dev/global/iam-catalog`. Apply the bucket leaf first: the script no
longer creates the bucket and exits with an error if it is missing.

### 2.3 Secrets Management (Google Secret Manager)

If your deployment requires sensitive API keys or credentials, source them from Google Secret Manager rather than `.env` files or hardcoded environment variables:

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com --project="${PROJECT_ID}"

# Grant Secret Accessor role to the Cloud Run runtime service account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

### 2.4 Edge Rate Limiting & Distributed Quota Enforcement (Google Cloud Armor)

`server/proxy.mjs` carries a sliding window rate limiter (120 req/min/IP) over a
bounded LRU map (`MAX_TRACKED_IPS = 5000`), and derives the client IP from the
trusted proxy hop (`X-Forwarded-For`).

That state is per-instance. Cloud Run scales out under load, so the aggregate
allowance multiplies by the instance count. For a production deployment,
enforce the global limit at the edge with Cloud Armor behind an external
HTTP(S) load balancer. Nothing below is deployed in the dev project; the names
are placeholders:

```bash
# 1. Create a Cloud Armor security policy
gcloud compute security-policies create onix-edge-rate-limit \
  --description="Global edge rate limiting for ONIX Wares Cloud Run backend"

# 2. Add rate limiting rule (120 requests per minute per client IP)
gcloud compute security-policies rules create 1000 \
  --security-policy=onix-edge-rate-limit \
  --action="rate-based-ban" \
  --rate-limit-threshold-count=120 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=300 \
  --conform-action=allow \
  --exceed-action=deny-429 \
  --enforce-on-key=IP

# 3. Attach security policy to the backend service routing to Cloud Run
gcloud compute backend-services update onix-backend-service \
  --security-policy=onix-edge-rate-limit \
  --global
```

API Gateway in front of the service, or a shared cache such as Memorystore for
Redis, would also synchronise the buckets across instances.

---

## 3. Product Catalog Ingestion

`vertex-retail-catalog.jsonl` holds 14 products in Retail API Product schema.
`npm run export:vertex` regenerates it from the app's catalog data.

### The normal path: the `catalog-import` workflow

`.github/workflows/catalog-import.yml` is how a catalog gets imported. It is
`workflow_dispatch` only, because the import replaces catalog contents, and it
takes an `environment` (`dev` or `prd`) and a `confirm` input that must be the
literal string `import`. Importing into prd waits on that environment's
reviewers. Dispatch it from `main`. For dev that is enforced in the cloud: `gecx-shop-catalog` is
pinned to `refs/heads/main`, so a dispatch from any other ref fails at the
Workload Identity binding rather than running with a modified copy of the
workflow. For an environment behind an approval, such as prd, the importer is
bound to a job that declared that environment instead, which carries no ref, so
the branch is held by the environment's own deployment branch policy. See
[promotion.md](promotion.md). The job runs
`scripts/importToGcpRetail.sh` and then reports how many products the catalog
returns.

### Running the script directly

Against a project you own:

```bash
./scripts/importToGcpRetail.sh YOUR_PROJECT_ID global default_catalog default_branch
```

Only the project ID is required; the rest default to those values. The script
checks the staging bucket exists, uploads the feed, starts the import and polls
the operation.

### By hand

```bash
# Upload catalog to staging bucket
gcloud storage cp vertex-retail-catalog.jsonl gs://YOUR_PROJECT_ID-retail-catalog-staging/

# Ingest into Vertex AI Retail default branch
gcloud retail products import \
  --project="YOUR_PROJECT_ID" \
  --catalog="default_catalog" \
  --branch="default_branch" \
  --gcs-source-uris="gs://YOUR_PROJECT_ID-retail-catalog-staging/vertex-retail-catalog.jsonl" \
  --reconciliation-mode="INCREMENTAL"
```

### After an import

`products.list` reports the imported products straight away, but search does
not. Retail builds its first index over a period of hours, and until it lands a
`:search` call returns HTTP 200 with an empty result set. Dev is in exactly that
state: 14 products listed, searches reaching the API and returning nothing. An
empty result set alone is not evidence of a misconfigured serving config.

---

## 4. Cloud Run Deployment

The service is named `gecx-shopping-agent-demo`. It was previously called
`onix-apparel`. The old service still exists in the project, is not managed by
`infra/`, and is retired separately.

### The normal path: merge the release pull request

Nobody deploys by hand. Merging a feature pull request into `main` does not
deploy anything; it opens or updates release-please's standing release pull
request. Merging **that** pull request cuts a `v*` tag, and the `deploy-dev` job
in `.github/workflows/release.yml` does the rest:

1. Checks out the tag, never pull request code.
2. Builds the image once, pushes it to Artifact Registry under the version tag,
   and reads the digest back from the push.
3. Applies `infra/live/dev/us-central1/cloud-run` with that digest as
   `IMAGE_DIGEST`, so the Cloud Run resource is pinned by digest.
4. Reads the deployed image back and fails if it is not the digest it built.

The job authenticates as `gecx-shop-deploy` through Workload Identity
Federation and is the only job that can reach that identity.

That covers dev. Prd is deployed by promoting a version already running in dev,
which copies the released digest across and applies behind an approval. See
[promotion.md](promotion.md).

### Break-glass: manual source deploy

Use this only when the pipeline is unavailable and the service must be
redeployed immediately. It deploys outside OpenTofu state, so the next
`tofu plan` will report drift that has to be reconciled afterwards.

```bash
gcloud run deploy gecx-shopping-agent-demo \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account "gecx-shop-run@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --port 8080 \
  --set-env-vars GCP_PROJECT_ID=YOUR_PROJECT_ID,GCP_LOCATION=global,GCP_CATALOG_ID=default_catalog,GCP_SERVING_CONFIG_ID=default_search,FULLSTORY_ORG_ID=o-25B85Y-na1,FULLSTORY_ENVIRONMENT=dev,PUBLIC_URL=https://gecx-shopping-agent-demo-YOUR_PROJECT_NUMBER.us-central1.run.app
```

> **Security Note**: Never deploy public-facing Cloud Run containers without an explicit `--service-account`. Omitting it causes Cloud Run to run as the project's default Compute Engine service account. Also never include `.env` or credential files when deploying; if secrets are needed at runtime, bind them directly from Secret Manager:
>
> ```bash
> gcloud run deploy gecx-shopping-agent-demo \
>   ... \
>   --set-secrets="API_SECRET_KEY=my-secret:latest"
> ```

The deploy prints the legacy `*.a.run.app` URL, which redirects page loads to
the project-number address in `PUBLIC_URL`. Dev is
`https://gecx-shopping-agent-demo-835936341567.us-central1.run.app`. Leave
`PUBLIC_URL` out and the service answers on both addresses without redirecting.

---

## 5. Registering with Gemini Enterprise Agent Registry

### 5.1 A2A Agent Card Endpoint

The storefront serves an Agent-to-Agent (A2A) protocol card at:
`https://<YOUR-CLOUD-RUN-URL>/.well-known/agent-card.json`, where the URL is the
project-number address from the table above.

Verify the endpoint returns HTTP 200 with JSON metadata:

```bash
curl -i https://<YOUR-CLOUD-RUN-URL>/.well-known/agent-card.json
```

### 5.2 OpenAPI Specification

The machine-readable API specification for agent tool-calling is hosted at:
`https://<YOUR-CLOUD-RUN-URL>/openapi.yaml`

### 5.3 Registering with Gemini Enterprise

In the Gemini Enterprise Admin Console or using the Agent Registry CLI:

```bash
agents-cli publish gemini-enterprise \
  --agent-card="https://<YOUR-CLOUD-RUN-URL>/.well-known/agent-card.json" \
  --name="ONIX Wares AI Shopping Agent" \
  --environment="dev"
```

---

## 6. Client Action Bus & Browser Bridge

Gemini Enterprise agents embedded on the page (or communicating via an iframe/sidecar) can drive the storefront UI directly using typed JavaScript events or the global `window.onixStore` API.

### 6.1 Interactive Testing via Browser Developer Console

Open DevTools on the deployed application and test the following commands:

```javascript
// 1. List the available actions, printed by the running app
window.onixStore.help();

// 2. Autonomous bag addition (Gemini recommends an item and the user says "add it")
//    Product 16 is the moto jacket: sizes XS-XL, colors Rich Espresso,
//    Charcoal Black, Burgundy Wine. Both values below are real variants of it.
window.onixStore.dispatch({
  action: 'ADD_TO_CART',
  productId: 16,
  quantity: 1,
  size: 'M',
  color: 'Charcoal Black',
});

// 3. Open the product detail modal
window.onixStore.dispatch({
  action: 'OPEN_PRODUCT',
  productId: 2,
});

// 4. Trigger category navigation
window.onixStore.dispatch({
  action: 'NAVIGATE_COLLECTION',
  collection: 'women',
});

// 5. Execute a catalog search
window.onixStore.dispatch({
  action: 'SEARCH',
  query: 'leather jacket',
});
```

`window.onixStore.help()` prints the action list from the running application.

All eight actions the type declares are handled, but by two different subscribers,
which is why reading one file suggests otherwise:

| Subscriber                    | Actions                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `src/AppContent.tsx`          | `ADD_TO_CART`, `OPEN_PRODUCT`, `NAVIGATE_COLLECTION`, `SEARCH`, `CLEAR_FILTERS` |
| `src/context/CartContext.tsx` | `OPEN_CART`, `CLOSE_CART`, `APPLY_PROMO`                                        |

The split is declared as `CART_OWNED_ACTIONS` in `src/services/agentActionBus.ts`,
and `tests/contracts/agentActions.test.ts` asserts that each declared action is
handled by the subscriber that owns it.

Each dispatch emits exactly one outcome envelope on
`onix:agent-action-outcome`, whichever subscriber handled or declined it. Put an
optional `id` on the payload to match outcomes to dispatches when several are in
flight:

```js
window.onixStore.dispatch({
  id: 'dispatch-42',
  action: 'ADD_TO_CART',
  productId: 16,
  size: 'M',
  quantity: 1,
});
```

```ts
interface AgentActionOutcome {
  id?: string;
  action: AgentActionType | string;
  ok: boolean;
  applied?: boolean;
  reason?: string;
  code?: AgentActionOutcomeCode | string;
}
```

The bus tracks active dispatches on a stack, isolates nested dispatches, and drops secondary events: if a handler applies state and then throws, the applied outcome stands and the error report is suppressed. An outcome carrying an `id` the bus does not recognise is broadcast on its own and does not satisfy the in-flight dispatch, which still reports `UNHANDLED_ACTION` under its own `id`.

##### Several subscribers, and handlers that go async

**First outcome wins.** Each subscriber decides whether the action is its own.
Whichever reports first, applied or rejected or `HANDLER_THREW`, satisfies the
dispatch; anything reported afterwards is deduplicated away. `applied` is
omitted on `HANDLER_THREW`, so its absence is not proof that no state changed.

**Correlation is synchronous.** The stack correlation and the deduplication run
while `dispatchAgentAction` is on the call stack. An outcome reported after it
returns bypasses both.

Teardown functions (`subscribeToAgentActions`, `subscribeToOutcomes`,
`subscribeToActionRejections`) are idempotent; calling one twice does not
corrupt the subscriber count or produce a spurious `NO_SUBSCRIBER`.

An agent can subscribe via `window.onixStore.subscribeOutcomes` or `addEventListener('onix:agent-action-outcome')`:

```js
window.onixStore.subscribeOutcomes((outcome) => {
  console.log(
    `Action ${outcome.action} (id: ${outcome.id}) ok=${outcome.ok} applied=${outcome.applied}`,
  );
  if (!outcome.ok) {
    console.warn(`Declined code=${outcome.code}: ${outcome.reason}`);
  }
});
```

#### Disambiguating outcomes

An earlier version announced only rejections, so silence could mean applied,
dropped for want of a subscriber, or thrown. The envelope separates the cases:

- **Applied (`ok: true, applied: true`)**: The action was validated and applied to the storefront state.
- **No subscriber mounted (`ok: false, applied: false, code: 'NO_SUBSCRIBER'`)**: Dispatched before the storefront or cart mounted.
- **Handler threw (`ok: false, code: 'HANDLER_THREW'`)**: The storefront handler encountered an unhandled exception. `applied` is undefined (omitted) because state changes may have partially occurred; this prevents callers from retrying and inadvertently double-applying state mutations.
- **Declined by validation (`ok: false, applied: false, code: '...'`)**: Action could not be applied.

#### Machine-readable reason codes

Alongside the human-readable `reason` string, outcomes carry stable codes allowing agents to branch programmatically:

| Code                         | Cause                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| `NO_SUBSCRIBER`              | No subscriber was mounted to receive the action            |
| `HANDLER_THREW`              | The storefront handler threw an exception                  |
| `UNHANDLED_ACTION`           | Subscriber was mounted but did not process the action      |
| `UNRECOGNIZED_ACTION`        | Action is not part of the `AgentActionType` contract       |
| `INVALID_PRODUCT_OR_OPTIONS` | `productId` not found or options invalid for `ADD_TO_CART` |
| `PRODUCT_NOT_FOUND`          | `productId` not found for `OPEN_PRODUCT`                   |
| `MISSING_COLLECTION`         | `collection` parameter omitted on `NAVIGATE_COLLECTION`    |
| `INVALID_QUERY`              | `query` parameter omitted or not a string on `SEARCH`      |
| `MISSING_PROMO`              | `promoCode` omitted or empty on `APPLY_PROMO`              |
| `INVALID_PROMO`              | `promoCode` expired or unrecognized on `APPLY_PROMO`       |

#### Backwards-compatible rejection channel

For backwards compatibility, rejections continue to be dispatched on `onix:agent-action-rejected` carrying `{ id, action, reason, code }`. `AppContent` subscribes to this channel to surface user-facing toasts for rejected actions.

#### The two catalogs disagree about variants

The storefront serves `src/data/fallbackProducts.ts` when it is offline and the
Vertex export in `vertex-retail-catalog.json` once the proxy is up, and the two
datasets do not agree on colour names. Product 16, for example, is Rich Espresso /
Charcoal Black / Burgundy Wine in the fallback set and Caramel Brown / Jet Black /
Cognac in the Vertex export, so no single colour literal is valid against both.

`resolveValidatedAddToCart` consults the active catalog first and falls back to the
bundled dataset. An unmatched colour or size is **not** a rejection: it logs a
warning and substitutes the product's first canonical variant. An agent that names
a variant it cannot verify will therefore appear to succeed while adding something
else, which is why `help()`'s `ADD_TO_CART` example no longer names a colour.

#### Why the payload carries an ID and not a product

The discriminator is `action`, not `type`, and an item is named by `productId`
alone. The storefront resolves that ID against its canonical catalog and ignores
any `product` object in the payload. `product` and `productTitle` are still
accepted by the type for backwards compatibility but are marked deprecated and
untrusted.

That is deliberate. Anything running in the page context can dispatch on this bus,
so a payload that carried its own title, price and image could inject an item that
does not exist or reprice one that does, and the cart total would follow it. An ID
that has to resolve against the catalog cannot.

Three consequences for testing:

- An action naming an ID that is not in the catalog is **rejected** with code
  `PRODUCT_NOT_FOUND` or `INVALID_PRODUCT_OR_OPTIONS`, an outcome envelope is emitted,
  a rejection toast is displayed, and the reason is logged to the console.
- `quantity` is bounded. It is floored first, so `2.7` becomes `2`, then values
  above 10 are capped rather than rejected. Anything non-finite, or that floors
  below 1, is rejected.
- `size` and `color` are validated against the resolved product's real variants.
  An unsupported value falls back to that product's canonical default and logs
  that it did, rather than adding an item in a variant that does not exist.

### 6.2 Cart Event Telemetry Listener

Listen to customer bag changes to trigger proactive AI recommendations:

```javascript
window.addEventListener('onix:cart-updated', (event) => {
  console.log('Gemini Agent Received Cart Update:', event.detail.items);
  console.log('New Bag Total: $' + event.detail.total);
});
```

---

## 7. Verifying Telemetry & Search Quality Flywheel

1. Run searches and interact with products in the storefront UI.
2. Read the container logs:
   ```bash
   gcloud beta run services logs read gecx-shopping-agent-demo --region=us-central1 --limit=30
   ```
   Telemetry lines look like this:
   `📊 [Vertex AI Event] DETAIL-PAGE-VIEW | Visitor: anon-xxxxx | Product: Mens Cotton Jacket`
   `📊 [Vertex AI Event] ADD-TO-CART | Visitor: anon-xxxxx | Product: White Gold Plated Princess`
3. Check **Vertex AI Search for Retail > Analytics & Event Quality** in the
   console.

Events are accepted before search results appear. While the first index is
building, step 1 produces events and no results, which is the state dev is in.

---

## 8. Rollback & Maintenance

The supported rollback is a deploy of an earlier release through the pipeline,
so OpenTofu state and the running service stay in agreement.

A traffic split is faster and is break-glass: it moves the service away from
what state says it runs, and the next apply moves it back.

```bash
# List revisions
gcloud run revisions list --service=gecx-shopping-agent-demo --region=us-central1

# Direct 100% traffic to previous stable revision
gcloud run services update-traffic gecx-shopping-agent-demo \
  --to-revisions=PREVIOUS_REVISION_NAME=100 \
  --region=us-central1
```
