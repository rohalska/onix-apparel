import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_SORT, ORDER_BY, isSortValue } from '../shared/sortOptions.mjs';
import { canonicalRedirect } from './canonicalUrl.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function normalizePort(value, fallback = 3001) {
  const raw = String(value ?? '').trim();

  if (!/^\d+$/.test(raw)) {
    console.warn(`[server] Invalid PORT value "${value}". Falling back to ${fallback}.`);
    return fallback;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.warn(
      `[server] PORT value "${value}" is outside the valid TCP range. Falling back to ${fallback}.`,
    );
    return fallback;
  }

  return port;
}

// Load environment variables (.env) using Node's built-in or manual parser
const envPath = path.resolve(rootDir, '.env');
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath);
    } catch {}
  } else {
    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) process.env[key] = val;
          }
        }
      });
    } catch {}
  }
}

// Validate PORT strictly: must be an integer in the TCP port range (1-65535).
const PORT = normalizePort(process.env.PORT, 8080);
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID?.trim() || '';
const GCP_LOCATION = process.env.GCP_LOCATION?.trim() || 'global';
const GCP_CATALOG_ID = process.env.GCP_CATALOG_ID?.trim() || 'default_catalog';
const GCP_SERVING_CONFIG_ID = process.env.GCP_SERVING_CONFIG_ID?.trim() || 'default_search';
export const UPSTREAM_EVENTS_TIMEOUT_MS = parseInt(
  process.env.VERTEX_EVENTS_TIMEOUT_MS || '3000',
  10,
);

const isLiveMode = Boolean(GCP_PROJECT_ID);

let upstreamStatus = 'unknown'; // 'unknown', 'ok', 'error'
let fallbackReason = null; // string | null

console.log(`\n==============================================`);
console.log(`🚀 ONIX WARES - Vertex AI Commerce Search Proxy`);
console.log(`   Mode: ${isLiveMode ? 'LIVE (Google Cloud Vertex AI)' : 'LOCAL SIMULATION / MOCK'}`);
if (isLiveMode) {
  console.log(`   GCP Project: ${GCP_PROJECT_ID}`);
  console.log(`   Location:    ${GCP_LOCATION}`);
  console.log(`   Catalog:     ${GCP_CATALOG_ID}`);
  console.log(`   Serving:     ${GCP_SERVING_CONFIG_ID}`);
} else {
  console.log(`   ℹ️  Set GCP_PROJECT_ID in .env to switch to Live Google Cloud Retail Search.`);
}
console.log(`==============================================\n`);

