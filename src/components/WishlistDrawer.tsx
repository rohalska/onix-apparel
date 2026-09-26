import React from 'react';
import { X, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Product } from '../types/product';

interface WishlistDrawerProps {
  onQuickView: (product: Product) => void;
  onAddedToCartNotify: (product: Product, size: string) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  onQuickView,
  onAddedToCartNotify,
}) => {
  const { wishlist, isWishlistOpen, closeWishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (!isWishlistOpen) return null;

  const handleMoveToCart = (product: Product) => {
    const defaultSize = product.sizes?.[0] || 'M';
    const defaultColor = product.colors?.[0]?.name || 'Standard';
    addToCart(product, defaultSize, defaultColor, 1);
    removeFromWishlist(product.id);
    onAddedToCartNotify(product, defaultSize);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={closeWishlist}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
          {/* Header */}
          <div className="p-6 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              <h2 className="text-lg font-serif font-bold text-slate-900">
                Your Saved Items ({wishlist.length})
              </h2>
            </div>
            <button
              onClick={closeWishlist}
              className="p-2 text-stone-400 hover:text-black rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {wishlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-300 mb-4">
                  <Heart className="w-8 h-8" />
                </div>
                <h3 className="text-base font-serif font-bold text-slate-800 mb-1">
                  No saved styles yet
                </h3>
                <p className="text-xs text-stone-500 max-w-xs mb-6">
                  Save pieces you love by tapping the heart icon on any product.
                </p>
                <button
                  onClick={closeWishlist}
                  className="px-6 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-full hover:bg-slate-800 transition-all"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              wishlist.map((product) => (
                <div
                  key={product.id}
                  className="flex gap-4 p-3 bg-stone-50 rounded-2xl border border-stone-200/80 hover:border-stone-300 transition-all"
                >
                  <div
                    className="w-20 h-24 bg-white rounded-xl p-2 shrink-0 border border-stone-200 overflow-hidden flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      closeWishlist();
                      onQuickView(product);
                    }}
                  >
                    <img
                      src={product.image}
                      alt={product.title}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.hasFailed) {
                          target.dataset.hasFailed = 'true';
                          if (product.category === "women's clothing") {
                            target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';
                          } else if (product.category === 'jewelery') {
                            target.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80';
                          } else {
                            target.src = 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80';
                          }
                        }
                      }}
                      className="max-h-full max-w-full object-contain mix-blend-multiply"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => {
                            closeWishlist();
                            onQuickView(product);
                          }}
                          className="text-xs font-semibold text-slate-900 line-clamp-1 cursor-pointer hover:underline"
                        >
                          {product.title}
                        </h4>
                        <button
                          onClick={() => removeFromWishlist(product.id)}
                          className="text-stone-400 hover:text-rose-600 transition-colors p-0.5"
                          title="Remove from wishlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs font-bold text-slate-900 mt-1">
                        ${product.price.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleMoveToCart(product)}
                        className="flex-1 py-1.5 px-3 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Move to Bag
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
