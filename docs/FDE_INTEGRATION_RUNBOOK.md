# Google Forward Deployment Engineer (FDE) Integration Runbook

**Target Platform**: Google Cloud Run + Vertex AI Search for Retail + Gemini Enterprise Shopping Agent  
**Application**: ONIX Apparel Luxury Showcase  
**Architecture Mode**: Single-Container Managed Serverless (Unified Vite SPA + Node.js Proxy)

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

Ensure the following APIs are enabled in your target Google Cloud Project:

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  retail.googleapis.com \
  aiplatform.googleapis.com \
  --project="YOUR_PROJECT_ID"
```

### 2.2 Configure IAM & Service Accounts (Least Privilege & Separation of Duties)

The storefront separates identities by duty. Four service accounts exist in the dev project, all managed by the OpenTofu code under `infra/`:

| Service account     | Duty                                                        |
| ------------------- | ----------------------------------------------------------- |
| `gecx-shop-run`     | Runtime: the identity the Cloud Run container executes as   |
| `gecx-shop-deploy`  | CI deploy: applies the service from the release workflow    |
| `gecx-shop-plan`    | CI plan: read-only, used for plan runs on untrusted PR code |
| `gecx-shop-catalog` | Catalog import: runs `scripts/importToGcpRetail.sh`         |

The `gcloud` commands below show what each identity needs and are kept for reference and for projects that are not managed with OpenTofu. In the dev project, do not run them: `infra/` owns these accounts and their bindings.

> [!WARNING]
> **Never use the default Compute Engine service account (`${PROJECT_NUMBER}-compute@developer.gserviceaccount.com`)** for Cloud Run or grant it `roles/retail.editor`. The default account often carries broad legacy project permissions, and pairing it with catalog write privileges on a public-facing web service violates the principle of least privilege.
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

The runtime holds a **custom role**, not a predefined one. It grants exactly two permissions, the two that `server/proxy.mjs` needs:

- `retail.servingConfigs.search` for Search and Browse queries
- `retail.userEvents.create` for `userEvents:write` ingestion

A predefined role was not used because none fits. `roles/retail.viewer` covers search but omits `retail.userEvents.create`, so event ingestion would fail with a permission error. `roles/retail.editor` has both, but it additionally grants product deletion, catalog import and model tuning, which a public-facing container must not hold.

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

**Other Google Cloud APIs Not Invoked at Runtime**:

- **Vertex AI (`aiplatform.googleapis.com`)**: Storefront search is powered directly by Google Cloud Retail API (`retail.googleapis.com`). The container does not call `aiplatform.googleapis.com` or include `@google-cloud/vertexai`. No Vertex AI roles (`roles/aiplatform.user`) are required for the runtime account.
- **Cloud Storage (`storage.googleapis.com`)**: Catalog schema upload and staging is strictly an admin deployment task handled by `scripts/importToGcpRetail.sh`, bound to `gecx-shop-catalog`. The runtime container does not read or write GCS buckets.
- **Secret Manager (`secretmanager.googleapis.com`)**: Cloud Run receives configuration via environment variables set on the Cloud Run service by OpenTofu. If you choose to mount sensitive secrets into Cloud Run from Secret Manager, grant `roles/secretmanager.secretAccessor` to `gecx-shop-run` as documented in §2.3.

#### 2. Authorize the Deploy Identity (`roles/iam.serviceAccountUser`)

When a service is deployed with an explicit runtime service account, Google Cloud requires that the deploying identity has permission to act as that account (`roles/iam.serviceAccountUser`). Without it, the deploy fails with a permission error. In this repository the deploying identity is `gecx-shop-deploy`, and the binding is scoped to the runtime account only, not granted project-wide.

```bash
DEPLOY_SA="gecx-shop-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --member="serviceAccount:${DEPLOY_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT_ID}"
```

#### 3. Dedicated Catalog Import Identity (`gecx-shop-catalog`)

Catalog ingestion via `scripts/importToGcpRetail.sh` performs bulk product imports into branch 0 (`products:import`) and writes staging files to Google Cloud Storage. This requires write access to the catalog and storage bucket, which must be kept on a separate deployment/CI identity:

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

The staging bucket (`gs://${PROJECT_ID}-retail-catalog-staging`) and the catalog identity's `roles/storage.objectAdmin` grant on that bucket alone are managed by OpenTofu, in `infra/live/dev/us-central1/catalog-staging` and `infra/live/dev/global/iam-catalog`. Apply the bucket leaf first: `scripts/importToGcpRetail.sh` no longer creates the bucket and exits with an error if it is missing. Do not create the bucket or grant storage roles by hand, and do not grant the account a project-wide storage role.

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

