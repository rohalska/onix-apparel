import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClientSearch } from '../src/services/vertexSearch';
import { FALLBACK_PRODUCTS } from '../src/data/fallbackProducts';

describe('Global vs Category Search Behavior', () => {
  it('should find products across all categories when search is global (category=all)', () => {
    const jacketRes = simulateClientSearch({ query: 'jacket', category: 'all' }, FALLBACK_PRODUCTS);
    assert.ok(jacketRes.products.length > 0, 'Must find jackets in global search');

    const diamondRes = simulateClientSearch({ query: 'diamond', category: 'all' }, FALLBACK_PRODUCTS);
    assert.ok(diamondRes.products.length > 0, 'Must find diamonds in global search');

    const backpackRes = simulateClientSearch({ query: 'backpack', category: 'all' }, FALLBACK_PRODUCTS);
    assert.ok(backpackRes.products.length > 0, 'Must find backpacks in global search');
  });

  it('proves that restricting search strictly to category="jewelery" blocks finding jackets', () => {
    const res = simulateClientSearch({ query: 'jacket', category: 'jewelery' }, FALLBACK_PRODUCTS);
    assert.equal(res.products.length, 0, 'Jewelry category has 0 jackets');
  });

  it('proves that resetting category to "all" during search enables finding all items', () => {
    const res = simulateClientSearch({ query: 'jacket', category: 'all' }, FALLBACK_PRODUCTS);
    assert.ok(res.products.length > 0, 'Resetting category to "all" reveals jackets');
  });
});
