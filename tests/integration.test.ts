import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  simulateClientSearch,
  searchVertexProducts,
  trackVertexUserEvent,
} from '../src/services/vertexSearch';
import { FALLBACK_PRODUCTS } from '../src/data/fallbackProducts';

describe('Search Integration & Robustness Test Suite', () => {
  it('should handle special regex characters in search query without crashing', () => {
    const specialQueries = [
      'jacket (waterproof)',
      'cotton [slim]',
      'shirt*',
      'bag+pack',
      'price $50',
      '\\tshirt',
      'item?query',
      '.',
      '.*',
    ];

    for (const q of specialQueries) {
      assert.doesNotThrow(() => {
        const res = simulateClientSearch({ query: q }, FALLBACK_PRODUCTS);
        assert.ok(Array.isArray(res.products));
      }, `Search should not throw on special characters: "${q}"`);
    }
  });

  it('should handle missing product attributes gracefully without null reference errors', () => {
    const malformedProducts = [
      {
        id: 901,
        title: 'Minimal Item',
        price: 10,
        description: '',
        category: 'clothing',
        image: '',
        rating: { rate: 0, count: 0 },
        inStock: true,
        featured: false,
        isNewArrival: false,
        // sizes and colors intentionally undefined
      },
      {
        id: 902,
        title: '',
        price: 0,
        description: 'Only description exists',
        category: '',
        image: '',
        rating: { rate: 0, count: 0 },
        sizes: [],
        colors: [],
        inStock: true,
        featured: false,
        isNewArrival: false,
      },
    ] as any;

    assert.doesNotThrow(() => {
      const res = simulateClientSearch({ query: 'item' }, malformedProducts);
      assert.ok(Array.isArray(res.products));
    });
  });

  it('should fall back gracefully to local simulation when backend proxy is unreachable', async () => {
    // Override global fetch to simulate network error or EPERM
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:3001');
    };

    try {
      const res = await searchVertexProducts(
        { query: 'jacket' },
        FALLBACK_PRODUCTS
      );

      assert.ok(res, 'Expected a valid response even when network fails');
      assert.ok(res.products.length > 0, 'Expected fallback search to find jackets');
      assert.equal(res.source, 'vertex-ai-simulation');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should fall back gracefully when backend returns HTTP 500 error', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const res = await searchVertexProducts(
        { query: 'shirt' },
        FALLBACK_PRODUCTS
      );

      assert.ok(res);
      assert.ok(res.products.length > 0, 'Expected fallback search to find shirts');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should track user events without throwing even if telemetry endpoint fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Telemetry offline');
    };

    try {
      await assert.doesNotReject(async () => {
        await trackVertexUserEvent('detail-page-view', FALLBACK_PRODUCTS[0]);
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should propagate cancellation when externalSignal is triggered', async () => {
    const originalFetch = globalThis.fetch;
    let fetchAborted = false;

    globalThis.fetch = async (_url, options) => {
      const signal = options?.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          fetchAborted = true;
        });
      }
      // Simulate delay longer than abort trigger
      await new Promise((resolve) => setTimeout(resolve, 50));
      return new Response(JSON.stringify({ products: [] }), { status: 200 });
    };

    try {
      const controller = new AbortController();
      const searchPromise = searchVertexProducts({ query: 'jacket' }, FALLBACK_PRODUCTS, controller.signal);
      
      // Abort immediately while fetch is in flight
      controller.abort();
      const res = await searchPromise;

      assert.equal(fetchAborted, true, 'Fetch signal must be aborted when externalSignal aborts');
      assert.ok(res, 'Must return simulation fallback without throwing');
      assert.ok(res.products.length > 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should enforce upstream deadline in proxy.mjs', async () => {
    const { UPSTREAM_SEARCH_TIMEOUT_MS } = await import('../server/proxy.mjs');
    assert.ok(typeof UPSTREAM_SEARCH_TIMEOUT_MS === 'number');
    assert.ok(UPSTREAM_SEARCH_TIMEOUT_MS >= 1000 && UPSTREAM_SEARCH_TIMEOUT_MS <= 10000,
      `Upstream search deadline (${UPSTREAM_SEARCH_TIMEOUT_MS}ms) should be between 1s and 10s`);
  });

  it('should have debounced search in AppContent raised to at least 300ms', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const appContent = fs.readFileSync(path.resolve(process.cwd(), 'src/AppContent.tsx'), 'utf-8');
    
    // Verify 150ms debounce was replaced with >= 300ms
    assert.ok(!appContent.includes('}, 150);'), 'Old 150ms debounce must be removed');
    assert.ok(appContent.includes('}, 300);') || appContent.includes('}, 350);') || appContent.includes('}, 400);'),
      'Search input debounce should be raised to at least 300ms');
    assert.ok(appContent.includes('controller.abort()'), 'Cleanup must abort in-flight controller');
  });
});
