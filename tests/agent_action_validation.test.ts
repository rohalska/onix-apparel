import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  resolveValidatedAddToCart,
  resolveValidatedOpenProduct,
  MAX_ACTION_QUANTITY,
} from '../src/utils/agentActionValidator';
import { FALLBACK_PRODUCTS } from '../src/data/fallbackProducts';
import { AgentActionPayload } from '../src/services/agentActionBus';

describe('Agent Action Bus Security & Input Validation', () => {
  const activeCatalog = FALLBACK_PRODUCTS;
  const canonicalItem = FALLBACK_PRODUCTS.find((p) => p.id === 3)!; // Mens Cotton Jacket ($55.99)

  describe('accepts product IDs only & prevents fabricated product injection', () => {
    it('should ignore fabricated action.product and reject if productId is missing', () => {
      const maliciousAction = {
        action: 'ADD_TO_CART',
        product: {
          id: 99999,
          title: 'Fabricated Diamond Ring',
          price: 0.01,
          description: 'Hacked item',
          category: 'jewelery',
          image: 'https://evil.com/fake.jpg',
          rating: { rate: 5, count: 100 },
        },
      } as unknown as AgentActionPayload;

      const result = resolveValidatedAddToCart(maliciousAction, activeCatalog, FALLBACK_PRODUCTS);
      assert.equal(
        result,
        null,
        'Must reject action when productId is missing, ignoring fabricated product',
      );
    });

    it('should ignore fabricated price/title overrides even if valid productId is provided', () => {
      const maliciousAction = {
        action: 'ADD_TO_CART',
        productId: 3,
        product: {
          id: 3,
          title: 'Mens Cotton Jacket - Discounted',
          price: 0.01, // Attempted price tampering
        },
      } as unknown as AgentActionPayload;

      const result = resolveValidatedAddToCart(maliciousAction, activeCatalog, FALLBACK_PRODUCTS);
      assert.ok(result !== null);
      assert.equal(result.product.id, 3);
      assert.equal(
        result.product.price,
        canonicalItem.price,
        'Price must be resolved from canonical catalog',
      );
      assert.equal(
        result.product.title,
        canonicalItem.title,
        'Title must be resolved from canonical catalog',
      );
    });

    it('should reject non-numeric or non-positive product IDs', () => {
      const testCases = [
        { productId: 0 },
        { productId: -1 },
        { productId: -99 },
        { productId: NaN },
        { productId: Infinity },
        { productId: '3' as any },
        { productId: null as any },
        { productId: undefined as any },
      ];

      for (const tc of testCases) {
        const action = { action: 'ADD_TO_CART', ...tc } as AgentActionPayload;
        const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
        assert.equal(result, null, `Should reject productId: ${tc.productId}`);
      }
    });

    it('should reject product IDs not present in the canonical catalog', () => {
      const action: AgentActionPayload = {
        action: 'ADD_TO_CART',
        productId: 999999,
      };

      const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.equal(result, null, 'Should reject unknown product ID');
    });
  });

  describe('validates variants (size and color)', () => {
    it('should accept valid size and preserve canonical casing', () => {
      const action: AgentActionPayload = {
        action: 'ADD_TO_CART',
        productId: 3,
        size: 'l', // lowercase input
      };

      const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.ok(result !== null);
      assert.equal(result.size, 'L', 'Should match canonical size variant');
    });

    it('should fallback to default size if invalid or unsupported size is provided', () => {
      const action: AgentActionPayload = {
        action: 'ADD_TO_CART',
        productId: 3,
        size: 'FABRICATED_SIZE_XXXXL',
      };

      const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.ok(result !== null);
      assert.equal(
        result.size,
        canonicalItem.sizes![0],
        'Should fall back to product default size',
      );
    });

    it('should accept valid color and preserve canonical naming', () => {
      const action: AgentActionPayload = {
        action: 'ADD_TO_CART',
        productId: 3,
        color: 'midnight black', // lowercase
      };

      const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.ok(result !== null);
      assert.equal(result.color, 'Midnight Black', 'Should match canonical color name');
    });

    it('should fallback to default color if invalid or unsupported color is provided', () => {
      const action: AgentActionPayload = {
        action: 'ADD_TO_CART',
        productId: 3,
        color: 'Neon Glow Purple',
      };

      const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.ok(result !== null);
      assert.equal(
        result.color,
        canonicalItem.colors![0].name,
        'Should fall back to product default color',
      );
    });
  });

  describe('bounds quantity & rejects corrupting negative values', () => {
    it('should default quantity to 1 if omitted', () => {
      const action: AgentActionPayload = {
        action: 'ADD_TO_CART',
        productId: 3,
      };

      const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.ok(result !== null);
      assert.equal(result.quantity, 1);
    });

    it('should preserve valid bounded quantity', () => {
      const action: AgentActionPayload = {
        action: 'ADD_TO_CART',
        productId: 3,
        quantity: 4,
      };

      const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.ok(result !== null);
      assert.equal(result.quantity, 4);
    });

    it('should reject negative quantities to prevent cart total corruption', () => {
      const maliciousQuantities = [-1, -5, -100, 0];

      for (const qty of maliciousQuantities) {
        const action: AgentActionPayload = {
          action: 'ADD_TO_CART',
          productId: 3,
          quantity: qty,
        };

        const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
        assert.equal(result, null, `Must reject non-positive quantity: ${qty}`);
      }
    });

    it('should reject non-numeric or NaN quantities', () => {
      const invalidQuantities = [NaN, Infinity, -Infinity, '5' as any, {} as any];

      for (const qty of invalidQuantities) {
        const action: AgentActionPayload = {
          action: 'ADD_TO_CART',
          productId: 3,
          quantity: qty,
        };

        const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
        assert.equal(result, null, `Must reject invalid quantity type: ${qty}`);
      }
    });

    it('should cap excessively large quantities at MAX_ACTION_QUANTITY', () => {
      const action: AgentActionPayload = {
        action: 'ADD_TO_CART',
        productId: 3,
        quantity: 9999,
      };

      const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.ok(result !== null);
      assert.equal(
        result.quantity,
        MAX_ACTION_QUANTITY,
        `Should cap quantity at ${MAX_ACTION_QUANTITY}`,
      );
    });

    it('should floor decimal quantities to integers', () => {
      const action: AgentActionPayload = {
        action: 'ADD_TO_CART',
        productId: 3,
        quantity: 3.8,
      };

      const result = resolveValidatedAddToCart(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.ok(result !== null);
      assert.equal(result.quantity, 3);
    });
  });

  describe('resolveValidatedOpenProduct', () => {
    it('should resolve canonical product when given valid productId', () => {
      const action: AgentActionPayload = {
        action: 'OPEN_PRODUCT',
        productId: 3,
      };

      const prod = resolveValidatedOpenProduct(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.ok(prod !== null);
      assert.equal(prod.id, 3);
      assert.equal(prod.title, canonicalItem.title);
    });

    it('should reject OPEN_PRODUCT when productId is missing or fabricated', () => {
      const action = {
        action: 'OPEN_PRODUCT',
        product: { id: 9999, title: 'Fake' },
      } as unknown as AgentActionPayload;

      const prod = resolveValidatedOpenProduct(action, activeCatalog, FALLBACK_PRODUCTS);
      assert.equal(prod, null);
    });
  });
});
