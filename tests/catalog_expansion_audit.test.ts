import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FALLBACK_PRODUCTS } from '../src/data/fallbackProducts';
import {
  resolveValidatedAddToCart,
  resolveValidatedOpenProduct,
} from '../src/utils/agentActionValidator';
import { simulateClientSearch } from '../src/services/vertexSearch';
// @ts-expect-error exportVertexCatalog is an mjs script
import { ONIX_PRODUCTS } from '../scripts/exportVertexCatalog.mjs';
// @ts-expect-error proxy is an mjs script
import { mapVertexProductToFrontend, filterCatalogByCategory } from '../server/proxy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const VALID_CATEGORIES = [
  "men's clothing",
  "women's clothing",
  'jewelry',
  'electronics',
  'furniture',
  'fragrances',
  'beauty',
  'groceries',
] as const;

describe('167-Item Catalog Expansion Audit & Production Readiness Suite', () => {
  describe('1. Catalog Parity & Synchronization Across All Formats', () => {
    it('should have exactly 167 items in FALLBACK_PRODUCTS', () => {
      assert.equal(
        FALLBACK_PRODUCTS.length,
        167,
        'FALLBACK_PRODUCTS must contain exactly 167 items',
      );
    });

    it('should have exactly 167 items in exportVertexCatalog source', () => {
      assert.equal(ONIX_PRODUCTS.length, 167, 'ONIX_PRODUCTS must contain exactly 167 items');
    });

    it('should have exactly 167 items in vertex-retail-catalog.json', () => {
      const jsonPath = path.resolve(rootDir, 'vertex-retail-catalog.json');
      const catalog = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      assert.equal(
        catalog.length,
        167,
        'vertex-retail-catalog.json must contain exactly 167 items',
      );
    });

    it('should have exactly 167 non-empty lines in vertex-retail-catalog.jsonl', () => {
      const jsonlPath = path.resolve(rootDir, 'vertex-retail-catalog.jsonl');
      const lines = fs
        .readFileSync(jsonlPath, 'utf-8')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      assert.equal(lines.length, 167, 'vertex-retail-catalog.jsonl must contain exactly 167 lines');
    });

    it('should have 100% unique IDs across all 167 items', () => {
      const fallbackIds = FALLBACK_PRODUCTS.map((p) => p.id);
      assert.equal(
        new Set(fallbackIds).size,
        167,
        'All product IDs in FALLBACK_PRODUCTS must be unique',
      );

      const onixIds = (ONIX_PRODUCTS as Array<{ id: number }>).map((p) => p.id);
      assert.equal(new Set(onixIds).size, 167, 'All product IDs in ONIX_PRODUCTS must be unique');

      // Parity check between fallback and export sources
      assert.deepEqual(
        fallbackIds.sort((a, b) => a - b),
        onixIds.sort((a, b) => a - b),
        'Product IDs in fallback and export sources must be identical',
      );
    });
  });

  describe('2. Product Field Validation & Schema Strictness', () => {
    FALLBACK_PRODUCTS.forEach((product) => {
      it(`validates schema integrity for product #${product.id}: "${product.title.slice(0, 30)}..."`, () => {
        // ID
        assert.ok(Number.isInteger(product.id) && product.id > 0, `ID must be positive integer`);

        // Title & Description
        assert.ok(
          typeof product.title === 'string' && product.title.trim().length >= 5,
          'Title length >= 5',
        );
        assert.ok(
          typeof product.description === 'string' && product.description.trim().length >= 15,
          'Desc length >= 15',
        );

        // Price
        assert.ok(typeof product.price === 'number' && product.price > 0, 'Price must be positive');
        if (product.originalPrice !== undefined) {
          assert.ok(product.originalPrice >= product.price, 'originalPrice must be >= price');
        }

        // Category
        assert.ok(
          VALID_CATEGORIES.includes(product.category as (typeof VALID_CATEGORIES)[number]),
          `Category "${product.category}" must be one of the 8 canonical categories`,
        );

        // Images
        assert.ok(
          typeof product.image === 'string' && product.image.startsWith('https://'),
          `Image URI must be https: "${product.image}"`,
        );

        // Sizes
        assert.ok(
          Array.isArray(product.sizes) && product.sizes.length > 0,
          'Sizes array must not be empty',
        );
        product.sizes.forEach((s) => {
          assert.ok(
            typeof s === 'string' && s.trim().length > 0,
            'Size item must be non-empty string',
          );
        });

        // Colors
        assert.ok(
          Array.isArray(product.colors) && product.colors.length > 0,
          'Colors array must not be empty',
        );
        product.colors.forEach((c) => {
          assert.ok(
            typeof c.name === 'string' && c.name.trim().length > 0,
            'Color name must be valid',
          );
          assert.match(
            c.hex,
            /^#[0-9a-fA-F]{3,8}$/,
            `Color hex "${c.hex}" must be a valid hex color`,
          );
        });

        // Rating
        assert.ok(
          typeof product.rating.rate === 'number' &&
            product.rating.rate >= 1 &&
            product.rating.rate <= 5,
        );
        assert.ok(Number.isInteger(product.rating.count) && product.rating.count >= 0);

        // Flags
        assert.equal(typeof product.inStock, 'boolean');
        assert.equal(typeof product.featured, 'boolean');
        assert.equal(typeof product.isNewArrival, 'boolean');
      });
    });
  });

  describe('3. Department Distribution & Category Coverage', () => {
    it('ensures all 8 departments have healthy representation (at least 5 items each)', () => {
      const counts: Record<string, number> = {};
      FALLBACK_PRODUCTS.forEach((p) => {
        counts[p.category] = (counts[p.category] || 0) + 1;
      });

      VALID_CATEGORIES.forEach((cat) => {
        assert.ok(
          (counts[cat] || 0) >= 5,
          `Department "${cat}" has ${counts[cat] || 0} items (expected >= 5)`,
        );
      });
    });

    it('allocates 36 products to Electronics while maintaining other departments', () => {
      const counts = VALID_CATEGORIES.map(
        (category) => FALLBACK_PRODUCTS.filter((product) => product.category === category).length,
      );
      assert.equal(counts[VALID_CATEGORIES.indexOf('electronics')], 36);
      counts
        .filter((_, index) => VALID_CATEGORIES[index] !== 'electronics')
        .forEach((count) => assert.ok(count === 18 || count === 19));
    });

    it('verifies Vertex Retail category hierarchies for all products', () => {
      const jsonPath = path.resolve(rootDir, 'vertex-retail-catalog.json');
      const catalog = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

      catalog.forEach(
        (item: { id: string; categories?: string[]; brands?: string[]; tags?: string[] }) => {
          assert.ok(
            Array.isArray(item.categories) && item.categories.length >= 2,
            `${item.id} must have hierarchy`,
          );
          item.categories.forEach((catStr: string) => {
            assert.ok(
              typeof catStr === 'string' && catStr.length > 0,
              'Category string must not be empty',
            );
            assert.ok(
              !catStr.includes('undefined') && !catStr.includes('null'),
              'Category string cannot contain undefined',
            );
          });

          // Brand must be ONIX WARES
          assert.deepEqual(item.brands, ['ONIX WARES']);
          // Tags must contain keywords
          assert.ok(Array.isArray(item.tags) && item.tags.length >= 2, `${item.id} must have tags`);
        },
      );
    });

    it('emits Google Retail-ready product and attribute metadata', () => {
      const jsonPath = path.resolve(rootDir, 'vertex-retail-catalog.json');
      const catalog = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

      catalog.forEach(
        (item: {
          id: string;
          languageCode?: string;
          title?: string;
          description?: string;
          conditions?: string[];
          images?: { uri?: string }[];
          priceInfo?: {
            currencyCode?: string;
            price?: number;
            originalPrice?: number;
            cost?: number;
          };
          attributes?: Record<string, { text?: string[]; numbers?: number[] }>;
          tags?: string[];
        }) => {
          assert.equal(item.languageCode, 'en-US', `${item.id} language`);
          assert.ok(item.title?.trim(), `${item.id} title`);
          assert.ok(item.description?.trim(), `${item.id} description`);
          assert.ok(item.images?.[0]?.uri?.startsWith('https://'), `${item.id} image URI`);
          assert.deepEqual(item.conditions, ['new'], `${item.id} condition`);
          assert.equal(item.priceInfo?.currencyCode, 'USD', `${item.id} currency`);
          assert.ok((item.priceInfo?.price ?? 0) > 0, `${item.id} price`);
          assert.equal(item.priceInfo?.cost, undefined, `${item.id} must not invent cost data`);
          if (item.priceInfo?.originalPrice !== undefined) {
            assert.ok(
              item.priceInfo.originalPrice > (item.priceInfo.price ?? 0),
              `${item.id} original price must exceed current price`,
            );
          }
          assert.ok(item.attributes?.product_type?.text?.[0], `${item.id} product type`);
          assert.ok(
            item.tags?.every((tag) => /^[a-z0-9_]+$/.test(tag)),
            `${item.id} tag format`,
          );
          Object.keys(item.attributes || {}).forEach((key) => {
            assert.match(key, /^[a-zA-Z0-9][a-zA-Z0-9_]*$/, `${item.id} attribute key`);
          });
        },
      );

      const personalTech = catalog.filter((item: { categories?: string[] }) =>
        item.categories?.some((category) =>
          [
            'Wearables',
            'E-Readers',
            'Personal Audio',
            'Cameras & Imaging',
            'Gaming Accessories',
          ].some((subcategory) => category.includes(`Electronics > ${subcategory}`)),
        ),
      );
      assert.equal(personalTech.length, 6);
      personalTech.forEach(
        (item: {
          attributes?: {
            product_type?: { text?: string[] };
            use_case?: { text?: string[] };
            key_features?: { text?: string[] };
          };
          tags?: string[];
        }) => {
          assert.ok(item.attributes?.product_type?.text?.[0]);
          assert.ok(item.attributes?.use_case?.text?.length);
          assert.ok(item.attributes?.key_features?.text?.length);
          assert.ok(item.tags?.length);
        },
      );
    });

    it('maps sizes, colors, and ratings to AICS standard fields for every product', () => {
      const jsonPath = path.resolve(rootDir, 'vertex-retail-catalog.json');
      const catalog = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

      catalog.forEach(
        (item: {
          id: string;
          sizes?: string[];
          colorInfo?: { colors?: string[] };
          rating?: { averageRating?: number; ratingCount?: number };
          attributes?: {
            sizes?: { text?: string[] };
            colors?: { text?: string[] };
          };
        }) => {
          assert.deepEqual(item.sizes, item.attributes?.sizes?.text, `${item.id} standard sizes`);
          assert.deepEqual(
            item.colorInfo?.colors,
            item.attributes?.colors?.text,
            `${item.id} standard colors`,
          );
          assert.ok((item.rating?.averageRating ?? 0) > 0 && (item.rating?.ratingCount ?? -1) >= 0);
        },
      );
    });
  });

  describe('4. Agent Action Bus: ADD_TO_CART & OPEN_PRODUCT for All 167 Products', () => {
    it('resolves validated ADD_TO_CART for every product ID in the 167-item catalog', () => {
      FALLBACK_PRODUCTS.forEach((product) => {
        const action = {
          action: 'ADD_TO_CART' as const,
          productId: product.id,
        };

        const result = resolveValidatedAddToCart(action, FALLBACK_PRODUCTS, FALLBACK_PRODUCTS);
        assert.ok(result !== null, `ADD_TO_CART failed for product #${product.id}`);
        assert.equal(result.product.id, product.id);
        assert.equal(result.quantity, 1, 'Default quantity should be 1');
        assert.equal(result.size, product.sizes![0], 'Should default to first canonical size');
        assert.equal(
          result.color,
          product.colors![0].name,
          'Should default to first canonical color',
        );
      });
    });

    it('resolves validated OPEN_PRODUCT for every product ID in the 167-item catalog', () => {
      FALLBACK_PRODUCTS.forEach((product) => {
        const action = {
          action: 'OPEN_PRODUCT' as const,
          productId: product.id,
        };

        const result = resolveValidatedOpenProduct(action, FALLBACK_PRODUCTS, FALLBACK_PRODUCTS);
        assert.ok(result !== null, `OPEN_PRODUCT failed for product #${product.id}`);
        assert.equal(result.id, product.id);
      });
    });

    it('gracefully falls back to canonical size and color when agent supplies invalid options', () => {
      const product = FALLBACK_PRODUCTS[0];
      const action = {
        action: 'ADD_TO_CART' as const,
        productId: product.id,
        size: 'NONEXISTENT_SIZE_3948',
        color: 'INVISIBLE_COLOR_9283',
        quantity: 2,
      };

      const result = resolveValidatedAddToCart(action, FALLBACK_PRODUCTS, FALLBACK_PRODUCTS);
      assert.ok(result !== null);
      assert.equal(result.size, product.sizes![0]);
      assert.equal(result.color, product.colors![0].name);
      assert.equal(result.quantity, 2);
    });
  });

  describe('5. Client Search & Complete-the-Outfit Scenario Simulation', () => {
    it('returns all 167 products on blank global search', () => {
      const res = simulateClientSearch({ category: 'all' }, FALLBACK_PRODUCTS);
      assert.equal(res.products.length, 167);
    });

    it('returns exact category subsets for all 8 departments', () => {
      VALID_CATEGORIES.forEach((cat) => {
        const res = simulateClientSearch({ category: cat }, FALLBACK_PRODUCTS);
        assert.ok(res.products.length >= 5, `Department "${cat}" must return >= 5 items`);
        res.products.forEach((p) => {
          assert.equal(p.category, cat, `Result ${p.title} must have category ${cat}`);
        });
      });
    });

    it('enables complete-the-outfit query journeys for smart menswear suiting', () => {
      const blazerRes = simulateClientSearch({ query: 'blazer' }, FALLBACK_PRODUCTS);
      assert.ok(blazerRes.products.some((p) => p.category === "men's clothing"));

      const chinosRes = simulateClientSearch({ query: 'chino' }, FALLBACK_PRODUCTS);
      assert.ok(chinosRes.products.length > 0);

      const oxfordRes = simulateClientSearch({ query: 'oxford' }, FALLBACK_PRODUCTS);
      assert.ok(oxfordRes.products.length > 0);

      const trenchRes = simulateClientSearch({ query: 'trench' }, FALLBACK_PRODUCTS);
      assert.ok(trenchRes.products.length > 0);
    });

    it('enables complete-the-outfit query journeys for womenswear luxury and evening looks', () => {
      const dressRes = simulateClientSearch({ query: 'slip dress' }, FALLBACK_PRODUCTS);
      assert.ok(dressRes.products.length > 0);

      const cashmereRes = simulateClientSearch({ query: 'cashmere' }, FALLBACK_PRODUCTS);
      assert.ok(cashmereRes.products.length >= 2, 'Must find cashmere sweater and cashmere scarf');

      const bootsRes = simulateClientSearch({ query: 'ankle boots' }, FALLBACK_PRODUCTS);
      assert.ok(bootsRes.products.length > 0);

      const toteRes = simulateClientSearch({ query: 'tote' }, FALLBACK_PRODUCTS);
      assert.ok(toteRes.products.length > 0);
    });

    it('enables complete workspace lifestyle bundle queries', () => {
      const keyboardRes = simulateClientSearch({ query: 'keyboard' }, FALLBACK_PRODUCTS);
      assert.ok(keyboardRes.products.length > 0);

      const deskMatRes = simulateClientSearch({ query: 'desk mat' }, FALLBACK_PRODUCTS);
      assert.ok(deskMatRes.products.length > 0);

      const mugRes = simulateClientSearch({ query: 'smart mug' }, FALLBACK_PRODUCTS);
      assert.ok(mugRes.products.length > 0);
    });
  });

  describe('6. Price Boundary Audit', () => {
    it('confirms every product is within the default storefront filter range ($0 - $700)', () => {
      FALLBACK_PRODUCTS.forEach((product) => {
        assert.ok(
          product.price <= 700,
          `Product #${product.id} price ($${product.price}) exceeds default UI ceiling of $700`,
        );
      });
    });
  });

  describe('7. Proxy Server Mapping & Category Filter Parity', () => {
    const jsonPath = path.resolve(rootDir, 'vertex-retail-catalog.json');
    const catalog = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    it('round-trip maps every Vertex AI item back to its exact canonical category', () => {
      catalog.forEach((vertexItem: { id: string }) => {
        const id = parseInt(vertexItem.id.replace('onx-', ''), 10);
        const originalProduct = FALLBACK_PRODUCTS.find((p) => p.id === id);
        assert.ok(originalProduct, `Original product #${id} must exist in fallbackProducts`);

        const mapped = mapVertexProductToFrontend(vertexItem);
        assert.equal(mapped.id, id);
        assert.equal(mapped.title, originalProduct.title);
        assert.equal(
          mapped.category,
          originalProduct.category,
          `Product #${id} (${originalProduct.title}) category mismatch: expected "${originalProduct.category}", got "${mapped.category}"`,
        );
      });
    });

    it('filterCatalogByCategory partitions all 167 items across the 8 categories without leakage', () => {
      let totalFilteredCount = 0;
      VALID_CATEGORIES.forEach((cat) => {
        const filtered = filterCatalogByCategory(catalog, cat);
        assert.ok(filtered.length >= 5, `Category "${cat}" must return >= 5 items`);
        totalFilteredCount += filtered.length;

        // Ensure every item in this filtered slice belongs to this category when mapped
        filtered.forEach((item: { title: string }) => {
          const mapped = mapVertexProductToFrontend(item);
          assert.equal(mapped.category, cat, `Item ${item.title} leaked into category ${cat}`);
        });
      });

      assert.equal(
        totalFilteredCount,
        167,
        `Sum of category partition counts (${totalFilteredCount}) must equal total catalog size (167)`,
      );
    });
  });
});
