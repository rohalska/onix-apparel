import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SORT_VALUES, DEFAULT_SORT, ORDER_BY } from '../../shared/sortOptions.mjs';
// proxy.mjs has no type declarations; suppress the implicit-any error here
// @ts-expect-error -- '../../server/proxy.mjs' has no declaration file
import { server } from '../../server/proxy.mjs';

// Pin mock mode before proxy.mjs is imported, so the sort assertions below run
// against the local catalog and never make live Vertex calls.
vi.hoisted(() => {
  process.env.GCP_PROJECT_ID = '';
});

const expected = [...SORT_VALUES].sort();

/**
 * Items of the first `enum: [...]` following the named property, in YAML or in
 * JSON. Anchored on the property rather than on the values, so the request-side
 * `sortBy` and the response-side `appliedSort` can be told apart even though
 * they carry the same list.
 */
function enumItemsFor(text: string, property: string): string[] {
  const at = text.search(new RegExp(`"?${property}"?\\s*:`));
  expect(at, `expected a ${property} property`).toBeGreaterThan(-1);
  const match = text.slice(at).match(/"?enum"?:\s*\[([^\]]*)\]/);
  expect(match, `expected an enum under ${property}`).not.toBeNull();
  return [...match![1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]).sort();
}

const publishedContracts = [
  'openapi.yaml',
  'public/openapi.yaml',
  'public/.well-known/agent-card.json',
];

describe('sort values agree across every surface', () => {
  it.each(publishedContracts)('%s declares exactly the shared sort values', (file) => {
    expect(enumItemsFor(readFileSync(file, 'utf8'), 'sortBy')).toEqual(expected);
  });

  // The request side alone was checked until appliedSort had shipped in the
  // proxy for a while without appearing in any published contract. The field
  // exists to make the sort fallback observable, and the consumer that needs to
  // observe it reads these files, not server/proxy.mjs.
  it.each(publishedContracts)('%s declares appliedSort on the response', (file) => {
    expect(enumItemsFor(readFileSync(file, 'utf8'), 'appliedSort')).toEqual(expected);
  });

  it('matches the option values the filter bar renders exactly', () => {
    const source = readFileSync('src/components/FilterBar.tsx', 'utf8');
    const start = source.indexOf('value={sortBy}');
    const block = source.slice(start, source.indexOf('</select>', start));
    const rendered = [...block.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
    expect(rendered.sort()).toEqual(expected);
  });

  it('has an orderBy entry for every sort value', () => {
    expect(Object.keys(ORDER_BY).sort()).toEqual(expected);
  });
});

describe('the proxy honours the contract', () => {
  let base: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    if (typeof address === 'string' || address === null) throw new Error('no port');
    base = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('accepts every declared sort value', async () => {
    for (const sortBy of SORT_VALUES) {
      const res = await fetch(`${base}/api/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'jacket', sortBy }),
      });
      expect(res.status, `sortBy=${sortBy}`).toBe(200);
      const body = await res.json();
      expect(body.appliedSort, `sortBy=${sortBy}`).toBe(sortBy);
    }
  });

  it('falls back to the default ordering for an unknown sort value', async () => {
    const res = await fetch(`${base}/api/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'jacket', sortBy: 'price-asc' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.appliedSort).toBe(DEFAULT_SORT);
  });

  async function search(sortBy: string) {
    const res = await fetch(`${base}/api/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '', sortBy }),
    });
    expect(res.status).toBe(200);
    return res.json();
  }

  it('orders results in mock mode for price-low, price-high and rating', async () => {
    const low = await search('price-low');
    expect(low.source).toBe('vertex-ai-simulation');
    const lowPrices = low.products.map((p: { price: number }) => p.price);
    expect(lowPrices.length).toBeGreaterThan(1);
    expect(lowPrices).toEqual([...lowPrices].sort((a, b) => a - b));

    const high = await search('price-high');
    const highPrices = high.products.map((p: { price: number }) => p.price);
    expect(highPrices).toEqual([...highPrices].sort((a, b) => b - a));
    expect(highPrices).not.toEqual(lowPrices);

    const rated = await search('rating');
    const rates = rated.products.map((p: { rating: { rate: number } }) => p.rating.rate);
    expect(rates).toEqual([...rates].sort((a, b) => b - a));
  });
});
