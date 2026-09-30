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

### 2.2 Configure IAM & Workload Identity

Cloud Run uses its default Compute Service Account (or a designated user-managed service account) with Workload Identity to authenticate with Vertex AI Search for Retail via the native Compute Metadata Server ADC. **Never store service-account JSON keys or credentials in the repository.**

Grant the **Retail Viewer** and **Retail Editor** roles to the Cloud Run service account:

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant Retail permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/retail.editor"
```

### 2.3 Secrets Management (Google Secret Manager)

If your deployment requires sensitive API keys or credentials, source them from Google Secret Manager rather than `.env` files or hardcoded environment variables:

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com --project="YOUR_PROJECT_ID"

# Grant Secret Accessor role to the Cloud Run runtime service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

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
  --port 8080 \
  --set-env-vars GCP_PROJECT_ID=YOUR_PROJECT_ID,GCP_LOCATION=global,GCP_CATALOG_ID=default_catalog,GCP_SERVING_CONFIG_ID=default_search
```

> **Security Note**: Never include `.env` or credential files when deploying. If secrets are needed at runtime, bind them directly from Secret Manager:
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
