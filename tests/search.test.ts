import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClientSearch } from '../src/services/vertexSearch';
import { FALLBACK_PRODUCTS } from '../src/data/fallbackProducts';
import { Product } from '../src/types/product';

describe('Vertex AI & Local Search Simulation Suite', () => {
  it('should return all products when query is empty', () => {
    const res = simulateClientSearch({ query: '' }, FALLBACK_PRODUCTS);
    assert.equal(res.products.length, FALLBACK_PRODUCTS.length);
    assert.equal(res.totalSize, FALLBACK_PRODUCTS.length);
    assert.equal(res.correctedQuery, null);
  });

  it('should find jackets by keyword "jacket"', () => {
    const res = simulateClientSearch({ query: 'jacket' }, FALLBACK_PRODUCTS);
    assert.ok(res.products.length > 0, 'Expected at least 1 jacket');
    for (const product of res.products) {
      const match =
        product.title.toLowerCase().includes('jacket') ||
        product.description.toLowerCase().includes('jacket');
      assert.ok(match, `Product "${product.title}" should contain "jacket"`);
    }
  });

  it('should be case-insensitive for search queries ("JACKET", "Jacket", "jacket")', () => {
    const lowerRes = simulateClientSearch({ query: 'jacket' }, FALLBACK_PRODUCTS);
    const upperRes = simulateClientSearch({ query: 'JACKET' }, FALLBACK_PRODUCTS);
    const mixedRes = simulateClientSearch({ query: 'JaCkEt' }, FALLBACK_PRODUCTS);

    assert.equal(lowerRes.products.length, upperRes.products.length);
    assert.equal(lowerRes.products.length, mixedRes.products.length);
    assert.deepEqual(
      lowerRes.products.map((p) => p.id),
      upperRes.products.map((p) => p.id)
    );
  });

  it('should handle leading and trailing whitespace', () => {
    const normalRes = simulateClientSearch({ query: 'shirt' }, FALLBACK_PRODUCTS);
    const spacedRes = simulateClientSearch({ query: '   shirt   ' }, FALLBACK_PRODUCTS);

    assert.ok(normalRes.products.length > 0);
    assert.equal(normalRes.products.length, spacedRes.products.length);
  });

  it('should autocorrect common typos ("jacet" -> "jacket")', () => {
    const res = simulateClientSearch({ query: 'jacet' }, FALLBACK_PRODUCTS);
    assert.equal(res.correctedQuery, 'jacket');
    assert.ok(res.products.length > 0, 'Should find products for corrected query "jacket"');
  });

  it('should autocorrect "jacktet" -> "jacket"', () => {
    const res = simulateClientSearch({ query: 'jacktet' }, FALLBACK_PRODUCTS);
    assert.equal(res.correctedQuery, 'jacket');
    assert.ok(res.products.length > 0, 'Should find products for misspelled "jacktet"');
    const hasJackets = res.products.some((p) => p.title.toLowerCase().includes('jacket'));
    assert.ok(hasJackets, 'Results must contain jackets');
  });

  it('should autocorrect transposed typo "jakcet" -> "jacket"', () => {
    const res = simulateClientSearch({ query: 'jakcet' }, FALLBACK_PRODUCTS);
    assert.equal(res.correctedQuery, 'jacket');
    assert.ok(res.products.length > 0, 'Should find products for misspelled "jakcet"');
  });

  it('should autocorrect "shrt" -> "t-shirt"', () => {
    const res = simulateClientSearch({ query: 'shrt' }, FALLBACK_PRODUCTS);
    assert.equal(res.correctedQuery, 't-shirt');
    assert.ok(res.products.length > 0, 'Should find products for corrected query "t-shirt"');
  });

  it('should autocorrect "dimond" -> "diamond"', () => {
    const res = simulateClientSearch({ query: 'dimond' }, FALLBACK_PRODUCTS);
    assert.equal(res.correctedQuery, 'diamond');
    assert.ok(res.products.length > 0, 'Should find jewelry for corrected query "diamond"');
  });

  it('should search across colors and attributes (e.g. "black", "gold")', () => {
    const resBlack = simulateClientSearch({ query: 'black' }, FALLBACK_PRODUCTS);
    assert.ok(resBlack.products.length > 0, 'Expected products with black color or in title');

    const resGold = simulateClientSearch({ query: 'gold' }, FALLBACK_PRODUCTS);
    assert.ok(resGold.products.length > 0, 'Expected products matching gold');
  });

  it('should return 0 products for completely non-existent queries without throwing', () => {
    const res = simulateClientSearch({ query: 'xyznonexistentterm999' }, FALLBACK_PRODUCTS);
    assert.equal(res.products.length, 0);
    assert.equal(res.totalSize, 0);
    assert.equal(res.correctedQuery, null);
  });

  it('should correctly filter by maxPrice in combination with search query', () => {
    const query = 'jacket';
    const allJackets = simulateClientSearch({ query }, FALLBACK_PRODUCTS);
    const budgetJackets = simulateClientSearch({ query, maxPrice: 60 }, FALLBACK_PRODUCTS);

    assert.ok(allJackets.products.length >= budgetJackets.products.length);
    for (const p of budgetJackets.products) {
      assert.ok(p.price <= 60, `Product price ${p.price} must be <= 60`);
    }
  });

  it('should correctly filter by size facet in combination with search query', () => {
    const res = simulateClientSearch({ query: 'clothing', size: 'M' }, FALLBACK_PRODUCTS);
    for (const p of res.products) {
      assert.ok(p.sizes?.includes('M'), `Product ${p.title} must have size M`);
    }
  });

  it('should correctly sort by price low-to-high', () => {
    const res = simulateClientSearch({ query: '', sortBy: 'price-asc' }, FALLBACK_PRODUCTS);
    for (let i = 0; i < res.products.length - 1; i++) {
      assert.ok(
        res.products[i].price <= res.products[i + 1].price,
        `Expected ascending prices: ${res.products[i].price} <= ${res.products[i + 1].price}`
      );
    }
  });

  it('should correctly sort by price high-to-low', () => {
    const res = simulateClientSearch({ query: '', sortBy: 'price-desc' }, FALLBACK_PRODUCTS);
    for (let i = 0; i < res.products.length - 1; i++) {
      assert.ok(
        res.products[i].price >= res.products[i + 1].price,
        `Expected descending prices: ${res.products[i].price} >= ${res.products[i + 1].price}`
      );
    }
  });

  it('should generate dynamic facet counts reflecting the filtered results', () => {
    const res = simulateClientSearch({ query: 'jacket' }, FALLBACK_PRODUCTS);
    assert.ok(res.facets.length >= 2, 'Expected size and color facet groups');

    const sizeFacet = res.facets.find((f) => f.key === 'sizes');
    assert.ok(sizeFacet, 'Expected sizes facet group');
    assert.ok(sizeFacet.values.length > 0, 'Expected sizes in facet group');
  });

  it('POTENTIAL BUG TEST: Searching for cross-category items when category filter is active', () => {
    // When category is "women's clothing" and user searches for "mens cotton jacket":
    // Does search return 0 results because of the category lock?
    const res = simulateClientSearch(
      { query: 'mens cotton jacket', category: "women's clothing" },
      FALLBACK_PRODUCTS
    );
    // If strict category filter is applied, it will return 0 results even though the store has the item!
    console.log(`Cross-category search count: ${res.products.length}`);
  });
});