// Load local catalog for simulation and fallback
let localCatalog = [];
function loadLocalCatalog() {
  const jsonPath = path.resolve(rootDir, 'vertex-retail-catalog.json');
  if (fs.existsSync(jsonPath)) {
    try {
      localCatalog = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (err) {
      console.error('Error parsing local catalog JSON:', err);
    }
  }
}
loadLocalCatalog();

// Convert a Vertex AI product schema item back to our frontend Product format
export function mapVertexProductToFrontend(vertexProduct) {
  const idStr = String(vertexProduct.id || '').replace(/^onx-/, '');
  const idNum = parseInt(idStr, 10) || 1;

  let rawCategory = 'all';
  const catHierarchy = vertexProduct.categories || [];
  const fullCatString = catHierarchy.join(' | ');
  const lowerCat = fullCatString.toLowerCase();

  if (lowerCat.includes("apparel > women's clothing") || lowerCat.includes("women's clothing")) {
    rawCategory = "women's clothing";
  } else if (
    !lowerCat.includes("women's clothing") &&
    (lowerCat.includes("apparel > men's clothing") || /\bmen's clothing/i.test(lowerCat))
  ) {
    rawCategory = "men's clothing";
  } else if (lowerCat.includes('electronics')) {
    rawCategory = 'electronics';
  } else if (lowerCat.includes('home & living') || lowerCat.includes('furniture')) {
    rawCategory = 'furniture';
  } else if (lowerCat.includes('skincare') || lowerCat.includes('beauty & fragrance > skincare')) {
    // Beauty/Skincare check MUST run BEFORE Fragrances check because
    // "Beauty & Fragrance > Skincare" contains the substring "Fragrance".
    rawCategory = 'beauty';
  } else if (
    lowerCat.includes('beauty & fragrance > fragrances') ||
    lowerCat.includes('fragrance') ||
    lowerCat.includes('perfume')
  ) {
    rawCategory = 'fragrances';
  } else if (
    lowerCat.includes('gourmet pantry') ||
    lowerCat.includes('groceries') ||
    lowerCat.includes('grocery') ||
    lowerCat.includes('pantry')
  ) {
    rawCategory = 'groceries';
  } else if (
    lowerCat.includes('accessories') ||
    lowerCat.includes('jewelry') ||
    lowerCat.includes('jewelery')
  ) {
    rawCategory = 'jewelry';
  } else if (fullCatString.trim().length > 0) {
    console.warn(
      `[mapVertexProductToFrontend] Unrecognised category hierarchy "${fullCatString}" for product "${vertexProduct.id || vertexProduct.title}". Defaulting to neutral category "all".`,
    );
  }

  const sizes = vertexProduct.sizes ||
    vertexProduct.attributes?.sizes?.text || ['S', 'M', 'L', 'XL'];
  const colorNames = vertexProduct.colorInfo?.colors ||
    vertexProduct.attributes?.colors?.text || ['Onyx Black'];
  const colorHexes = vertexProduct.attributes?.color_hexes?.text || ['#1c1917'];

  const colors = colorNames.map((name, i) => ({
    name,
    hex: colorHexes[i] || '#1c1917',
  }));

  const ratingRate =
    vertexProduct.rating?.averageRating ??
    vertexProduct.attributes?.rating_rate?.numbers?.[0] ??
    4.5;
  const ratingCount =
    vertexProduct.rating?.ratingCount ??
    vertexProduct.attributes?.rating_count?.numbers?.[0] ??
    150;
  const featured = vertexProduct.attributes?.featured?.text?.[0] === 'true';
  const isNewArrival = vertexProduct.attributes?.is_new_arrival?.text?.[0] === 'true';

  return {
    id: idNum,
    title: vertexProduct.title,
    price: vertexProduct.priceInfo?.price || 29.99,
    description: vertexProduct.description || '',
    category: rawCategory,
    image: vertexProduct.images?.[0]?.uri || '',
    rating: {
      rate: ratingRate,
      count: ratingCount,
    },
    sizes,
    colors,
    inStock: vertexProduct.availability === 'IN_STOCK',
    featured,
    isNewArrival,
  };
}

export function filterCatalogByCategory(catalog, category) {
  if (!category || category === 'all') return catalog;
  return catalog.filter((p) => {
    const hierarchy = (p.categories || []).join(' | ');
    const lowerHierarchy = hierarchy.toLowerCase();
    if (category === "men's clothing") {
      // "men's clothing" is a substring of "women's clothing", so explicitly exclude women's items
      if (lowerHierarchy.includes("women's clothing")) return false;
      return (
        lowerHierarchy.includes("apparel > men's clothing") ||
        /\bmen's clothing/i.test(lowerHierarchy)
      );
    }
    if (category === "women's clothing")
      return (
        lowerHierarchy.includes("apparel > women's clothing") ||
        lowerHierarchy.includes("women's clothing")
      );
    if (category === 'electronics') return lowerHierarchy.includes('electronics');
    if (category === 'furniture')
      return lowerHierarchy.includes('home & living') || lowerHierarchy.includes('furniture');
    if (category === 'jewelry' || category === 'jewelery') {
      if (lowerHierarchy.includes('electronics')) return false;
      return (
        lowerHierarchy.includes('accessories') ||
        lowerHierarchy.includes('jewelry') ||
        lowerHierarchy.includes('jewelery')
      );
    }
    if (category === 'beauty') {
      return (
        lowerHierarchy.includes('skincare') ||
        lowerHierarchy.includes('beauty & fragrance > skincare')
      );
    }
    if (category === 'fragrances') {
      // "Beauty & Fragrance > Skincare" contains "Fragrance" in the parent path; exclude skincare items
      if (lowerHierarchy.includes('skincare')) return false;
      return (
        lowerHierarchy.includes('beauty & fragrance > fragrances') ||
        lowerHierarchy.includes('fragrance') ||
        lowerHierarchy.includes('perfume')
      );
    }
    if (category === 'groceries')
      return (
        lowerHierarchy.includes('gourmet pantry') ||
        lowerHierarchy.includes('groceries') ||
        lowerHierarchy.includes('grocery') ||
        lowerHierarchy.includes('pantry')
      );
    // For an unknown category, apply no category filter (fall through to true),
    // matching Live mode behavior which leaves filterConditions empty for unknown categories.
    return true;
  });
}

// Configurable CORS origins (default to * for local dev, restrictable via ALLOWED_ORIGIN)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const MAX_BODY_BYTES = 100 * 1024; // 100 KB payload limit to protect against memory exhaustion DoS

function getCorsOrigin(req) {
  if (ALLOWED_ORIGIN === '*') return '*';
  const reqOrigin = req.headers.origin;
  if (!reqOrigin) return ALLOWED_ORIGIN;
  const allowedList = ALLOWED_ORIGIN.split(',').map((s) => s.trim());
  return allowedList.includes(reqOrigin) ? reqOrigin : allowedList[0];
}

// Helper to send JSON response with standard CORS headers
function sendJson(res, statusCode, data, req) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': req ? getCorsOrigin(req) : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
  });
  res.end(JSON.stringify(data));
}

