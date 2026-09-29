import { Product } from '../types/product';
import { AgentActionPayload } from '../services/agentActionBus';

export const MIN_ACTION_QUANTITY = 1;
export const MAX_ACTION_QUANTITY = 10;

export interface ValidatedAddToCartParams {
  product: Product;
  size: string;
  color: string;
  quantity: number;
}

/**
 * Validates and resolves an ADD_TO_CART agent action against the canonical catalog.
 *
 * Security & Integrity Guarantees:
 * 1. Accepts product IDs only: completely ignores any `action.product` or `action.productTitle`
 *    to prevent fabricated products or price overrides from being injected.
 * 2. Resolves productId strictly against the canonical catalog.
 * 3. Validates variants (size and color) against the product's defined options, falling
 *    back to canonical defaults if unselected or invalid.
 * 4. Bounds quantity: requires a positive integer >= MIN_ACTION_QUANTITY (1), caps at
 *    MAX_ACTION_QUANTITY (10), and strictly rejects non-positive, NaN, or negative quantities
 *    that would corrupt cart totals.
 */
export function resolveValidatedAddToCart(
  action: AgentActionPayload,
  activeCatalog: Product[],
  fallbackCatalog: Product[]
): ValidatedAddToCartParams | null {
  // 1. Accept product IDs only - must be a valid positive integer
  const rawId = action.productId;
  if (typeof rawId !== 'number' || !Number.isInteger(rawId) || rawId <= 0) {
    console.warn('[AgentActionBus] Rejected ADD_TO_CART: productId must be a positive integer', rawId);
    return null;
  }

  // 2. Resolve against canonical catalog (active products or fallback dataset)
  const canonicalProduct =
    activeCatalog.find((p) => p.id === rawId) ||
    fallbackCatalog.find((p) => p.id === rawId);

  if (!canonicalProduct) {
    console.warn(`[AgentActionBus] Rejected ADD_TO_CART: product ID ${rawId} not found in canonical catalog`);
    return null;
  }

  // 3. Bound and validate quantity
  let quantity = 1;
  if (action.quantity !== undefined) {
    if (typeof action.quantity !== 'number' || !Number.isFinite(action.quantity)) {
      console.warn('[AgentActionBus] Rejected ADD_TO_CART: quantity must be a finite number', action.quantity);
      return null;
    }

    const floored = Math.floor(action.quantity);
    if (floored < MIN_ACTION_QUANTITY) {
      console.warn(
        `[AgentActionBus] Rejected ADD_TO_CART: non-positive quantity ${action.quantity} (min: ${MIN_ACTION_QUANTITY})`
      );
      return null;
    }

    quantity = Math.min(floored, MAX_ACTION_QUANTITY);
  }

  // 4. Validate variants: size
  const validSizes =
    canonicalProduct.sizes && canonicalProduct.sizes.length > 0
      ? canonicalProduct.sizes
      : ['M'];

  let size = validSizes[0];
  if (action.size && typeof action.size === 'string') {
    const cleanSize = action.size.trim().toLowerCase();
    const matchedSize = validSizes.find((s) => s.toLowerCase() === cleanSize);
    if (matchedSize) {
      size = matchedSize;
    } else {
      console.warn(
        `[AgentActionBus] Invalid size "${action.size}" for product ${canonicalProduct.id}. Defaulting to canonical "${size}"`
      );
    }
  }

  // 5. Validate variants: color
  const validColors =
    canonicalProduct.colors && canonicalProduct.colors.length > 0
      ? canonicalProduct.colors
      : [{ name: 'Standard', hex: '#000000' }];

  let color = validColors[0].name;
  if (action.color && typeof action.color === 'string') {
    const cleanColor = action.color.trim().toLowerCase();
    const matchedColor = validColors.find((c) => c.name.toLowerCase() === cleanColor);
    if (matchedColor) {
      color = matchedColor.name;
    } else {
      console.warn(
        `[AgentActionBus] Invalid color "${action.color}" for product ${canonicalProduct.id}. Defaulting to canonical "${color}"`
      );
    }
  }

  return {
    product: canonicalProduct,
    size,
    color,
    quantity,
  };
}

/**
 * Validates and resolves an OPEN_PRODUCT agent action against the canonical catalog.
 * Accepts product IDs only and resolves them against canonical catalog.
 */
export function resolveValidatedOpenProduct(
  action: AgentActionPayload,
  activeCatalog: Product[],
  fallbackCatalog: Product[]
): Product | null {
  const rawId = action.productId;
  if (typeof rawId !== 'number' || !Number.isInteger(rawId) || rawId <= 0) {
    console.warn('[AgentActionBus] Rejected OPEN_PRODUCT: productId must be a positive integer', rawId);
    return null;
  }

  const canonicalProduct =
    activeCatalog.find((p) => p.id === rawId) ||
    fallbackCatalog.find((p) => p.id === rawId);

  if (!canonicalProduct) {
    console.warn(`[AgentActionBus] Rejected OPEN_PRODUCT: product ID ${rawId} not found in canonical catalog`);
    return null;
  }

  return canonicalProduct;
}
