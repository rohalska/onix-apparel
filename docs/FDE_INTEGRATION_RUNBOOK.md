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
  cloudbuild.googleapis.com \
  retail.googleapis.com \
  aiplatform.googleapis.com \
  --project="YOUR_PROJECT_ID"
```

### 2.2 Configure IAM & Service Accounts (Least Privilege & Separation of Duties)

The storefront separates identities by duty: **Runtime Storefront Identity** (reading catalog search and recording customer activity) and **Deployment Identity** (importing product catalogs and provisioning infrastructure).

> [!WARNING]
> **Never use the default Compute Engine service account (`${PROJECT_NUMBER}-compute@developer.gserviceaccount.com`)** for Cloud Run or grant it `roles/retail.editor`. The default account often carries broad legacy project permissions, and pairing it with catalog write privileges on a public-facing web service violates the principle of least privilege.
> Never store service-account JSON keys or credentials in the repository.

Define your project variables for the commands below:

```bash
PROJECT_ID="YOUR_PROJECT_ID"
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
```

#### 1. Dedicated Runtime Service Account (`onix-storefront-runtime`)

Create a dedicated user-managed service account for the Cloud Run instance:

```bash
gcloud iam service-accounts create onix-storefront-runtime \
  --display-name="ONIX Storefront Cloud Run Runtime" \
  --description="Minimal identity for storefront container executing Search queries and ingesting User Events" \
  --project="${PROJECT_ID}"

RUNTIME_SA="onix-storefront-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
```

Grant **Retail Viewer** (`roles/retail.viewer`) for Search and Browse query execution (covers `retail.servingConfigs.search` and catalog read operations):

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/retail.viewer"
```

Grant **User Event Ingestion** (`retail.userEvents.create`) for recommendations and analytics:

```bash
# Create minimal custom role for recording user events
gcloud iam roles create onix_retail_user_event_writer \
  --project="${PROJECT_ID}" \
  --title="ONIX Retail User Event Writer" \
  --description="Allows real-time user-event ingestion for recommendations" \
  --permissions="retail.userEvents.create" \
  --stage="GA"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="projects/${PROJECT_ID}/roles/onix_retail_user_event_writer"
```

_(Note: If custom roles cannot be created in your GCP organization, `roles/retail.editor` should be granted strictly to this isolated `RUNTIME_SA` rather than the default compute service account, but isolating runtime from catalog import remains best practice)._

##### Runtime Google Cloud API Footprint & IAM Mapping

The storefront container (`server/proxy.mjs`) calls only the following external Google Cloud APIs at runtime:

| Endpoint                                                         | Upstream Service                     | Operation                           | Required Permission            | Bound IAM Role                                               |
| ---------------------------------------------------------------- | ------------------------------------ | ----------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| `https://retail.googleapis.com/v2/.../servingConfigs/...:search` | Retail API (`retail.googleapis.com`) | Commerce search and faceted browse  | `retail.servingConfigs.search` | `roles/retail.viewer`                                        |
| `https://retail.googleapis.com/v2/.../userEvents:write`          | Retail API (`retail.googleapis.com`) | Real-time event ingestion           | `retail.userEvents.create`     | `projects/${PROJECT_ID}/roles/onix_retail_user_event_writer` |
| `http://metadata.google.internal/.../token`                      | Compute Engine Metadata Server       | In-container OAuth token generation | _(built-in Cloud Run ADC)_     | Attached `onix-storefront-runtime` identity                  |

**Other Google Cloud APIs Not Invoked at Runtime**:

- **Vertex AI (`aiplatform.googleapis.com`)**: Storefront search is powered directly by Google Cloud Retail API (`retail.googleapis.com`). The container does not call `aiplatform.googleapis.com` or include `@google-cloud/vertexai`. No Vertex AI roles (`roles/aiplatform.user`) are required for the runtime account.
- **Cloud Storage (`storage.googleapis.com`)**: Catalog schema upload and staging is strictly an admin deployment task handled by `scripts/importToGcpRetail.sh`, bound to `onix-catalog-deployer`. The runtime container does not read or write GCS buckets.
- **Secret Manager (`secretmanager.googleapis.com`)**: Cloud Run receives configuration via environment variables in `cloudbuild.yaml`. If you choose to mount sensitive secrets into Cloud Run from Secret Manager, grant `roles/secretmanager.secretAccessor` to `onix-storefront-runtime` as documented in §2.3.

#### 2. Authorize Cloud Build Deployment (`roles/iam.serviceAccountUser`)

When deploying Cloud Run via `cloudbuild.yaml` (or CI/CD pipelines) using an explicit `--service-account`, Google Cloud requires that the deploying Cloud Build service account has permission to act as that runtime service account (`roles/iam.serviceAccountUser`). Without this role, `gcloud run deploy --service-account` fails with a permission error.

```bash
# Authorize Cloud Build service account to act as onix-storefront-runtime
BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT_ID}"

# If your project uses the default compute service account as Cloud Build builder identity:
COMPUTE_BUILD_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --member="serviceAccount:${COMPUTE_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT_ID}"
```

