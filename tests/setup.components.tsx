import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { WishlistProvider } from '../src/context/WishlistContext';
import { CartProvider } from '../src/context/CartContext';

// Cleanup, storage reset and the jest-dom matchers live in tests/setup.dom.ts,
// which vitest loads for every test file. They are not here because a helper
// only protects the tests that remember to import it.

/**
 * Render a component inside the contexts the app supplies at runtime.
 * ProductCard reads useWishlist; anything touching the bag reads useCart.
 */
export function renderWithProviders(ui: ReactElement) {
  return render(
    <CartProvider>
      <WishlistProvider>{ui}</WishlistProvider>
    </CartProvider>,
  );
}
