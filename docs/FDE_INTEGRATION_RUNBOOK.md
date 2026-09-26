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

### 2.2 Configure IAM & Runtime Service Account
Cloud Run uses its default Compute Service Account or a designated user-managed service account to authenticate with Vertex AI Search for Retail.

Grant the **Retail Viewer** and **Retail Editor** roles to the Cloud Run service account:
```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant Retail permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/retail.editor"
```

---

## 3. Product Catalog Ingestion

ONIX Apparel provides a pre-formatted catalog file matching Google Retail API Product Schema: `vertex-retail-catalog.json`.

Execute the automated ingestion script:
```bash
./scripts/importToGcpRetail.sh YOUR_PROJECT_ID global default_catalog default_branch
```

Alternatively, run manually via Google Cloud CLI:
```bash
# Upload catalog to staging bucket
gsutil cp vertex-retail-catalog.json gs://YOUR_PROJECT_ID-retail-catalog-staging/

# Ingest into Vertex AI Retail default branch
gcloud retail products import \
  --project="YOUR_PROJECT_ID" \
  --catalog="default_catalog" \
  --branch="default_branch" \
  --gcs-source-uris="gs://YOUR_PROJECT_ID-retail-catalog-staging/vertex-retail-catalog.json" \
  --reconciliation-mode="INCREMENTAL"
```

---

## 4. Cloud Run Deployment

### Option A: 1-Click Automated Cloud Build (Recommended)
Submit the build using the included [cloudbuild.yaml](file:///Users/tiffany.valentina/Documents/Antigravity/clothing-store/cloudbuild.yaml):
```bash
gcloud builds submit --config=cloudbuild.yaml --project="YOUR_PROJECT_ID"
```

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
// 1. Inspect storefront status
window.onixStore.getState();

// 2. Autonomous Bag Addition (e.g. Gemini recommends an item and user says "add it")
window.onixStore.dispatch({
  type: 'ADD_TO_CART',
  product: {
    id: 1,
    title: 'Fjallraven - Foldsack No. 1 Backpack',
    price: 109.95,
    category: "men's clothing",
    image: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg'
  },
  quantity: 1,
  size: 'M',
  color: 'Navy'
});

// 3. Open Product Detail Modal
window.onixStore.dispatch({
  type: 'OPEN_PRODUCT',
  product: {
    id: 2,
    title: 'Mens Casual Premium Slim Fit T-Shirts',
    price: 22.3,
    category: "men's clothing",
    image: 'https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg'
  }
});

// 4. Trigger Category Navigation
window.onixStore.dispatch({
  type: 'NAVIGATE_COLLECTION',
  collection: 'women'
});

// 5. Execute Catalog Search
window.onixStore.dispatch({
  type: 'SEARCH',
  query: 'leather jacket'
});
```

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