// Sanitizer for Retail API filter string expressions to prevent query injection
export function sanitizeFilterValue(val) {
  if (typeof val !== 'string') return '';
  // Strip quotes, backslashes, parentheses, brackets, and semicolon characters
  return val
    .replace(/["'\\;()[\]{}]/g, '')
    .trim()
    .slice(0, 50);
}

// In-Memory sliding-window rate limiter (120 req / minute per IP)
//
// Architectural note on Cloud Run & distributed environments:
// This in-process rate limiter provides defense-in-depth protection for
// individual container instances. However, because Cloud Run scales out
// horizontally, per-instance state allows effective aggregate allowance to
// multiply with instance count. In production environments, distributed quotas
// and DDoS mitigation should be enforced at the infrastructure edge via
// Google Cloud Armor security policies, an API Gateway, or a shared bounded
// cache (e.g. Google Cloud Memorystore for Redis).
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const MAX_REQUESTS_PER_WINDOW = 120;
export const MAX_TRACKED_IPS = 5000;
export const ipRequestCounts = new Map();

/**
 * Derives the client IP address from the trusted reverse proxy.
 *
 * In Cloud Run (and reverse proxy architectures), any client-supplied
 * X-Forwarded-For header is preserved with the immediate caller IP appended
 * by the trusted proxy to the end of the chain. Trusting the first (leftmost)
 * entry allows clients to bypass rate limiting and forge arbitrary IPs simply
 * by rotating a spoofed header.
 *
 * Deriving from the right (the entry appended by the trusted proxy) ensures
 * the rate limiter tracks the client IP verified by the proxy infrastructure.
 */
export function getClientIp(req) {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim().length > 0) {
    const parts = xff
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      // The rightmost entry is appended by the immediate trusted reverse proxy (e.g. Cloud Run GFE)
      return parts[parts.length - 1];
    }
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function resetRateLimits() {
  ipRequestCounts.clear();
}

export function checkRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  let record = ipRequestCounts.get(ip);

  if (!record || now > record.resetTime) {
    // Before adding a new entry, strictly enforce the capacity bound
    if (!record && ipRequestCounts.size >= MAX_TRACKED_IPS) {
      // 1. Evict any expired entries
      for (const [k, v] of ipRequestCounts.entries()) {
        if (now > v.resetTime) ipRequestCounts.delete(k);
      }
      // 2. If still at or over capacity, evict oldest entries (FIFO / LRU)
      while (ipRequestCounts.size >= MAX_TRACKED_IPS) {
        const oldestKey = ipRequestCounts.keys().next().value;
        ipRequestCounts.delete(oldestKey);
      }
    }
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
  } else {
    record.count++;
    // Delete and re-set to maintain LRU access order
    ipRequestCounts.delete(ip);
  }

  ipRequestCounts.set(ip, record);
  return record.count <= MAX_REQUESTS_PER_WINDOW;
}

// Google Cloud Access Token cache
let cachedGcpToken = null;
let cachedGcpTokenExpiresAt = 0;
let metadataServerUnavailableUntil = 0;
const METADATA_COOLDOWN_MS = 15 * 1000; // 15-second cooldown: fast recovery from transient cold-start blips while preventing per-request timeout stalls

export function resetGcpTokenCache() {
  cachedGcpToken = null;
  cachedGcpTokenExpiresAt = 0;
  metadataServerUnavailableUntil = 0;
}

export function getCachedGcpToken() {
  return cachedGcpToken;
}

export function setCachedGcpTokenForTesting(token, ttlMs = 5000) {
  cachedGcpToken = token;
  cachedGcpTokenExpiresAt = Date.now() + ttlMs;
}

// Helper to query the Google Compute Metadata Server
async function fetchMetadataServerToken(isProduction = false) {
  if (Date.now() < metadataServerUnavailableUntil) {
    return null;
  }

  try {
    const metaRes = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      {
        headers: { 'Metadata-Flavor': 'Google' },
        signal: AbortSignal.timeout(1500),
      },
    );
    if (metaRes.ok) {
      const data = await metaRes.json();
      if (data.access_token) {
        const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 300;
        return { token: data.access_token, expiresIn };
      } else {
        metadataServerUnavailableUntil = Date.now() + METADATA_COOLDOWN_MS;
        if (isProduction && (process.env.K_SERVICE || GCP_PROJECT_ID)) {
          console.warn(
            '[Proxy Auth] Metadata server returned HTTP 200 OK but payload was missing access_token',
          );
        }
      }
    } else {
      metadataServerUnavailableUntil = Date.now() + METADATA_COOLDOWN_MS;
      if (isProduction && (process.env.K_SERVICE || GCP_PROJECT_ID)) {
        console.warn(
          `[Proxy Auth] Metadata server returned HTTP ${metaRes.status}: ${metaRes.statusText}`,
        );
      }
    }
  } catch (err) {
    metadataServerUnavailableUntil = Date.now() + METADATA_COOLDOWN_MS;
    if (isProduction && (process.env.K_SERVICE || GCP_PROJECT_ID)) {
      console.warn(
        `[Proxy Auth] Failed to reach Google Cloud metadata server: ${err?.message || err}`,
      );
    }
  }
  return null;
}

// Google Cloud Access Token acquisition with prioritized resolution:
// Non-production (CI / tests / local dev):
//   1. Explicit process.env.GOOGLE_ACCESS_TOKEN (instant manual override)
//   2. In-memory cache hit
//   3. GoogleAuth library
//   4. Native Compute Metadata Server
//   5. Local developer workstation async execFile('gcloud', ...)
// Production (Cloud Run / GKE / GCE):
//   1. In-memory cache hit
//   2. Native Compute Metadata Server (authoritative runtime identity)
//   3. GoogleAuth library
//   4. Explicit process.env.GOOGLE_ACCESS_TOKEN (cached fallback for off-GCP / hybrid runtimes)
export async function getGcpAccessToken() {
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE);

  // 1. In non-production environments, explicit environment token takes immediate precedence
  if (!isProduction && process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN;
  }

  // 2. Return cached token if still valid
  if (cachedGcpToken && Date.now() < cachedGcpTokenExpiresAt) {
    return cachedGcpToken;
  }

  // Helper to record token into cache with safe expiration captured AFTER await.
  // Never caches tokens with <= 10s lifetime remaining, and bounds TTL strictly below expiresInSeconds.
  function cacheToken(token, expiresInSeconds = 300) {
    if (expiresInSeconds <= 10) {
      return token;
    }
    cachedGcpToken = token;
    const safeBuffer = Math.min(60, Math.floor(expiresInSeconds / 2));
    const ttlSeconds = Math.max(1, Math.min(expiresInSeconds - safeBuffer, 300));
    cachedGcpTokenExpiresAt = Date.now() + ttlSeconds * 1000;
    return token;
  }

  // 3. In production, query the authoritative Compute Metadata Server first
  if (isProduction) {
    const meta = await fetchMetadataServerToken(isProduction);
    if (meta) {
      return cacheToken(meta.token, meta.expiresIn);
    }
  }

  // 4. Try google-auth-library if installed
  try {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    if (tokenRes?.token) {
      const expiresIn =
        typeof client.credentials?.expiry_date === 'number'
          ? Math.max(0, Math.floor((client.credentials.expiry_date - Date.now()) / 1000))
          : 300;
      return cacheToken(tokenRes.token, expiresIn);
    }
  } catch {}

  // 5. If non-production, try Compute Metadata Server if available
  if (!isProduction) {
    const meta = await fetchMetadataServerToken(isProduction);
    if (meta) {
      return cacheToken(meta.token, meta.expiresIn);
    }
  }

  // 6. Development-only workstation fallback: async execFile with strict timeout
  if (!isProduction) {
    try {
      const { execFile } = await import('child_process');
      const token = await new Promise((resolve) => {
        execFile(
          'gcloud',
          ['auth', 'print-access-token'],
          { timeout: 3000, maxBuffer: 1024 * 1024, windowsHide: true },
          (err, stdout) => {
            if (err || !stdout) return resolve(null);
            const trimmed = stdout.trim();
            resolve(trimmed || null);
          },
        );
      });
      if (token) {
        return cacheToken(token, 300);
      }
    } catch {}
  }

  // 7. Last-resort fallback in production if metadata server failed:
  // Do not assume an arbitrary TTL for static env tokens, allowing immediate rotation.
  // The metadata failure cooldown already prevents per-request timeout latency.
  if (isProduction && process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN;
  }

  return null;
}

