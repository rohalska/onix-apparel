import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { simulateClientSearch } from '../src/services/vertexSearch';
import { FALLBACK_PRODUCTS } from '../src/data/fallbackProducts';

describe('Global vs Category Search Behavior', () => {
  it('should find products across all categories when search is global (category=all)', () => {
    const jacketRes = simulateClientSearch({ query: 'jacket', category: 'all' }, FALLBACK_PRODUCTS);
    assert.ok(jacketRes.products.length > 0, 'Must find jackets in global search');

    const diamondRes = simulateClientSearch(
      { query: 'diamond', category: 'all' },
      FALLBACK_PRODUCTS,
    );
    assert.ok(diamondRes.products.length > 0, 'Must find diamonds in global search');

    const backpackRes = simulateClientSearch(
      { query: 'backpack', category: 'all' },
      FALLBACK_PRODUCTS,
    );
    assert.ok(backpackRes.products.length > 0, 'Must find backpacks in global search');
  });

  it('proves that restricting search strictly to category="jewelry" blocks finding jackets', () => {
    const res = simulateClientSearch({ query: 'jacket', category: 'jewelry' }, FALLBACK_PRODUCTS);
    assert.equal(res.products.length, 0, 'Jewelry category has 0 jackets');
  });

  it('proves that resetting category to "all" during search enables finding all items', () => {
    const res = simulateClientSearch({ query: 'jacket', category: 'all' }, FALLBACK_PRODUCTS);
    assert.ok(res.products.length > 0, 'Resetting category to "all" reveals jackets');
  });

  it('correctly discriminates coffee products between furniture and groceries categories', () => {
    const furnitureRes = simulateClientSearch(
      { query: 'coffee', category: 'furniture' },
      FALLBACK_PRODUCTS,
    );
    assert.ok(furnitureRes.products.length > 0, 'Must find furniture coffee items');
    furnitureRes.products.forEach((p) => {
      assert.equal(p.category, 'furniture', 'All items in furniture search must be furniture');
    });

    const groceryRes = simulateClientSearch(
      { query: 'coffee', category: 'groceries' },
      FALLBACK_PRODUCTS,
    );
    assert.ok(groceryRes.products.length > 0, 'Must find grocery coffee items');
    groceryRes.products.forEach((p) => {
      assert.equal(p.category, 'groceries', 'All items in groceries search must be groceries');
    });
  });

  it('correctly discriminates skincare/beauty products from fragrances without overlap', () => {
    const beautyRes = simulateClientSearch({ category: 'beauty' }, FALLBACK_PRODUCTS);
    assert.ok(beautyRes.products.length > 0, 'Must find beauty items');
    beautyRes.products.forEach((p) => {
      assert.equal(p.category, 'beauty', 'Every item in beauty search must be category beauty');
    });

    const fragranceRes = simulateClientSearch({ category: 'fragrances' }, FALLBACK_PRODUCTS);
    assert.ok(fragranceRes.products.length > 0, 'Must find fragrance items');
    fragranceRes.products.forEach((p) => {
      assert.equal(
        p.category,
        'fragrances',
        'Every item in fragrances search must be category fragrances',
      );
    });

    const beautyIds = new Set(beautyRes.products.map((p) => p.id));
    const fragranceIds = fragranceRes.products.map((p) => p.id);
    assert.ok(
      fragranceIds.every((id) => !beautyIds.has(id)),
      'Beauty and fragrances result sets must be completely disjoint',
    );
  });

  it("correctly discriminates men's clothing from women's clothing without overlap", () => {
    const menRes = simulateClientSearch({ category: "men's clothing" }, FALLBACK_PRODUCTS);
    assert.ok(menRes.products.length > 0, "Must find men's clothing items");
    menRes.products.forEach((p) => {
      assert.equal(
        p.category,
        "men's clothing",
        "Every item in men's search must be category men's clothing",
      );
    });

    const womenRes = simulateClientSearch({ category: "women's clothing" }, FALLBACK_PRODUCTS);
    assert.ok(womenRes.products.length > 0, "Must find women's clothing items");
    womenRes.products.forEach((p) => {
      assert.equal(
        p.category,
        "women's clothing",
        "Every item in women's search must be category women's clothing",
      );
    });

    const menIds = new Set(menRes.products.map((p) => p.id));
    const womenIds = womenRes.products.map((p) => p.id);
    assert.ok(
      womenIds.every((id) => !menIds.has(id)),
      "Men's and women's clothing result sets must be completely disjoint",
    );
  });
});