#### 3. Dedicated Deployment & Catalog Import Identity (`onix-catalog-deployer`)

Catalog ingestion via `scripts/importToGcpRetail.sh` performs bulk product imports into branch 0 (`products:import`) and writes staging files to Google Cloud Storage. This requires write access to the catalog and storage bucket, which must be kept on a separate deployment/CI identity:

```bash
# Create dedicated catalog deployer service account for CI / admin ingestion
gcloud iam service-accounts create onix-catalog-deployer \
  --display-name="ONIX Retail Catalog Deployer" \
  --description="Deployment identity for catalog schema and product import pipeline" \
  --project="${PROJECT_ID}"

DEPLOYER_SA="onix-catalog-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant Retail Editor for catalog import & branch management
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${DEPLOYER_SA}" \
  --role="roles/retail.editor"

# Grant Storage Object Admin on the staging bucket
gcloud storage buckets add-iam-policy-binding "gs://${PROJECT_ID}-retail-catalog-staging" \
  --member="serviceAccount:${DEPLOYER_SA}" \
  --role="roles/storage.objectAdmin"
```

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

### Option A: 1-Click Automated Cloud Build (Recommended)

Submit the build using the `cloudbuild.yaml` at the repository root:

```bash
gcloud builds submit --config=cloudbuild.yaml --project="YOUR_PROJECT_ID"
```

> **Prerequisites for Cloud Build**: Before submitting `cloudbuild.yaml`, ensure you have completed Section 2.2:
>
> 1. Created the runtime service account `onix-storefront-runtime`.
> 2. Granted `roles/iam.serviceAccountUser` on `onix-storefront-runtime` to the Cloud Build service account (`${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com` or compute runner identity).
>    If these steps are skipped, Cloud Build's deploy step (`gcloud run deploy --service-account`) will fail with a permission error.

> **These two options are manual stopgaps, and both are outdated. Flagged for review rather than removed.**
>
> `cloudbuild.yaml` is unused: nothing in the repository references it, it has never
> run here, and it is scheduled for deletion with the deploy work. Option A submits it
> anyway.
>
> Both options deploy a service named `onix-apparel`, which is the name from the
> repository this code came from. The service will be named `gecx-shopping-agent-demo`.
>
> Neither matches how this will actually ship: GitHub Actions builds the image once per
> release, Artifact Registry stores it, and OpenTofu applies it by digest, with prod
> promoted from the same digest rather than rebuilt. See the Deployment section of the
> README.
>
> Until that pipeline exists these commands are the only way to get the app onto Cloud
> Run by hand, so they are kept. Expect to substitute the service name, and do not
> take Option A as evidence that Cloud Build is part of the design.

### Option B: Direct Source Deploy via gcloud CLI

Deploy directly from the local repository directory:

```bash
gcloud run deploy onix-apparel \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account "onix-storefront-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --port 8080 \
  --set-env-vars GCP_PROJECT_ID=YOUR_PROJECT_ID,GCP_LOCATION=global,GCP_CATALOG_ID=default_catalog,GCP_SERVING_CONFIG_ID=default_search
```

> **Security Note**: Never deploy public-facing Cloud Run containers without an explicit `--service-account`. Omitting it causes Cloud Run to run as the project's default Compute Engine service account. Also never include `.env` or credential files when deploying; if secrets are needed at runtime, bind them directly from Secret Manager:
>
> ```bash
> gcloud run deploy onix-apparel \
>   ... \
>   --set-secrets="API_SECRET_KEY=my-secret:latest"
> ```

Once deployment completes, Cloud Run will output your live HTTPS service URL:
`https://onix-apparel-xxxxxx-uc.a.run.app`

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

An action that is received but not applied is reported on one channel, whichever
subscriber declined it. `reportActionRejected` logs the reason and emits an
`onix:agent-action-rejected` event carrying `{ action, reason }`; `AppContent`
subscribes once and raises an informational toast. That covers an unresolvable
product or variant, a `NAVIGATE_COLLECTION` with no collection, a `SEARCH` whose
query is missing or not a string, an unrecognised action, and a missing or invalid
promo code, even though the promo handler lives in `CartContext` and renders no
toast of its own.

An agent can listen for that event to observe the outcome of what it dispatched
instead of inferring it from the cart not changing:

```js
window.addEventListener('onix:agent-action-rejected', (e) =>
  console.log(e.detail.action, e.detail.reason),
);
```

A successful action does not currently emit a matching event, so this channel
reports rejections only.

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

- An action naming an ID that is not in the catalog is **rejected**, and the
  reason is written to the browser console. Nothing else reports it: there is no
  toast, no UI change and no server-side record, and the success path is the only
  one that raises a toast. So from the operator's side a rejected action looks
  like nothing happened — keep the console open while testing.
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
   gcloud beta run services logs read onix-apparel --region=us-central1 --limit=30
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
gcloud run revisions list --service=onix-apparel --region=us-central1

# Direct 100% traffic to previous stable revision
gcloud run services update-traffic onix-apparel \
  --to-revisions=PREVIOUS_REVISION_NAME=100 \
  --region=us-central1
```
