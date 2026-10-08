import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

// proxy.mjs reads GCP_PROJECT_ID at import time to decide live mode, so this
// has to be set before the import below runs. GOOGLE_ACCESS_TOKEN short-circuits
// token acquisition in non-production, which keeps the test off the metadata
// server and off google-auth-library.
vi.hoisted(() => {
  process.env.GCP_PROJECT_ID = 'test-project';
  process.env.GCP_LOCATION = 'global';
  process.env.GCP_CATALOG_ID = 'default_catalog';
  process.env.GCP_SERVING_CONFIG_ID = 'default_search';
  process.env.GOOGLE_ACCESS_TOKEN = 'fake-token-for-tests';
  // NODE_ENV must stay 'test': proxy.mjs only skips its own server.listen when
  // it thinks it is under test, and deleting this makes the module bind a port
  // at import time, after which beforeAll's listen throws. 'test' is also not
  // 'production', so the GOOGLE_ACCESS_TOKEN short-circuit above still applies.
  process.env.NODE_ENV = 'test';
  delete process.env.K_SERVICE;
});

// @ts-expect-error -- '../../server/proxy.mjs' has no declaration file
// prettier-ignore
import { server } from '../../server/proxy.mjs';

let base: string;
const realFetch = globalThis.fetch;

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (typeof address === 'string' || address === null) throw new Error('no port');
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

/**
 * The shape Retail actually returns. Each result carries `id` and a `product`
 * holding only `name`; title, price and images are absent even when a field
 * mask asks for them. Checked against the live API: a mask of
 * `results.product.title,results.product.images` still came back `product: {}`.
 * Search is an identifier service, and the catalog supplies the rest.
 */
function stubRetailSearch(ids: string[], totalSize = ids.length) {
  globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
    const href = String(url);
    if (href.includes('retail.googleapis.com')) {
      return new Response(
        JSON.stringify({
          results: ids.map((id) => ({
            id,
            product: {
              name: `projects/1/locations/global/catalogs/default_catalog/branches/0/products/${id}`,
            },
          })),
          totalSize,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    throw new Error(`unexpected outbound fetch in test: ${href}`);
  }) as unknown as typeof fetch;
}

async function search(body: Record<string, unknown>) {
  // realFetch, not the stub: the stub is installed to intercept the server's
  // outbound call to Retail, and using it here would answer the test's own
  // request to the local server instead of letting the handler run.
  const res = await realFetch(`${base}/api/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

describe('live Retail search hydrates results from the catalog', () => {
  it('returns products with real titles rather than empty cards', async () => {
    stubRetailSearch(['onx-3', 'onx-16']);
    const { status, json } = await search({ query: 'jacket' });

    expect(status).toBe(200);
    expect(json.source).toBe('vertex-ai-live');
    expect(json.products).toHaveLength(2);

    // The defect this pins: mapping Retail's `result.product` produced cards
    // with no title at all, so the grid rendered blank.
    for (const p of json.products) {
      expect(p.title, `product ${p.id} came back without a title`).toBeTruthy();
      expect(String(p.title).length).toBeGreaterThan(3);
    }
  });

  it('gives each result its own id instead of collapsing them to 1', async () => {
    stubRetailSearch(['onx-1', 'onx-3', 'onx-16']);
    const { json } = await search({ query: 'jacket' });

    const ids = json.products.map((p: { id: number }) => p.id);
    // `parseInt(undefined) || 1` turned every id into 1, so three distinct
    // products arrived as three copies of product 1.
    expect(new Set(ids).size).toBe(3);
    expect(ids).toEqual([1, 3, 16]);
  });

  it('keeps the order Retail ranked them in', async () => {
    stubRetailSearch(['onx-16', 'onx-1', 'onx-3']);
    const { json } = await search({ query: 'jacket' });
    expect(json.products.map((p: { id: number }) => p.id)).toEqual([16, 1, 3]);
  });

  it('drops an id the catalog does not know rather than emitting a blank product', async () => {
    stubRetailSearch(['onx-3', 'onx-does-not-exist']);
    const { json } = await search({ query: 'jacket' });

    expect(json.products).toHaveLength(1);
    expect(json.products[0].id).toBe(3);
    expect(json.products[0].title).toBeTruthy();
  });

  it('carries the image and price through from the catalog', async () => {
    stubRetailSearch(['onx-1']);
    const { json } = await search({ query: 'backpack' });

    const p = json.products[0];
    expect(p.image, 'image was empty, which renders a broken tile').toBeTruthy();
    expect(typeof p.price).toBe('number');
    expect(p.price).toBeGreaterThan(0);
  });

  it('aligns live category filter conditions with mock synonyms', async () => {
    let capturedFilter = '';
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      if (href.includes('retail.googleapis.com')) {
        const body = JSON.parse(String(init?.body || '{}'));
        capturedFilter = body.filter || '';
        return new Response(JSON.stringify({ results: [], totalSize: 0 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      throw new Error(`unexpected outbound fetch: ${href}`);
    }) as unknown as typeof fetch;

    await search({ category: 'furniture' });
    expect(capturedFilter).toBe('(categories: ANY("Home & Living", "Furniture"))');

    await search({ category: 'beauty' });
    expect(capturedFilter).toBe('(categories: ANY("Beauty & Fragrance > Skincare", "Skincare"))');

    await search({ category: 'jewelery' });
    expect(capturedFilter).toBe(
      '(categories: ANY("Accessories > Fine Jewelry", "Accessories", "Jewelry", "Jewelery"))',
    );
  });
});
