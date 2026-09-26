import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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
      envContent.split('\n').forEach(line => {
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

const PORT = parseInt(process.env.PORT || '3001', 10);
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID?.trim() || '';
const GCP_LOCATION = process.env.GCP_LOCATION?.trim() || 'global';
const GCP_CATALOG_ID = process.env.GCP_CATALOG_ID?.trim() || 'default_catalog';
const GCP_SERVING_CONFIG_ID = process.env.GCP_SERVING_CONFIG_ID?.trim() || 'default_search';

const isLiveMode = Boolean(GCP_PROJECT_ID);

console.log(`\n==============================================`);
console.log(`🚀 ONIX APPAREL - Vertex AI Commerce Search Proxy`);
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
function mapVertexProductToFrontend(vertexProduct) {
  const idStr = String(vertexProduct.id || '').replace(/^onx-/, '');
  const idNum = parseInt(idStr, 10) || 1;

  let rawCategory = "men's clothing";
  const catHierarchy = vertexProduct.categories || [];
  const fullCatString = catHierarchy.join(' ').toLowerCase();
  if (fullCatString.includes("women's clothing")) {
    rawCategory = "women's clothing";
  } else if (fullCatString.includes('jewelry') || fullCatString.includes('accessories')) {
    rawCategory = 'jewelery';
  }

  const sizes = vertexProduct.attributes?.sizes?.text || ['S', 'M', 'L', 'XL'];
  const colorNames = vertexProduct.attributes?.colors?.text || ['Onyx Black'];
  const colorHexes = vertexProduct.attributes?.color_hexes?.text || ['#1c1917'];

  const colors = colorNames.map((name, i) => ({
    name,
    hex: colorHexes[i] || '#1c1917'
  }));

  const ratingRate = vertexProduct.attributes?.rating_rate?.numbers?.[0] || 4.5;
  const ratingCount = vertexProduct.attributes?.rating_count?.numbers?.[0] || 150;
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
      count: ratingCount
    },
    sizes,
    colors,
    inStock: vertexProduct.availability === 'IN_STOCK',
    featured,
    isNewArrival
  };
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
    'X-Frame-Options': 'SAMEORIGIN'
  });
  res.end(JSON.stringify(data));
}

// Sanitizer for Retail API filter string expressions to prevent query injection
export function sanitizeFilterValue(val) {
  if (typeof val !== 'string') return '';
  // Strip quotes, backslashes, parentheses, brackets, and semicolon characters
  return val.replace(/["'\\;()\[\]{}]/g, '').trim().slice(0, 50);
}

// In-Memory sliding-window rate limiter (120 req / minute per IP)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;
const ipRequestCounts = new Map();

export function checkRateLimit(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = ipRequestCounts.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    record.count++;
  }
  ipRequestCounts.set(ip, record);

  // Periodic cleanup of stale IPs
  if (ipRequestCounts.size > 5000) {
    for (const [k, v] of ipRequestCounts.entries()) {
      if (now > v.resetTime) ipRequestCounts.delete(k);
    }
  }

  return record.count <= MAX_REQUESTS_PER_WINDOW;
}

// Google Cloud Access Token acquisition with native Compute Metadata Server ADC fallback
export async function getGcpAccessToken() {
  // 1. Try google-auth-library if installed
  try {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    if (tokenRes?.token) return tokenRes.token;
  } catch {}

  // 2. Try native Google Cloud Metadata Server (Cloud Run, GKE, GCE native ADC)
  try {
    const metaRes = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(1500)
    });
    if (metaRes.ok) {
      const data = await metaRes.json();
      if (data.access_token) return data.access_token;
    }
  } catch {}

  // 3. Fallback to environment variable (local dev or CI)
  return process.env.GOOGLE_ACCESS_TOKEN || null;
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
  '.txt': 'text/plain; charset=UTF-8'
};

