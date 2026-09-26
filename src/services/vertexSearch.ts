import { Product } from '../types/product';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { correctQuery } from '../utils/fuzzySearch';

export interface FacetValue {
  value: string;
  count: number;
}

export interface FacetGroup {
  key: string;
  values: FacetValue[];
}

export interface VertexSearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  sortBy?: string;
  pageSize?: number;
}

export interface VertexSearchResponse {
  source: 'vertex-ai-live' | 'vertex-ai-simulation' | 'local-fallback';
  totalSize: number;
  correctedQuery: string | null;
  facets: FacetGroup[];
  products: Product[];
}

export interface VertexHealthResponse {
  status: string;
  mode: 'live' | 'mock';
  gcpProjectId: string | null;
  location: string;
  catalogItemCount: number;
  timestamp: string;
}

// Generate or retrieve persistent anonymous visitorId for Retail ML ranking safely
function getVisitorId(): string {
  const STORAGE_KEY = 'onix_visitor_id';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      let visitorId = window.localStorage.getItem(STORAGE_KEY);
      if (!visitorId) {
        visitorId = `vis_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
        window.localStorage.setItem(STORAGE_KEY, visitorId);
      }
      return visitorId;
    }
  } catch {
    // Fallback if localStorage is disabled or throws SecurityError
  }
  return `vis_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
}

/**
 * Resilient in-memory client search simulation with semantic scoring,
 * typo autocorrection, and dynamic facet calculation.
 */
export function simulateClientSearch(
  params: VertexSearchParams = {},
  catalog: Product[] = FALLBACK_PRODUCTS
): VertexSearchResponse {
  const {
    query = '',
    category = 'all',
    minPrice,
    maxPrice = 700,
    size,
    color,
    sortBy = 'featured',
  } = params;

  let filtered = [...catalog];

  // 1. Category Filter
  if (category && category !== 'all') {
    filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  // 2. Price Filter
  if (minPrice !== undefined && minPrice !== null) {
    filtered = filtered.filter((p) => p.price >= minPrice);
  }
  if (maxPrice !== undefined && maxPrice !== null) {
    filtered = filtered.filter((p) => p.price <= maxPrice);
  }

  // 3. Size Filter
  if (size) {
    filtered = filtered.filter((p) => p.sizes?.includes(size));
  }

  // 4. Color Filter
  if (color) {
    filtered = filtered.filter((p) =>
      p.colors?.some((c) => c.name.toLowerCase() === color.toLowerCase())
    );
  }

  // 5. Query matching & Fuzzy Autocorrection
  let correctedQuery: string | null = null;
  const cleanQ = query.trim().toLowerCase();

  if (cleanQ) {
    const { correctedQuery: autoCorrect, tokens } = correctQuery(cleanQ);
    correctedQuery = autoCorrect;
    const searchTokens = tokens;

    filtered = filtered
      .map((p) => {
        let score = 0;
        const titleLower = (p.title || '').toLowerCase();
        const descLower = (p.description || '').toLowerCase();
        const catLower = (p.category || '').toLowerCase();
        const colorsLower = (p.colors || []).map((c) => c.name.toLowerCase()).join(' ');
        const sizesLower = (p.sizes || []).join(' ').toLowerCase();

        for (const token of searchTokens) {
          if (titleLower.includes(token)) score += 15;
          if (catLower.includes(token)) score += 8;
          if (colorsLower.includes(token)) score += 5;
          if (sizesLower.includes(token)) score += 4;
          if (descLower.includes(token)) score += 2;
        }

        return { product: p, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product);
  }

  // 6. Sorting
  if (sortBy === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'rating') {
    filtered.sort((a, b) => b.rating.rate - a.rating.rate);
  } else if (sortBy === 'newest') {
    filtered.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
  } else if (sortBy === 'featured') {
    filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  // 7. Dynamic Facet Calculation
  const sizeMap: Record<string, number> = {};
  const colorMap: Record<string, number> = {};

  filtered.forEach((p) => {
    p.sizes?.forEach((s) => {
      sizeMap[s] = (sizeMap[s] || 0) + 1;
    });
    p.colors?.forEach((c) => {
      colorMap[c.name] = (colorMap[c.name] || 0) + 1;
    });
  });

  const facets: FacetGroup[] = [
    {
      key: 'sizes',
      values: Object.entries(sizeMap)
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, count })),
    },
    {
      key: 'colors',
      values: Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, count })),
    },
  ];

  return {
    source: 'vertex-ai-simulation',
    totalSize: filtered.length,
    correctedQuery,
    facets,
    products: filtered,
  };
}

/**
 * Execute a commerce search query via the Vertex AI Retail Search backend proxy,
 * falling back seamlessly to local simulation if the proxy is unavailable.
 */
export async function searchVertexProducts(
  params: VertexSearchParams = {},
  fallbackCatalog: Product[] = FALLBACK_PRODUCTS
): Promise<VertexSearchResponse> {
  const visitorId = getVisitorId();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);

    const res = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        visitorId,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.products) && data.products.length > 0) {
        return data as VertexSearchResponse;
      }
    }
  } catch {
    // Network / proxy error: fall back seamlessly to client simulation
  }

  // Return high-fidelity in-memory client simulation
  return simulateClientSearch(params, fallbackCatalog);
}

/**
 * Log real-time e-commerce user events (views, cart adds, purchases)
 * to train Vertex AI's personalization and ranking models (Quality Flywheel).
 */
export async function trackVertexUserEvent(
  eventType: 'detail-page-view' | 'add-to-cart' | 'purchase-complete',
  product?: Product,
  details: Record<string, any> = {}
): Promise<void> {
  const visitorId = getVisitorId();

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        visitorId,
        product,
        details,
      }),
    });
  } catch {
    // Non-blocking telemetry
  }
}

/**
 * Check backend proxy connection and Vertex AI mode.
 */
export async function getVertexHealth(): Promise<VertexHealthResponse | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
