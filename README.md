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
  - Slide-out drawer with free shipping progress bar (*"Add $X more for Free Express Shipping"*).
  - Promo code discounts (supports `SAVE20`, `WELCOME10`, and `FREESHIP`).
  - Automatic tax, shipping, and discount calculation with `localStorage` persistence.
- **Wishlist & Favorites Drawer**:
  - Heart toggle on every product card with persistent saved items and quick *"Move to Bag"* action.
- **Full Express Checkout Flow**:
  - Multi-step checkout with delivery address form, dummy payment selection, and celebratory confetti confirmation receipt with generated Order IDs (`ONX-XXXXXX`).

---

## 📁 Project Structure

```
clothing-store/
├── .env.example                  # Environment configuration template for Google Cloud
├── scripts/
│   ├── dev.mjs                   # Unified launcher for frontend & proxy server
│   └── exportVertexCatalog.mjs   # Script to export Vertex AI Retail JSONL catalog
├── server/
│   └── proxy.mjs                 # Lightweight Node.js proxy for Vertex AI Retail API
├── src/
│   ├── components/               # React UI components (Navbar, FilterBar, Cart, Modals...)
│   ├── context/                  # State management (CartContext, WishlistContext)
│   ├── data/                     # Fallback & local catalog data
│   ├── services/
│   │   ├── api.ts                # Base catalog loader & image sanitization
│   │   └── vertexSearch.ts       # Frontend Vertex AI search client & event tracker
│   └── types/                    # TypeScript interfaces (Product, CartItem, Filters...)
├── vertex-retail-catalog.jsonl   # Ready-to-import Google Cloud Retail API catalog
└── vertex-retail-catalog.json    # Formatted JSON catalog for review
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18+ (tested on Node.js v24)
- **npm** or **yarn**

### Quick Start (Local Development)

1. Clone or navigate to the repository:
   ```bash
   cd clothing-store
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

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

---

## 🛠️ Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts both the Vite frontend (`5173`) and the Vertex AI proxy server (`3001`) simultaneously |
| `npm run dev:frontend` | Runs only the Vite frontend dev server |
| `npm run dev:server` | Runs only the Vertex AI backend proxy server |
| `npm run export:vertex` | Generates `vertex-retail-catalog.jsonl` and `vertex-retail-catalog.json` |
| `npm run build` | Compiles TypeScript and builds the production bundle |
| `npm run preview` | Previews the production build locally |

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
*(Alternatively, provide the path to your service account key file in `GOOGLE_APPLICATION_CREDENTIALS`)*.

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