export function serveStatic(req, res, pathname) {
  if (!fs.existsSync(distDir)) return false;

  // Prevent path traversal
  const safeSuffix = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
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
    const content = fs.readFileSync(resolved);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': getCorsOrigin(req),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    res.end(content);
    return true;
  }
  return false;
}

// Request dispatcher
const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': getCorsOrigin(req),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
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
    return sendJson(res, 200, {
      status: 'ok',
      mode: isLiveMode ? 'live' : 'mock',
      gcpProjectId: GCP_PROJECT_ID || null,
      location: GCP_LOCATION,
      catalogItemCount: localCatalog.length,
      timestamp: new Date().toISOString()
    }, req);
  }

  // Parse JSON body for POST requests with DoS / payload size limits
  let body = {};
  if (req.method === 'POST') {
    try {
      let receivedBytes = 0;
      const chunks = [];
      for await (const chunk of req) {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_BODY_BYTES) {
          return sendJson(res, 413, { error: 'Payload too large. Maximum size is 100KB.' }, req);
        }
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (raw) body = JSON.parse(raw);
    } catch (err) {
      return sendJson(res, 400, { error: 'Invalid JSON body' }, req);
    }
  }

  // Search Endpoint
  if (url.pathname === '/api/search' && req.method === 'POST') {
    const {
      query = '',
      category,
      minPrice,
      maxPrice,
      size,
      color,
      sortBy = 'featured',
      visitorId = 'anon-visitor',
      pageSize = 20
    } = body;

    // 1. LIVE MODE: Call Google Cloud Vertex AI Search for Retail
    if (isLiveMode) {
      try {
        const token = await getGcpAccessToken();

        if (token) {
          const endpoint = `https://retail.googleapis.com/v2/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/catalogs/${GCP_CATALOG_ID}/servingConfigs/${GCP_SERVING_CONFIG_ID}:search`;

          const filterConditions = [];
          if (category && category !== 'all') {
            if (category === "men's clothing") {
              filterConditions.push('(categories: ANY("Apparel > Men\'s Clothing"))');
            } else if (category === "women's clothing") {
              filterConditions.push('(categories: ANY("Apparel > Women\'s Clothing"))');
            } else if (category === 'jewelery') {
              filterConditions.push('(categories: ANY("Accessories > Fine Jewelry"))');
            }
          }
          const numMinPrice = typeof minPrice === 'number' && !isNaN(minPrice) ? minPrice : undefined;
          const numMaxPrice = typeof maxPrice === 'number' && !isNaN(maxPrice) ? maxPrice : undefined;
          if (numMinPrice !== undefined) filterConditions.push(`price >= ${numMinPrice}`);
          if (numMaxPrice !== undefined) filterConditions.push(`price <= ${numMaxPrice}`);

          // Sanitize facet values against filter query injection
          const cleanSize = sanitizeFilterValue(size);
          const cleanColor = sanitizeFilterValue(color);
          if (cleanSize) filterConditions.push(`(attributes.sizes: ANY("${cleanSize}"))`);
          if (cleanColor) filterConditions.push(`(attributes.colors: ANY("${cleanColor}"))`);

          let orderBy = '';
          if (sortBy === 'price-low') orderBy = 'price asc';
          if (sortBy === 'price-high') orderBy = 'price desc';
          if (sortBy === 'rating') orderBy = 'attributes.rating_rate desc';

          const vertexPayload = {
            query: typeof query === 'string' ? query.trim().slice(0, 100) : '',
            visitorId,
            pageSize,
            filter: filterConditions.join(' AND ') || undefined,
            orderBy: orderBy || undefined,
            facetSpecs: [
              { facetKey: { key: 'categories' }, limit: 10 },
              { facetKey: { key: 'attributes.sizes' }, limit: 10 },
              { facetKey: { key: 'attributes.colors' }, limit: 10 }
            ]
          };

          const apiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(vertexPayload)
          });

          if (apiResponse.ok) {
            const data = await apiResponse.json();
            const results = (data.results || []).map(r => mapVertexProductToFrontend(r.product));
            return sendJson(res, 200, {
              source: 'vertex-ai-live',
              totalSize: data.totalSize || results.length,
              correctedQuery: data.correctedQuery || null,
              facets: data.facets || [],
              products: results
            }, req);
          }
        }
      } catch (err) {
        console.warn(`Vertex AI API call error (${err.message}). Using local catalog.`);
      }
    }

    // 2. SIMULATION / MOCK MODE: Semantic simulation with facets
    loadLocalCatalog();
    let filtered = [...localCatalog];

    // Category filter
    if (category && category !== 'all') {
      filtered = filtered.filter(p => {
        const hierarchy = (p.categories || []).join(' ').toLowerCase();
        if (category === "men's clothing") return hierarchy.includes("men's clothing");
        if (category === "women's clothing") return hierarchy.includes("women's clothing");
        if (category === 'jewelery') return hierarchy.includes("jewelry") || hierarchy.includes("accessories");
        return true;
      });
    }

    // Price filter
    if (minPrice !== undefined && minPrice !== null) {
      filtered = filtered.filter(p => (p.priceInfo?.price || 0) >= minPrice);
    }
    if (maxPrice !== undefined && maxPrice !== null) {
      filtered = filtered.filter(p => (p.priceInfo?.price || 0) <= maxPrice);
    }

    // Size filter
    if (size) {
      filtered = filtered.filter(p => p.attributes?.sizes?.text?.includes(size));
    }

    // Color filter
    if (color) {
      filtered = filtered.filter(p => p.attributes?.colors?.text?.includes(color));
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
        ])
      );

      filtered = filtered.map(p => {
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
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.product);
    }

    // Sorting
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.priceInfo?.price || 0) - (b.priceInfo?.price || 0));
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.priceInfo?.price || 0) - (a.priceInfo?.price || 0));
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.attributes?.rating_rate?.numbers?.[0] || 0) - (a.attributes?.rating_rate?.numbers?.[0] || 0));
    } else if (sortBy === 'newest') {
      filtered.sort((a, b) => (b.attributes?.is_new_arrival?.text?.[0] === 'true' ? 1 : -1));
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
        values: Object.entries(categoriesMap).map(([value, count]) => ({ value, count }))
      },
      {
        key: 'sizes',
        values: Object.entries(sizesMap).map(([value, count]) => ({ value, count }))
      },
      {
        key: 'colors',
        values: Object.entries(colorsMap).map(([value, count]) => ({ value, count }))
      }
    ];

    const products = filtered.map(mapVertexProductToFrontend);

    return sendJson(res, 200, {
      source: 'vertex-ai-simulation',
      totalSize: products.length,
      correctedQuery,
      facets,
      products
    }, req);
  }

  // Events Logging
  if (url.pathname === '/api/events' && req.method === 'POST') {
    const { eventType, visitorId = 'anon-visitor', product, details = {} } = body;
    const eventPayload = {
      eventType,
      visitorId,
      eventTime: new Date().toISOString(),
      productEventDetail: product ? {
        productDetails: [{
          product: { id: `onx-${product.id}` },
          quantity: details.quantity || 1
        }]
      } : undefined
    };

    console.log(`📊 [Vertex AI Event] ${eventType.toUpperCase()} | Visitor: ${visitorId} | Product: ${product?.title || 'N/A'}`);
    return sendJson(res, 200, { success: true, loggedEvent: eventPayload }, req);
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
        'Access-Control-Allow-Origin': getCorsOrigin(req)
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
});

export { server };

const isTesting =
  process.env.NODE_ENV === 'test' ||
  process.argv.includes('--test') ||
  process.execArgv.includes('--test') ||
  process.env.NODE_TEST_CONTEXT !== undefined;

if (!isTesting) {
  server.listen(PORT, () => {
    console.log(`🌐 Vertex AI Proxy running at http://127.0.0.1:${PORT}`);
  });
}