The application proxy (`server/proxy.mjs`) implements a defense-in-depth sliding window rate limiter (120 req/min/IP) backed by an in-memory bounded LRU map (`MAX_TRACKED_IPS = 5000`) and derives the client IP from the trusted proxy hop (`X-Forwarded-For`).

Because Cloud Run instances scale dynamically under traffic, in-process state is per-instance—scaling out instances multiplies the aggregate allowance. For production distributed environments, enforce global rate limits and DDoS mitigation at the edge using **Google Cloud Armor** with an External HTTP(S) Load Balancer:

```bash
# 1. Create a Cloud Armor security policy
gcloud compute security-policies create onix-edge-rate-limit \
  --description="Global edge rate limiting for ONIX Apparel Cloud Run backend"

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

Alternatively, front the deployment with **Google Cloud API Gateway** or a centralized shared cache (e.g., **Google Cloud Memorystore for Redis**) to synchronize rate limit buckets across all active container instances.

---

## 3. Product Catalog Ingestion

ONIX Apparel provides a pre-formatted catalog file matching Google Retail API Product Schema: `vertex-retail-catalog.jsonl`.

Execute the automated ingestion script:

```bash
./scripts/importToGcpRetail.sh YOUR_PROJECT_ID global default_catalog default_branch
```

Alternatively, run manually via Google Cloud CLI:

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

---

## 4. Cloud Run Deployment

The service is named `gecx-shopping-agent-demo`. It was previously called `onix-apparel`, and the old service's URL will stop working once that service is retired. The old service is still running at the time of writing and is retired separately, after the new one has served a real release.

### Standard path: the release workflow

Deployment is not done by hand. Merging the standing release pull request cuts a `v*` tag, and the release workflow builds the image once, pushes it to Artifact Registry and applies the service with OpenTofu by digest. The infrastructure lives in `infra/`; see its README and the Deployment section of the main README for the model. The release-workflow deploy step is added after the first apply, because it authenticates through Workload Identity Federation, which does not exist until then. Until it lands, the break-glass path below is the only way to deploy.

### Break-glass: manual source deploy

Use this only when the pipeline is unavailable and the service must be redeployed immediately. It deploys outside OpenTofu state, so the next `tofu plan` will report drift that has to be reconciled afterwards.

```bash
gcloud run deploy gecx-shopping-agent-demo \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account "gecx-shop-run@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --port 8080 \
  --set-env-vars GCP_PROJECT_ID=YOUR_PROJECT_ID,GCP_LOCATION=global,GCP_CATALOG_ID=default_catalog,GCP_SERVING_CONFIG_ID=default_search
```

> **Security Note**: Never deploy public-facing Cloud Run containers without an explicit `--service-account`. Omitting it causes Cloud Run to run as the project's default Compute Engine service account. Also never include `.env` or credential files when deploying; if secrets are needed at runtime, bind them directly from Secret Manager:
>
> ```bash
> gcloud run deploy gecx-shopping-agent-demo \
>   ... \
>   --set-secrets="API_SECRET_KEY=my-secret:latest"
> ```

Once deployment completes, Cloud Run will output your live HTTPS service URL:
`https://gecx-shopping-agent-demo-xxxxxx-uc.a.run.app`

---

## 5. Registering with Gemini Enterprise Agent Registry

### 5.1 A2A Agent Card Endpoint

