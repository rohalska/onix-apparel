// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from '../../src/components/ProductCard';
import { renderWithProviders } from '../setup.components';
import type { Product } from '../../src/types/product';

const product: Product = {
  id: 1,
  title: 'Quilted Field Jacket',
  price: 248,
  description: 'A waxed cotton field jacket.',
  category: "men's clothing",
  image: 'https://example.invalid/jacket.jpg',
  rating: { rate: 4.5, count: 12 },
  sizes: ['M', 'L'],
  colors: [{ name: 'Olive', hex: '#556B2F' }],
  inStock: true,
};

describe('ProductCard', () => {
  it('renders the title and a formatted price', () => {
    renderWithProviders(
      <ProductCard
        product={product}
        onQuickView={vi.fn()}
        onAddToCartDirect={vi.fn()}
        onWishlistNotify={vi.fn()}
      />,
    );

    expect(screen.getByText('Quilted Field Jacket')).toBeInTheDocument();
    expect(screen.getByText(/248/)).toBeInTheDocument();
  });

  it('calls onAddToCartDirect with the product when the bag button is used', async () => {
    const onAddToCartDirect = vi.fn();
    renderWithProviders(
      <ProductCard
        product={product}
        onQuickView={vi.fn()}
        onAddToCartDirect={onAddToCartDirect}
        onWishlistNotify={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /bag/i }));

    expect(onAddToCartDirect).toHaveBeenCalledWith(product);
  });

  it('reports the title and added state when wishlisted', async () => {
    const onWishlistNotify = vi.fn();
    renderWithProviders(
      <ProductCard
        product={product}
        onQuickView={vi.fn()}
        onAddToCartDirect={vi.fn()}
        onWishlistNotify={onWishlistNotify}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /wishlist|favorite|heart/i }));

    expect(onWishlistNotify).toHaveBeenCalledWith('Quilted Field Jacket', true);
  });
});