// Static File & Single Page Application (SPA) Serving for Production Cloud Run
const distDir = path.resolve(rootDir, 'dist');
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.mjs': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.yaml': 'text/yaml; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8',
};

// FullStory org ids look like o-25B85Y-na1. Both values are written into an
// inline script, so anything not shaped like that is refused rather than
// escaped. A bad org id turns capture off; a bad environment only drops the tag.
const FULLSTORY_ORG_ID_PATTERN = /^o-[A-Za-z0-9]+-[a-z0-9]+$/;
const FULLSTORY_ENVIRONMENT_PATTERN = /^[a-z0-9-]{1,32}$/;

export function injectFullStoryConfig(html, env = process.env) {
  const orgId = env.FULLSTORY_ORG_ID;
  if (!orgId || !FULLSTORY_ORG_ID_PATTERN.test(orgId)) return html;

  const config = { orgId };
  const environment = env.FULLSTORY_ENVIRONMENT;
  if (environment && FULLSTORY_ENVIRONMENT_PATTERN.test(environment)) {
    config.environment = environment;
  }
  const script = `<script>window.__FULLSTORY__=${JSON.stringify(config)}</script>`;
  return html.replace('</head>', `${script}</head>`);
}

export function describeFullStoryConfig(env = process.env) {
  const orgId = env.FULLSTORY_ORG_ID;
  if (!orgId) return 'FullStory capture off: FULLSTORY_ORG_ID is not set';
  if (!FULLSTORY_ORG_ID_PATTERN.test(orgId)) {
    return 'FullStory capture off: FULLSTORY_ORG_ID is not a valid org id';
  }
  const environment = env.FULLSTORY_ENVIRONMENT;
  if (!environment) return `FullStory capture on: org ${orgId}, no environment tag`;
  if (!FULLSTORY_ENVIRONMENT_PATTERN.test(environment)) {
    return `FullStory capture on: org ${orgId}, environment refused (${environment})`;
  }
  return `FullStory capture on: org ${orgId}, environment ${environment}`;
}

export function serveStatic(req, res, pathname) {
  if (!fs.existsSync(distDir)) return false;

  // Prevent path traversal
  const safeSuffix = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(distDir, safeSuffix);

  // If path is a directory, look for index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA fallback: if file does not exist and it is not an asset request (no extension), serve index.html
  if (!fs.existsSync(filePath)) {
    if (!path.extname(pathname)) {
      filePath = path.join(distDir, 'index.html');
    } else {
      return false;
    }
  }

  // Ensure path stays within distDir
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(distDir)) return false;

  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    let content = fs.readFileSync(resolved);
    if (ext === '.html') content = injectFullStoryConfig(content.toString('utf-8'));
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': getCorsOrigin(req),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(content);
    return true;
  }
  return false;
}

/**
 * Every /api/ route assumes a JSON object body. A null, a scalar, or a
 * non-string field where a string is expected used to reach a property access
 * and throw inside an async handler with no rejection boundary, which ends the
 * process. These endpoints are public, so that is a request away.
 */
function badRequest(res, req, message) {
  return sendJson(res, 400, { error: 'Bad Request', message }, req);
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildRetailUserEvent(body) {
  const {
    eventType,
    visitorId = 'anon-visitor',
    product,
    items,
    purchaseTransaction,
    details = {},
  } = body || {};

  const eventPayload = {
    eventType,
    visitorId,
    eventTime: new Date().toISOString(),
  };

  const productDetails = [];
  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      const prodId = item.product?.id !== undefined ? item.product.id : item.id;
      if (prodId !== undefined && prodId !== null) {
        const normalizedId = String(prodId).startsWith('onx-') ? String(prodId) : `onx-${prodId}`;
        productDetails.push({
          product: { id: normalizedId },
          quantity: item.quantity || 1,
        });
      }
    }
  } else if (product && product.id !== undefined && product.id !== null) {
    const normalizedId = String(product.id).startsWith('onx-')
      ? String(product.id)
      : `onx-${product.id}`;
    productDetails.push({
      product: { id: normalizedId },
      quantity: details?.quantity || 1,
    });
  }

  if (eventType === 'purchase-complete') {
    const txnId = purchaseTransaction?.id || details?.orderId || `order-${Date.now()}`;
    const rawRevenue =
      purchaseTransaction?.revenue !== undefined
        ? purchaseTransaction.revenue
        : details?.revenue !== undefined
          ? details.revenue
          : product
            ? (product.price || 0) * (details?.quantity || 1)
            : 0;
    const revenue = typeof rawRevenue === 'number' && !isNaN(rawRevenue) ? rawRevenue : 0;
    const currencyCode = purchaseTransaction?.currencyCode || details?.currencyCode || 'USD';

    eventPayload.productEventDetail = {
      productDetails,
      purchaseTransaction: {
        id: String(txnId),
        revenue: Number(revenue),
        currencyCode: String(currencyCode),
      },
    };
  } else if (productDetails.length > 0) {
    eventPayload.productEventDetail = {
      productDetails,
    };
  }

  return eventPayload;
}

