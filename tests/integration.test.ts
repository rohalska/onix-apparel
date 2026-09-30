import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  simulateClientSearch,
  searchVertexProducts,
  trackVertexUserEvent,
  trackVertexPurchaseEvent,
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
      const res = await searchVertexProducts({ query: 'jacket' }, FALLBACK_PRODUCTS);

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
      const res = await searchVertexProducts({ query: 'shirt' }, FALLBACK_PRODUCTS);

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

  it('should track consolidated purchase event and return true on success', async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody: {
      eventType: string;
      purchaseTransaction: { id: string; revenue: number };
      items: Array<unknown>;
    } | null = null;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const result = await trackVertexPurchaseEvent({
        orderId: 'test-order-1',
        revenue: 120.5,
        currencyCode: 'USD',
        items: [
          {
            product: FALLBACK_PRODUCTS[0],
            quantity: 1,
            selectedSize: 'M',
            selectedColor: 'Black',
          },
          { product: FALLBACK_PRODUCTS[1], quantity: 2 },
        ],
      });

      assert.equal(result, true);
      assert.ok(capturedBody);
      const parsed = capturedBody as {
        eventType: string;
        purchaseTransaction: { id: string; revenue: number };
        items: Array<unknown>;
      };
      assert.equal(parsed.eventType, 'purchase-complete');
      assert.equal(parsed.purchaseTransaction.id, 'test-order-1');
      assert.equal(parsed.purchaseTransaction.revenue, 120.5);
      assert.equal(parsed.items.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should handle purchase event failure gracefully and return false without throwing', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Telemetry network failure');
    };

    try {
      const result = await trackVertexPurchaseEvent({
        orderId: 'test-order-2',
        revenue: 50,
        items: [{ product: FALLBACK_PRODUCTS[0], quantity: 1 }],
      });
      assert.equal(result, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
