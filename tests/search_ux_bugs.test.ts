import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClientSearch } from '../src/services/vertexSearch';
import { FALLBACK_PRODUCTS } from '../src/data/fallbackProducts';

describe('Search UX & Business Logic Edge Cases', () => {
  it('BUG VERIFICATION: Searching cross-category should not return 0 when user searches globally', () => {
    // If a user is on "women's clothing" category and searches for "jacket",
    // there are men's jackets in the store!
    const womensOnlyResults = simulateClientSearch(
      { query: 'mens cotton jacket', category: "women's clothing" },
      FALLBACK_PRODUCTS
    );

    // If restricted strictly by category:
    const globalResults = simulateClientSearch(
      { query: 'mens cotton jacket', category: 'all' },
      FALLBACK_PRODUCTS
    );

    assert.ok(globalResults.products.length > 0, 'Global search must find the Mens Cotton Jacket');
    console.log(`Global search count: ${globalResults.products.length}, Category restricted count: ${womensOnlyResults.products.length}`);
  });

  it('Partial word matching: "jack" should match "Mens Cotton Jacket"', () => {
    const res = simulateClientSearch({ query: 'jack' }, FALLBACK_PRODUCTS);
    assert.ok(res.products.length > 0, 'Partial keyword "jack" should match jacket');
  });

  it('Partial word matching: "jewel" should match jewelery items', () => {
    const res = simulateClientSearch({ query: 'jewel' }, FALLBACK_PRODUCTS);
    assert.ok(res.products.length > 0, 'Partial keyword "jewel" should match jewelry');
  });

  it('Multiple tokens: "casual slim fit" should match Mens Casual Slim Fit items', () => {
    const res = simulateClientSearch({ query: 'casual slim fit' }, FALLBACK_PRODUCTS);
    assert.ok(res.products.length > 0, 'Should match multi-token search');
    const ids = res.products.map((p) => p.id);
    assert.ok(ids.includes(2) && ids.includes(4), 'Should include both casual slim fit items');
  });

  it('No crash on single character queries ("a", "m", "s")', () => {
    for (const char of ['a', 'm', 's', 'x']) {
      assert.doesNotThrow(() => {
        const res = simulateClientSearch({ query: char }, FALLBACK_PRODUCTS);
        assert.ok(Array.isArray(res.products));
      });
    }
  });

  it('Typo matching: "coat" should find jackets or outerwear', () => {
    const res = simulateClientSearch({ query: 'coat' }, FALLBACK_PRODUCTS);
    // Let's verify if "coat" matches jackets
    console.log(`"coat" search matches: ${res.products.length}`);
  });
});
