import React, { useState, useEffect } from 'react';
import { X, Star, Heart, ShoppingBag, Truck, RefreshCw, ShieldCheck } from 'lucide-react';
import { Product } from '../types/product';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { trackVertexUserEvent } from '../services/vertexSearch';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddedToCartNotify: (product: Product, size: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddedToCartNotify,
}) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (product) {
      setSelectedSize(product.sizes?.[0] || 'M');
      setSelectedColor(product.colors?.[0]?.name || 'Standard');
      setQuantity(1);

      // Log detail-page-view event in Vertex AI Commerce Search
      trackVertexUserEvent('detail-page-view', product);
    }
  }, [product]);

  if (!product) return null;

  const isFavorited = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, selectedSize, selectedColor, quantity);
    trackVertexUserEvent('add-to-cart', product, {
      quantity,
      size: selectedSize,
      color: selectedColor,
    });
    onAddedToCartNotify(product, selectedSize);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 z-10 animate-fade-in my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-stone-500 hover:text-black hover:bg-stone-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Product Image */}
          <div className="relative bg-stone-100 p-8 flex items-center justify-center aspect-square md:aspect-auto">
            <img
              src={product.image}
              alt={product.title}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.dataset.hasFailed) {
                  target.dataset.hasFailed = 'true';
                  if (product.category === "women's clothing") {
                    target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80';
                  } else if (product.category === 'jewelery') {
                    target.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80';
                  } else {
                    target.src = 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80';
                  }
                }
              }}
              className="max-h-[380px] w-auto object-contain mix-blend-multiply drop-shadow-lg transition-transform hover:scale-105 duration-300"
            />
            <div className="absolute bottom-4 left-4 flex gap-2">
              <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-stone-700 capitalize">
                {product.category}
              </span>
            </div>
          </div>

          {/* Right: Product Details & Controls */}
          <div className="p-6 sm:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
            <div>
              {/* Rating and Reviews */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(product.rating.rate)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {product.rating.rate}
                </span>
                <span className="text-xs text-stone-400">
                  ({product.rating.count} verified reviews)
                </span>
              </div>

              {/* Title & Price */}
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 leading-snug mb-3">
                {product.title}
              </h2>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={`text-2xl font-bold ${product.onSale ? 'text-rose-700' : 'text-slate-900'}`}>
                  ${product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span className="text-base text-stone-400 line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
                {product.discountPercent && (
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Save {product.discountPercent}%
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-stone-600 leading-relaxed mb-6">
                {product.description}
              </p>

              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Select Size: <span className="text-stone-500">{selectedSize}</span>
                    </label>
                    <a
                      href="#sizing"
                      onClick={() => {
                        onClose();
                      }}
                      className="text-xs text-stone-500 underline cursor-pointer hover:text-black"
                    >
                      Size Guide
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[48px] py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                          selectedSize === size
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                    Color: <span className="text-stone-500">{selectedColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {product.colors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedColor(c.name)}
                        className={`w-7 h-7 rounded-full p-0.5 transition-all ${
                          selectedColor === c.name
                            ? 'ring-2 ring-slate-900 ring-offset-2'
                            : 'hover:scale-110'
                        }`}
                        title={c.name}
                      >
                        <span
                          className="block w-full h-full rounded-full border border-stone-300"
                          style={{ backgroundColor: c.hex }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Picker */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Quantity:
                </span>
                <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-1 text-stone-600 hover:text-black font-semibold"
                  >
                    -
                  </button>
                  <span className="px-3 text-sm font-bold text-slate-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-3 py-1 text-stone-600 hover:text-black font-semibold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Actions: Add to Cart and Favorite */}
            <div>
              <div className="flex items-center gap-3 pt-4 border-t border-stone-200">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 px-6 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Add to Cart • ${(product.price * quantity).toFixed(2)}
                </button>
                <button
                  onClick={() => toggleWishlist(product)}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isFavorited
                      ? 'border-rose-200 bg-rose-50 text-rose-500'
                      : 'border-stone-200 text-stone-600 hover:text-black hover:border-stone-400'
                  }`}
                  aria-label="Wishlist"
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-rose-500' : ''}`} />
                </button>
              </div>

              {/* Guarantees */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center pt-2">
                <div className="flex flex-col items-center gap-1 text-[11px] text-stone-500">
                  <Truck className="w-4 h-4 text-stone-700" />
                  <span>Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-[11px] text-stone-500">
                  <RefreshCw className="w-4 h-4 text-stone-700" />
                  <span>30-Day Returns</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-[11px] text-stone-500">
                  <ShieldCheck className="w-4 h-4 text-stone-700" />
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