export function validateRetailUserEvent(eventPayload) {
  const allowedTypes = [
    'home-page-view',
    'detail-page-view',
    'add-to-cart',
    'purchase-complete',
    'search',
    'category-page-view',
    'shopping-cart-page-view',
  ];

  if (!eventPayload || typeof eventPayload !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object' };
  }
  if (!eventPayload.eventType || typeof eventPayload.eventType !== 'string') {
    return { valid: false, error: 'eventType is required and must be a string' };
  }
  if (!allowedTypes.includes(eventPayload.eventType)) {
    return {
      valid: false,
      error: `Invalid eventType '${eventPayload.eventType}'. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  if (
    !eventPayload.visitorId ||
    typeof eventPayload.visitorId !== 'string' ||
    !eventPayload.visitorId.trim()
  ) {
    return { valid: false, error: 'visitorId is required and must be a non-empty string' };
  }

  // Purchase complete requires transaction and at least one item
  if (eventPayload.eventType === 'purchase-complete') {
    const details = eventPayload.productEventDetail?.productDetails;
    const txn = eventPayload.productEventDetail?.purchaseTransaction;
    if (!Array.isArray(details) || details.length === 0) {
      return {
        valid: false,
        error: 'purchase-complete requires at least one product in productDetails',
      };
    }
    if (
      !txn ||
      !txn.id ||
      typeof txn.revenue !== 'number' ||
      isNaN(txn.revenue) ||
      txn.revenue < 0
    ) {
      return {
        valid: false,
        error:
          'purchase-complete requires a valid purchaseTransaction with id and non-negative revenue',
      };
    }
  }

  return { valid: true };
}

// Request dispatcher
const server = http.createServer(async (req, res) => {
  try {
    // Page loads on the legacy *.a.run.app host move to PUBLIC_URL, so capture
    // and consent see one host. See server/canonicalUrl.mjs.
    const redirectTo = canonicalRedirect(req);
    if (redirectTo) {
      res.writeHead(302, { Location: redirectTo, 'Cache-Control': 'no-store' });
      return res.end();
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': getCorsOrigin(req),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Rate limiting guard on API endpoints
    if (url.pathname.startsWith('/api/')) {
      if (!checkRateLimit(req)) {
        return sendJson(res, 429, { error: 'Too Many Requests. Please slow down.' }, req);
      }
    }

    // Health check
    if (url.pathname === '/api/health' && req.method === 'GET') {
      return sendJson(
        res,
        200,
        {
          status: 'ok',
          mode: isLiveMode ? 'live' : 'mock',
          dependencyReadiness: upstreamStatus,
          fallbackReason: fallbackReason,
          gcpProjectId: GCP_PROJECT_ID || null,
          location: GCP_LOCATION,
          catalogItemCount: localCatalog.length,
          itemCount: localCatalog.length,
          timestamp: new Date().toISOString(),
        },
        req,
      );
    }

    // Parse JSON body for POST requests with DoS / payload size limits
    let body = {};
    if (req.method === 'POST') {
      try {
        let receivedBytes = 0;
        let tooLarge = false;
        const chunks = [];
        // destroyOnReturn: false so that breaking out of the loop below stops
        // reading without destroying the request stream. The default would
        // tear the socket down while the client is still uploading, which
        // RSTs the connection and can discard the 413 out of the client's
        // receive buffer before it is read.
        for await (const chunk of req.iterator({ destroyOnReturn: false })) {
          receivedBytes += chunk.length;
          if (receivedBytes > MAX_BODY_BYTES) {
            tooLarge = true;
            break;
          }
          chunks.push(chunk);
        }
        if (tooLarge) {
          // Send first, drain second. Holding the 413 back until the upload
          // finishes leaves a client that stalls or trickles with no response
          // at all, and the socket pinned until server.requestTimeout fires,
          // so a handful of oversized uploads could occupy every connection
          // on the instance. Answering straight away releases the client;
          // resume() then discards whatever is still inbound, in the
          // background, so the leftover bytes cannot corrupt the next request
          // parsed off a reused keep-alive connection.
          sendJson(res, 413, { error: 'Payload too large. Maximum size is 100KB.' }, req);
          req.on('error', () => {
            // The client went away mid-drain. The 413 is already out and Node
            // cleans up the socket itself, so there is nothing to do beyond
            // keeping this from surfacing as an unhandled stream error.
          });
          req.resume();
          return;
        }
        const raw = Buffer.concat(chunks).toString('utf-8');
        if (raw) body = JSON.parse(raw);
      } catch {
        // A response may already have gone out above, and a failure while
        // draining must not turn into a second one.
        if (res.headersSent) return;
        return sendJson(res, 400, { error: 'Invalid JSON body' }, req);
      }
    }

    // Search Endpoint
    if (url.pathname === '/api/search' && req.method === 'POST') {
      if (!isPlainObject(body)) return badRequest(res, req, 'body must be a JSON object');
      // Deliberate leniency beyond the published contract: openapi.yaml does not
      // mark these fields nullable, but a client that sends an explicit null for
      // an unset optional field is treated as if it omitted it, rather than
      // getting a 400 in front of a customer.
      if (body.query != null && typeof body.query !== 'string') {
        return badRequest(res, req, 'query must be a string');
      }
      if (body.sortBy != null && typeof body.sortBy !== 'string') {
        return badRequest(res, req, 'sortBy must be a string');
      }

      const { category, minPrice, maxPrice, size, color } = body;
      // Destructuring defaults only fire for `undefined`, not `null`, so every
      // defaulted field is normalized with `??`. A null visitorId or pageSize
      // forwarded to Vertex is rejected there, which would silently drop live
      // mode back to the local catalog.
      const query = body.query ?? '';
      const appliedSort = isSortValue(body.sortBy) ? body.sortBy : DEFAULT_SORT;
      const visitorId = body.visitorId ?? 'anon-visitor';
      const pageSize = body.pageSize ?? 20;

      // 1. LIVE MODE: Call Google Cloud Vertex AI Search for Retail
      if (isLiveMode) {
        try {
          const token = await getGcpAccessToken();

          if (token) {
            const endpoint = `https://retail.googleapis.com/v2/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/catalogs/${GCP_CATALOG_ID}/servingConfigs/${GCP_SERVING_CONFIG_ID}:search`;

            const filterConditions = [];
            if (category && category !== 'all') {
              if (category === "men's clothing") {
                filterConditions.push(
                  '(categories: ANY("Apparel > Men\'s Clothing", "Men\'s Clothing"))',
                );
              } else if (category === "women's clothing") {
                filterConditions.push(
                  '(categories: ANY("Apparel > Women\'s Clothing", "Women\'s Clothing"))',
                );
              } else if (category === 'jewelry' || category === 'jewelery') {
                filterConditions.push(
                  '(categories: ANY("Accessories > Fine Jewelry", "Accessories", "Jewelry", "Jewelery"))',
                );
              } else if (category === 'electronics') {
                filterConditions.push('(categories: ANY("Electronics"))');
              } else if (category === 'furniture') {
                filterConditions.push('(categories: ANY("Home & Living", "Furniture"))');
              } else if (category === 'fragrances') {
                filterConditions.push(
                  '(categories: ANY("Beauty & Fragrance > Fragrances", "Fragrances", "Fragrance", "Perfume"))',
                );
              } else if (category === 'beauty') {
                filterConditions.push(
                  '(categories: ANY("Beauty & Fragrance > Skincare", "Skincare"))',
                );
              } else if (category === 'groceries') {
                filterConditions.push('(categories: ANY("Gourmet Pantry", "Groceries", "Pantry"))');
              }
            }
            const numMinPrice =
              typeof minPrice === 'number' && !isNaN(minPrice) ? minPrice : undefined;
            const numMaxPrice =
              typeof maxPrice === 'number' && !isNaN(maxPrice) ? maxPrice : undefined;
            if (numMinPrice !== undefined) filterConditions.push(`price >= ${numMinPrice}`);
            if (numMaxPrice !== undefined) filterConditions.push(`price <= ${numMaxPrice}`);

            // Sanitize facet values against filter query injection
            const cleanSize = sanitizeFilterValue(size);
            const cleanColor = sanitizeFilterValue(color);
            if (cleanSize) filterConditions.push(`(attributes.sizes: ANY("${cleanSize}"))`);
            if (cleanColor) filterConditions.push(`(attributes.colors: ANY("${cleanColor}"))`);

            const orderBy = ORDER_BY[appliedSort];

            const vertexPayload = {
              query: typeof query === 'string' ? query.trim().slice(0, 100) : '',
              visitorId,
              pageSize,
              filter: filterConditions.join(' AND ') || undefined,
              orderBy: orderBy || undefined,
              facetSpecs: [
                { facetKey: { key: 'categories' }, limit: 10 },
                { facetKey: { key: 'attributes.sizes' }, limit: 10 },
                { facetKey: { key: 'attributes.colors' }, limit: 10 },
              ],
            };

            const apiResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Goog-User-Project': GCP_PROJECT_ID,
              },
              body: JSON.stringify(vertexPayload),
            });

            if (apiResponse.ok) {
              upstreamStatus = 'ok';
              fallbackReason = null;
              const data = await apiResponse.json();

              // Retail search returns identifiers, not product detail. Each
              // result carries `id` and a `product` holding only `name`, even
              // when a field mask asks for more, so the catalog has to supply
              // the rest. Reading `r.product` gave every card an empty title
              // and image, and `parseInt('') || 1` turned every id into 1, so
              // the grid rendered blank duplicates.
              const rawResults = data.results || [];
              const byId = new Map(localCatalog.map((item) => [item.id, item]));
              let hydrated = rawResults.map((r) => byId.get(r.id)).filter(Boolean);

              if (hydrated.length !== rawResults.length) {
                const missing = rawResults.filter((r) => !byId.has(r.id)).map((r) => r.id);
                console.warn(
                  `[search] ${missing.length} result(s) absent from the local catalog: ${missing.join(', ')}. ` +
                    'The Retail catalog and vertex-retail-catalog.json have diverged; re-run the import.',
                );
              }

              // If live Retail search returned 0 items for category browsing (empty search query)
              // because newly added categories have not yet been indexed in the live GCP Retail API,
              // seamlessly fall back to the local catalog filtered by that category.
              if (hydrated.length === 0 && !query.trim() && category && category !== 'all') {
                hydrated = filterCatalogByCategory(localCatalog, category);
              }

              const results = hydrated.map(mapVertexProductToFrontend);
              return sendJson(
                res,
                200,
                {
                  source: 'vertex-ai-live',
                  appliedSort,
                  totalSize: data.totalSize || results.length,
                  correctedQuery: data.correctedQuery || null,
                  facets: (data.facets || []).map((f) => ({
                    key: f.key,
                    values: Array.isArray(f.values)
                      ? f.values.map((v) => ({
                          value: String(v.value ?? ''),
                          count: Number(v.count ?? 0),
                        }))
                      : [],
                  })),
                  products: results,
                },
                req,
              );
            } else {
              upstreamStatus = 'error';
              try {
                const errData = await apiResponse.json();
                fallbackReason = `API Error ${apiResponse.status}: ${errData.error?.message || JSON.stringify(errData)}`;
              } catch {
                fallbackReason = `API Error ${apiResponse.status}: ${apiResponse.statusText}`;
              }
            }
          } else {
            upstreamStatus = 'error';
            fallbackReason = 'Failed to acquire GCP Access Token';
          }
        } catch (err) {
          upstreamStatus = 'error';
          fallbackReason = err.message;
          console.warn(`Vertex AI API call error (${err.message}). Using local catalog.`);
        }
      }

      // 2. SIMULATION / MOCK MODE: Semantic simulation with facets
      loadLocalCatalog();
      let filtered = [...localCatalog];

      // Category filter
      if (category && category !== 'all') {
        filtered = filterCatalogByCategory(filtered, category);
      }

      // Price filter
      if (minPrice !== undefined && minPrice !== null) {
        filtered = filtered.filter((p) => (p.priceInfo?.price || 0) >= minPrice);
      }
      if (maxPrice !== undefined && maxPrice !== null) {
        filtered = filtered.filter((p) => (p.priceInfo?.price || 0) <= maxPrice);
      }

      // Size filter
      if (size) {
        filtered = filtered.filter((p) => p.attributes?.sizes?.text?.includes(size));
      }

      // Color filter
      if (color) {
        filtered = filtered.filter((p) => p.attributes?.colors?.text?.includes(color));
      }

      // Semantic query matching
      let correctedQuery = null;
      const cleanQ = query.trim().toLowerCase();
      if (cleanQ) {
        if (cleanQ.includes('jacet') || cleanQ.includes('jaket')) correctedQuery = 'jacket';
        if (cleanQ.includes('shrt') || cleanQ.includes('tshirt')) correctedQuery = 't-shirt';
        if (cleanQ.includes('jewl') || cleanQ.includes('dimond')) correctedQuery = 'diamond';

        const tokens = Array.from(
          new Set([
            ...cleanQ.split(/\s+/).filter(Boolean),
            ...(correctedQuery ? correctedQuery.split(/\s+/).filter(Boolean) : []),
          ]),
        );

        filtered = filtered
          .map((p) => {
            let score = 0;
            const titleLower = (p.title || '').toLowerCase();
            const descLower = (p.description || '').toLowerCase();
            const tagsLower = (p.tags || []).join(' ').toLowerCase();
            const catLower = (p.categories || []).join(' ').toLowerCase();
            const colorsLower = (p.attributes?.colors?.text || []).join(' ').toLowerCase();

            for (const token of tokens) {
              if (titleLower.includes(token)) score += 10;
              if (tagsLower.includes(token)) score += 5;
              if (catLower.includes(token)) score += 4;
              if (colorsLower.includes(token)) score += 3;
              if (descLower.includes(token)) score += 2;
            }

            return { product: p, score };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.product);
      }

      // Sorting
      if (appliedSort === 'price-low') {
        filtered.sort((a, b) => (a.priceInfo?.price || 0) - (b.priceInfo?.price || 0));
      } else if (appliedSort === 'price-high') {
        filtered.sort((a, b) => (b.priceInfo?.price || 0) - (a.priceInfo?.price || 0));
      } else if (appliedSort === 'rating') {
        filtered.sort(
          (a, b) =>
            (b.rating?.averageRating ?? b.attributes?.rating_rate?.numbers?.[0] ?? 0) -
            (a.rating?.averageRating ?? a.attributes?.rating_rate?.numbers?.[0] ?? 0),
        );
      } else if (appliedSort === 'newest') {
        // Compare both operands. The previous form ignored `a` and never
        // returned 0, so it was not a valid comparator and the resulting order
        // depended on the engine's sort implementation rather than the data.
        filtered.sort((a, b) => {
          const aNew = a.attributes?.is_new_arrival?.text?.[0] === 'true' ? 1 : 0;
          const bNew = b.attributes?.is_new_arrival?.text?.[0] === 'true' ? 1 : 0;
          return bNew - aNew;
        });
      }

      // Compute dynamic facets
      const categoriesMap = {};
      const sizesMap = {};
      const colorsMap = {};

      for (const item of filtered) {
        for (const cat of item.categories || []) categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
        for (const s of item.attributes?.sizes?.text || []) sizesMap[s] = (sizesMap[s] || 0) + 1;
        for (const c of item.attributes?.colors?.text || []) colorsMap[c] = (colorsMap[c] || 0) + 1;
      }

      const facets = [
        {
          key: 'categories',
          values: Object.entries(categoriesMap).map(([value, count]) => ({ value, count })),
        },
        {
          key: 'sizes',
          values: Object.entries(sizesMap).map(([value, count]) => ({ value, count })),
        },
        {
          key: 'colors',
          values: Object.entries(colorsMap).map(([value, count]) => ({ value, count })),
        },
      ];

      const products = filtered.map(mapVertexProductToFrontend);

      return sendJson(
        res,
        200,
        {
          source: 'vertex-ai-simulation',
          appliedSort,
          totalSize: products.length,
          correctedQuery,
          facets,
          products,
        },
        req,
      );
    }

    // Events Logging & Retail API Ingestion
    if (url.pathname === '/api/events' && req.method === 'POST') {
      if (!isPlainObject(body)) return badRequest(res, req, 'body must be a JSON object');

      // Return early if client disconnected
      if (res.writableEnded || (req.socket && req.socket.destroyed)) {
        return;
      }

      const eventPayload = buildRetailUserEvent(body);
      const validation = validateRetailUserEvent(eventPayload);
      if (!validation.valid) {
        return badRequest(res, req, validation.error);
      }

      console.log(
        `📊 [Vertex AI Event] ${eventPayload.eventType?.toUpperCase()} | Visitor: ${eventPayload.visitorId} | Items: ${eventPayload.productEventDetail?.productDetails?.length || 0}`,
      );

      // LIVE MODE: Submit directly to Google Cloud Retail API userEvents:write
      if (isLiveMode) {
        let timeoutId;
        const abortController = new AbortController();

        const onClientClose = () => {
          abortController.abort();
        };
        req.on('close', onClientClose);

        timeoutId = setTimeout(() => {
          abortController.abort();
        }, UPSTREAM_EVENTS_TIMEOUT_MS);

        try {
          const token = await getGcpAccessToken();
          if (!token) {
            clearTimeout(timeoutId);
            req.off('close', onClientClose);
            return sendJson(
              res,
              502,
              {
                success: false,
                error: 'Failed to acquire GCP Access Token for Retail API ingestion',
              },
              req,
            );
          }

          const endpoint = `https://retail.googleapis.com/v2/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/catalogs/${GCP_CATALOG_ID}/userEvents:write`;

          const apiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'X-Goog-User-Project': GCP_PROJECT_ID,
            },
            body: JSON.stringify(eventPayload),
            signal: abortController.signal,
          });

          clearTimeout(timeoutId);
          req.off('close', onClientClose);

          if (res.writableEnded || (req.socket && req.socket.destroyed)) {
            return;
          }

          if (apiResponse.ok) {
            const data = await apiResponse.json().catch(() => ({}));
            return sendJson(
              res,
              200,
              {
                success: true,
                source: 'vertex-ai-live',
                event: data,
              },
              req,
            );
          }

          let errorMessage = `Retail API rejected event: HTTP ${apiResponse.status}`;
          try {
            const errData = await apiResponse.json();
            if (errData.error?.message) {
              errorMessage = errData.error.message;
            }
          } catch {
            const rawText = await apiResponse.text().catch(() => '');
            if (rawText) errorMessage = rawText;
          }

          return sendJson(
            res,
            apiResponse.status >= 400 && apiResponse.status < 600 ? apiResponse.status : 502,
            {
              success: false,
              error: errorMessage,
            },
            req,
          );
        } catch (err) {
          clearTimeout(timeoutId);
          req.off('close', onClientClose);

          if (res.writableEnded || (req.socket && req.socket.destroyed)) {
            return;
          }

          if (abortController.signal.aborted) {
            return sendJson(
              res,
              504,
              {
                success: false,
                error: `Upstream Retail API timed out after ${UPSTREAM_EVENTS_TIMEOUT_MS}ms`,
              },
              req,
            );
          }

          return sendJson(
            res,
            502,
            {
              success: false,
              error: `Upstream Retail API request failed: ${err.message}`,
            },
            req,
          );
        }
      }

      // LOCAL / SIMULATION MODE
      return sendJson(
        res,
        200,
        {
          success: true,
          source: 'vertex-ai-simulation',
          loggedEvent: eventPayload,
        },
        req,
      );
    }

    // Serve A2A Agent Card for Gemini Enterprise registration
    if (url.pathname === '/.well-known/agent-card.json' && req.method === 'GET') {
      const cardPath = path.resolve(rootDir, 'public', '.well-known', 'agent-card.json');
      if (fs.existsSync(cardPath)) {
        const cardContent = JSON.parse(fs.readFileSync(cardPath, 'utf-8'));
        return sendJson(res, 200, cardContent, req);
      }
    }

    // Serve OpenAPI specification
    if (url.pathname === '/openapi.yaml' && req.method === 'GET') {
      const yamlPath = path.resolve(rootDir, 'openapi.yaml');
      if (fs.existsSync(yamlPath)) {
        const content = fs.readFileSync(yamlPath, 'utf-8');
        res.writeHead(200, {
          'Content-Type': 'application/x-yaml',
          'Access-Control-Allow-Origin': getCorsOrigin(req),
        });
        return res.end(content);
      }
    }

    // Serve static assets and SPA fallback for Cloud Run container
    if (req.method === 'GET') {
      const served = serveStatic(req, res, url.pathname);
      if (served) return;
    }

    // Not found
    return sendJson(res, 404, { error: 'Not found' }, req);
  } catch (err) {
    console.error('[proxy] unhandled request error', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Internal Server Error' }, req);
    } else {
      res.destroy();
    }
  }
});

