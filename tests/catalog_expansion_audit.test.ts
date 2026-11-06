import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FALLBACK_PRODUCTS } from '../src/data/fallbackProducts';
import { HOLIDAY_GIFT_PRODUCTS } from '../src/data/holidayGiftProducts.mjs';
import { HIKING_GEAR_PRODUCTS } from '../src/data/hikingGearProducts.mjs';
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
const TOTAL_PRODUCTS = 268;

describe('268-Item Catalog Expansion Audit & Production Readiness Suite', () => {
  describe('1. Catalog Parity & Synchronization Across All Formats', () => {
    it('includes 30 holiday gift ideas with complete search metadata', () => {
      assert.equal(HOLIDAY_GIFT_PRODUCTS.length, 30);
      assert.equal(new Set(HOLIDAY_GIFT_PRODUCTS.map((product) => product.id)).size, 30);
      HOLIDAY_GIFT_PRODUCTS.forEach((product) => {
        assert.ok(product.collectionKeys?.includes('holiday_gifts_2026'));
        assert.ok(product.targetAudience?.length);
        assert.ok(product.occasions?.includes('Christmas 2026'));
        assert.ok(product.productType);
        assert.ok(product.useCases?.length);
        assert.ok(product.keyFeatures?.length);
        assert.ok(product.searchTags?.length);
      });
    });

    it('includes 50 hiking gear items across backpacks, shelter & sleep, and cooking & hydration', () => {
      assert.equal(HIKING_GEAR_PRODUCTS.length, 50);
      assert.equal(new Set(HIKING_GEAR_PRODUCTS.map((product) => product.id)).size, 50);

      const backpacks = HIKING_GEAR_PRODUCTS.filter(
        (p) => p.subcategory === 'Backpacks & Trail Packs',
      );
      const shelterSleep = HIKING_GEAR_PRODUCTS.filter(
        (p) => p.subcategory === 'Shelter & Sleep Systems',
      );
      const cookingHydration = HIKING_GEAR_PRODUCTS.filter(
        (p) => p.subcategory === 'Cooking & Hydration',
      );

      assert.equal(backpacks.length, 15, 'Must contain 15 Backpacks & Trail Packs');
      assert.equal(shelterSleep.length, 18, 'Must contain 18 Shelter & Sleep Systems');
      assert.equal(cookingHydration.length, 17, 'Must contain 17 Cooking & Hydration items');

      HIKING_GEAR_PRODUCTS.forEach((product) => {
        assert.ok(product.collectionKeys?.includes('hiking_gear_2026'));
        assert.ok(product.collectionKeys?.includes('outdoor_adventure'));
        assert.ok(product.targetAudience?.includes('hikers'));
        assert.ok(
          product.occasions?.includes('Day hiking') ||
            product.occasions?.includes('Weekend backpacking'),
        );
        assert.ok(product.productType);
        assert.ok((product.useCases?.length ?? 0) >= 3);
        assert.ok((product.keyFeatures?.length ?? 0) >= 3);
        assert.ok((product.searchTags?.length ?? 0) >= 4);
        assert.ok(product.price <= 700);
      });
    });

    it(`should have exactly ${TOTAL_PRODUCTS} items in FALLBACK_PRODUCTS`, () => {
      assert.equal(
        FALLBACK_PRODUCTS.length,
        TOTAL_PRODUCTS,
        `FALLBACK_PRODUCTS must contain exactly ${TOTAL_PRODUCTS} items`,
      );
    });

    it(`should have exactly ${TOTAL_PRODUCTS} items in exportVertexCatalog source`, () => {
      assert.equal(ONIX_PRODUCTS.length, TOTAL_PRODUCTS);
    });

    it(`should have exactly ${TOTAL_PRODUCTS} items in vertex-retail-catalog.json`, () => {
      const jsonPath = path.resolve(rootDir, 'vertex-retail-catalog.json');
      const catalog = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      assert.equal(catalog.length, TOTAL_PRODUCTS);
    });

    it(`should have exactly ${TOTAL_PRODUCTS} non-empty lines in vertex-retail-catalog.jsonl`, () => {
      const jsonlPath = path.resolve(rootDir, 'vertex-retail-catalog.jsonl');
      const lines = fs
        .readFileSync(jsonlPath, 'utf-8')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      assert.equal(lines.length, TOTAL_PRODUCTS);
    });

    it('should have 100% unique IDs across all catalog items', () => {
      const fallbackIds = FALLBACK_PRODUCTS.map((p) => p.id);
      assert.equal(
        new Set(fallbackIds).size,
        TOTAL_PRODUCTS,
        'All product IDs in FALLBACK_PRODUCTS must be unique',
      );

      const onixIds = (ONIX_PRODUCTS as Array<{ id: number }>).map((p) => p.id);
      assert.equal(
        new Set(onixIds).size,
        TOTAL_PRODUCTS,
        'All product IDs in ONIX_PRODUCTS must be unique',
      );

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

    it('maintains department coverage with a diversified Electronics assortment and expanded Outdoor Living gear', () => {
      const counts = VALID_CATEGORIES.map(
        (category) => FALLBACK_PRODUCTS.filter((product) => product.category === category).length,
      );
      assert.deepEqual(counts, [30, 30, 21, 58, 70, 19, 19, 21]);
    });

    it('provides complete Retail search metadata for all 60 apparel products', () => {
      const catalog = JSON.parse(
        fs.readFileSync(path.resolve(rootDir, 'vertex-retail-catalog.json'), 'utf-8'),
      ) as Array<{
        id: string;
        categories?: string[];
        audience?: { genders?: string[] };
        materials?: string[];
        attributes?: Record<string, { text?: string[] }>;
        tags?: string[];
      }>;
      const apparel = catalog.filter((item) =>
        item.categories?.some(
          (category) =>
            category.startsWith("Apparel > Men's Clothing") ||
            category.startsWith("Apparel > Women's Clothing"),
        ),
      );

      assert.equal(apparel.length, 60);
      apparel.forEach((item) => {
        assert.ok(item.audience?.genders?.length, `${item.id} audience gender`);
        assert.ok(item.attributes?.product_type?.text?.[0], `${item.id} product type`);
        assert.ok(item.attributes?.use_case?.text?.length, `${item.id} use cases`);
        assert.ok(item.attributes?.key_features?.text?.length, `${item.id} key features`);
        if (Number(item.id.replace('onx-', '')) >= 234) {
          assert.ok(
            item.tags?.some((tag) =>
              ['office', 'commut', 'client', 'presentation', 'hybrid', 'travel', 'casual'].some(
                (context) => tag.includes(context),
              ),
            ),
            `${item.id} recommendation context tag`,
          );
        }
        if (item.materials) {
          assert.ok(item.materials.every((material) => material.trim().length > 0));
        }
      });
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
      assert.equal(personalTech.length, 10);
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

      const holidayGifts = catalog.filter(
        (item: {
          tags?: string[];
          attributes?: {
            product_collections?: { text?: string[] };
            target_audience?: { text?: string[] };
            occasion?: { text?: string[] };
            product_type?: { text?: string[] };
            use_case?: { text?: string[] };
            key_features?: { text?: string[] };
          };
        }) => item.tags?.includes('holiday_gifts_2026'),
      );
      assert.equal(holidayGifts.length, 30);
      holidayGifts.forEach((item: { attributes?: Record<string, { text?: string[] }> }) => {
        assert.deepEqual(item.attributes?.product_collections?.text, ['holiday_gifts_2026']);
        assert.ok(item.attributes?.target_audience?.text?.length);
        assert.ok(item.attributes?.occasion?.text?.includes('Christmas 2026'));
        assert.ok(item.attributes?.product_type?.text?.[0]);
        assert.ok(item.attributes?.use_case?.text?.length);
        assert.ok(item.attributes?.key_features?.text?.length);
      });
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

  describe(`4. Agent Action Bus: ADD_TO_CART & OPEN_PRODUCT for All ${TOTAL_PRODUCTS} Products`, () => {
    it(`resolves validated ADD_TO_CART for every product ID in the ${TOTAL_PRODUCTS}-item catalog`, () => {
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

    it(`resolves validated OPEN_PRODUCT for every product ID in the ${TOTAL_PRODUCTS}-item catalog`, () => {
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
    it(`returns all ${TOTAL_PRODUCTS} products on blank global search`, () => {
      const res = simulateClientSearch({ category: 'all' }, FALLBACK_PRODUCTS);
      assert.equal(res.products.length, TOTAL_PRODUCTS);
    });

    it('filters the local simulation to the indexed 2026 holiday collection key', () => {
      const res = simulateClientSearch({ collectionKey: 'holiday_gifts_2026' }, FALLBACK_PRODUCTS);
      assert.equal(res.products.length, 30);
      res.products.forEach((product) => {
        assert.ok(product.collectionKeys?.includes('holiday_gifts_2026'));
      });

      const audienceQuery = simulateClientSearch(
        {
          query: 'Google Forward Deployment Engineer',
          collectionKey: 'holiday_gifts_2026',
        },
        FALLBACK_PRODUCTS,
      );
      assert.ok(audienceQuery.products.length > 0);
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

    it('enables hiking gear search journeys across backpacks, shelter, and cooking hydration', () => {
      const hikingCollectionRes = simulateClientSearch(
        { collectionKey: 'hiking_gear_2026' },
        FALLBACK_PRODUCTS,
      );
      assert.equal(hikingCollectionRes.products.length, 50);

      const tentRes = simulateClientSearch({ query: 'tent' }, FALLBACK_PRODUCTS);
      assert.ok(tentRes.products.length >= 3, 'Must find multiple backpacking tents');

      const sleepingBagRes = simulateClientSearch({ query: 'sleeping bag' }, FALLBACK_PRODUCTS);
      assert.ok(sleepingBagRes.products.length >= 4, 'Must find multiple sleeping bags');

      const stoveRes = simulateClientSearch({ query: 'stove' }, FALLBACK_PRODUCTS);
      assert.ok(stoveRes.products.length >= 2, 'Must find camp stoves');

      const bottleRes = simulateClientSearch({ query: 'water bottle' }, FALLBACK_PRODUCTS);
      assert.ok(bottleRes.products.length >= 3, 'Must find water bottles');

      const filterRes = simulateClientSearch({ query: 'filter' }, FALLBACK_PRODUCTS);
      assert.ok(filterRes.products.length >= 2, 'Must find backcountry water filters');

      const titaniumRes = simulateClientSearch({ query: 'titanium' }, FALLBACK_PRODUCTS);
      assert.ok(titaniumRes.products.length >= 4, 'Must find titanium gear');

      const backpackRes = simulateClientSearch({ query: 'backpack' }, FALLBACK_PRODUCTS);
      assert.ok(backpackRes.products.length >= 5, 'Must find hiking backpacks');
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

    it(`filterCatalogByCategory partitions all ${TOTAL_PRODUCTS} items across the 8 categories without leakage`, () => {
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
        TOTAL_PRODUCTS,
        `Sum of category partition counts (${totalFilteredCount}) must equal total catalog size (${TOTAL_PRODUCTS})`,
      );
    });
  });
});