ONIX Apparel automatically publishes an Agent-to-Agent (A2A) protocol card at:
`https://<YOUR-CLOUD-RUN-URL>/.well-known/agent-card.json`

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
  --name="ONIX Apparel Concierge" \
  --environment="production"
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

An action dispatch emits an outcome envelope on `onix:agent-action-outcome`,
whichever subscriber handled it or declined it. Callers can supply an optional
correlation `id` on the payload to correlate dispatches with outcomes when multiple
actions are in flight:

```js
window.onixStore.dispatch({
  id: 'dispatch-42',
  action: 'ADD_TO_CART',
  productId: 16,
  size: 'M',
  quantity: 1,
});
```

Every dispatch emits exactly one outcome envelope:

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

The client action bus guarantees one outcome envelope for each dispatch (correlated by the dispatch's `id` and `action`). It tracks active dispatches on an execution stack, isolates nested dispatches, and deduplicates secondary events (for example, if a handler applies state and subsequently throws, the initial applied outcome is preserved and the secondary error report is suppressed). If uncoordinated page code emits an outcome carrying an unrecognised foreign `id` during an in-flight dispatch, that stray event is broadcast independently and does not satisfy the active dispatch, which will report `UNHANDLED_ACTION` for its own `id`.

##### Multiple subscribers & asynchronous handler semantics

- **First reported outcome wins**: When multiple subscribers listen to the action bus (for instance, `AppContent` and `CartContext`), each examines whether the action belongs to its domain. The first subscriber to report an outcome (whether applied, rejected, or thrown via `HANDLER_THREW`) satisfies the dispatch context. Any subsequent outcome reported during that same dispatch is suppressed by the single-outcome deduplicator. Because `applied` is omitted on `HANDLER_THREW`, consumers should not rely on `applied` being absent as definitive proof that no state was modified if a handler crashed.
- **Synchronous dispatch lifecycle**: Stack correlation and deduplication operate while `dispatchAgentAction` is on the call stack. Outcomes reported asynchronously after `dispatchAgentAction` finishes execution bypass the synchronous dispatch stack deduplication.
- **Idempotent subscriptions**: All subscription teardown functions (`subscribeToAgentActions`, `subscribeToOutcomes`, `subscribeToActionRejections`) are idempotent; multiple invocations do not corrupt subscriber reference counts or cause spurious `NO_SUBSCRIBER` errors.

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

Previous versions only announced rejections, leaving silence ambiguous between
applied, dropped because no subscriber was mounted, and thrown by a handler.
The outcome envelope clearly separates these cases:

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
any `product` object in the payload — `product` and `productTitle` are still
accepted by the type for backwards compatibility but are marked deprecated and
untrusted.

That is deliberate. Anything running in the page context can dispatch on this bus,
so a payload that carried its own title, price and image could inject an item that
does not exist or reprice one that does, and the cart total would follow it. An ID
that has to resolve against the catalog cannot.

Two consequences worth knowing before you test:

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

1. Perform search queries in the storefront UI.
2. Verify events in the Cloud Run container logs:
   ```bash
   gcloud beta run services logs read gecx-shopping-agent-demo --region=us-central1 --limit=30
   ```
   You should observe telemetry logs:
   `📊 [Vertex AI Event] DETAIL-PAGE-VIEW | Visitor: anon-xxxxx | Product: Mens Cotton Jacket`
   `📊 [Vertex AI Event] ADD-TO-CART | Visitor: anon-xxxxx | Product: White Gold Plated Princess`
3. Inspect search events in the Google Cloud Console under:
   **Vertex AI Search for Retail > Analytics & Event Quality**.

---

## 8. Rollback & Maintenance

If an update needs to be reverted:

```bash
# List revisions
gcloud run revisions list --service=gecx-shopping-agent-demo --region=us-central1

# Direct 100% traffic to previous stable revision
gcloud run services update-traffic gecx-shopping-agent-demo \
  --to-revisions=PREVIOUS_REVISION_NAME=100 \
  --region=us-central1
```