export { server };

const isTesting =
  process.env.NODE_ENV === 'test' ||
  process.argv.includes('--test') ||
  process.execArgv.includes('--test') ||
  process.env.NODE_TEST_CONTEXT !== undefined;

if (!isTesting) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Vertex AI Proxy running at http://0.0.0.0:${PORT}`);
    console.log(`   ${describeFullStoryConfig()}`);

    // Background ping to determine initial upstream status
    if (isLiveMode) {
      console.log(`   Performing initial upstream dependency check...`);
      getGcpAccessToken()
        .then((token) => {
          if (!token) {
            upstreamStatus = 'error';
            fallbackReason = 'Failed to acquire GCP Access Token on startup';
            console.warn(`   ⚠️  ${fallbackReason}`);
            return;
          }
          const endpoint = `https://retail.googleapis.com/v2/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/catalogs/${GCP_CATALOG_ID}/servingConfigs/${GCP_SERVING_CONFIG_ID}:search`;
          fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'X-Goog-User-Project': GCP_PROJECT_ID,
            },
            body: JSON.stringify({ query: '', visitorId: 'onix-health-check', pageSize: 1 }),
          })
            .then(async (apiResponse) => {
              if (apiResponse.ok) {
                upstreamStatus = 'ok';
                fallbackReason = null;
                console.log(`   ✅ Upstream Vertex AI Retail API is ready.`);
              } else {
                upstreamStatus = 'error';
                try {
                  const errData = await apiResponse.json();
                  fallbackReason = `API Error ${apiResponse.status}: ${errData.error?.message || JSON.stringify(errData)}`;
                } catch {
                  fallbackReason = `API Error ${apiResponse.status}: ${apiResponse.statusText}`;
                }
                console.warn(`   ⚠️  Initial upstream check failed: ${fallbackReason}`);
              }
            })
            .catch((err) => {
              upstreamStatus = 'error';
              fallbackReason = err.message;
              console.warn(`   ⚠️  Initial upstream check failed: ${fallbackReason}`);
            });
        })
        .catch((err) => {
          upstreamStatus = 'error';
          fallbackReason = err.message;
          console.warn(`   ⚠️  Initial upstream check failed: ${fallbackReason}`);
        });
    }
  });
}
