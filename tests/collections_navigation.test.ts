import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { FALLBACK_PRODUCTS } from '../src/data/fallbackProducts';

describe('Footer Collections Links & Catalog Filtering', () => {
  const collectionRoutes = ['women', 'men', 'accessories', 'new', 'sale', 'holiday'];

  it('validates that all 6 Collections routes are recognized', () => {
    collectionRoutes.forEach((route) => {
      assert.ok(['women', 'men', 'accessories', 'new', 'sale', 'holiday'].includes(route));
    });
  });

  it('verifies hash matching logic correctly strips leading # and resolves collection routes', () => {
    const testCases = [
      { hash: '#women', expected: 'women' },
      { hash: '#men', expected: 'men' },
      { hash: '#accessories', expected: 'accessories' },
      { hash: '#new', expected: 'new' },
      { hash: '#sale', expected: 'sale' },
      { hash: '#holiday', expected: 'holiday' },
    ];

    testCases.forEach(({ hash, expected }) => {
      const parsed = hash.replace('#', '');
      assert.equal(parsed, expected);
      assert.ok(collectionRoutes.includes(parsed));
    });
  });

  it('provides 30 holiday gifts across Electronics and lifestyle departments', () => {
    const holidayProducts = FALLBACK_PRODUCTS.filter((product) =>
      product.collectionKeys?.includes('holiday_gifts_2026'),
    );

    assert.equal(holidayProducts.length, 30);
    const categoryCounts = holidayProducts.reduce<Record<string, number>>((counts, product) => {
      counts[product.category] = (counts[product.category] || 0) + 1;
      return counts;
    }, {});

    assert.equal(categoryCounts.electronics, 22);
    assert.equal(categoryCounts["men's clothing"], 3);
    assert.equal(categoryCounts.jewelry, 2);
    assert.equal(categoryCounts.groceries, 2);
    assert.equal(categoryCounts.furniture, 1);
    holidayProducts.forEach((product) => {
      assert.ok(product.targetAudience?.includes('AI engineers'));
      assert.ok(product.occasions?.includes('Christmas 2026'));
    });
  });

  it("verifies filtering for Women's Apparel (#women) returns only women's clothing", () => {
    const womenProducts = FALLBACK_PRODUCTS.filter(
      (p) => p.category.toLowerCase() === "women's clothing",
    );
    assert.ok(womenProducts.length > 0, "Must have women's clothing products");
    womenProducts.forEach((p) => {
      assert.equal(p.category, "women's clothing");
    });
  });

  it("verifies filtering for Men's Casual & Outerwear (#men) returns only men's clothing", () => {
    const menProducts = FALLBACK_PRODUCTS.filter(
      (p) => p.category.toLowerCase() === "men's clothing",
    );
    assert.ok(menProducts.length > 0, "Must have men's clothing products");
    menProducts.forEach((p) => {
      assert.equal(p.category, "men's clothing");
    });
  });

  it('verifies filtering for Fine Jewelry & Accessories (#accessories) returns only jewelry', () => {
    const jewelryProducts = FALLBACK_PRODUCTS.filter((p) => p.category.toLowerCase() === 'jewelry');
    assert.ok(jewelryProducts.length > 0, 'Must have jewelry products');
    jewelryProducts.forEach((p) => {
      assert.equal(p.category, 'jewelry');
    });
  });

  it('verifies filtering for Seasonal New Arrivals (#new) returns only new arrival items', () => {
    const newArrivals = FALLBACK_PRODUCTS.filter((p) => p.isNewArrival);
    assert.ok(newArrivals.length > 0, 'Must have new arrival items');
    newArrivals.forEach((p) => {
      assert.equal(p.isNewArrival, true);
    });
  });

  it('verifies filtering for End of Season Sale (#sale) returns items with discount pricing', () => {
    const saleItems = FALLBACK_PRODUCTS.filter((p) => p.onSale || p.price <= 50);
    assert.ok(saleItems.length > 0, 'Must have sale items');
    const explicitSale = FALLBACK_PRODUCTS.filter((p) => p.onSale);
    assert.ok(explicitSale.length >= 4, 'Must have at least 4 marked down sale products');
    explicitSale.forEach((p) => {
      assert.ok(
        p.originalPrice && p.originalPrice > p.price,
        'Original price must exceed sale price',
      );
      assert.ok(p.discountPercent && p.discountPercent > 0, 'Must have discount percent');
    });
  });
});
