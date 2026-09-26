import React from 'react';
import { Star, Heart, Eye, ShoppingBag } from 'lucide-react';
import { Product } from '../types/product';
import { useWishlist } from '../context/WishlistContext';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  onAddToCartDirect: (product: Product) => void;
  onWishlistNotify: (title: string, added: boolean) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onAddToCartDirect,
  onWishlistNotify,
}) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isFavorited = isInWishlist(product.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = toggleWishlist(product);
    onWishlistNotify(product.title, added);
  };

  const formatCategory = (cat: string) => {
    if (cat === "men's clothing") return "Men";
    if (cat === "women's clothing") return "Women";
    if (cat === "jewelery") return "Accessories";
    return cat;
  };

  const getCategoryFallback = (cat: string) => {
    if (cat === "women's clothing") {
      return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';
    }
    if (cat === 'jewelery') {
      return 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80';
    }
    return 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80';
  };

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-stone-200/80 hover:border-stone-400/80 transition-all duration-300 hover:shadow-xl flex flex-col">
      {/* Product Image Area */}
      <div
        className="relative aspect-[3/4] bg-stone-100 overflow-hidden cursor-pointer"
        onClick={() => onQuickView(product)}
      >
        <img
          src={product.image}
          alt={product.title}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.hasFailed) {
              target.dataset.hasFailed = 'true';
              target.src = getCategoryFallback(product.category);
            }
          }}
          className="w-full h-full object-contain p-6 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          {product.onSale && (
            <span className="bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase shadow-xs">
              Sale {product.discountPercent ? `-${product.discountPercent}%` : ''}
            </span>
          )}
          {product.isNewArrival && (
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
              New
            </span>
          )}
          {product.featured && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase border border-amber-200">
              Popular
            </span>
          )}
        </div>

        {/* Wishlist Heart Button */}
        <button
          onClick={handleWishlistClick}
          aria-label={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ${
            isFavorited
              ? 'bg-rose-50 text-rose-500 shadow-md'
              : 'bg-white/90 text-stone-600 hover:text-black hover:bg-white shadow-sm'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500' : ''}`} />
        </button>

        {/* Hover Quick View Overlay Bar */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="flex-1 py-2.5 px-3 bg-white/95 backdrop-blur text-slate-900 text-xs font-semibold rounded-xl hover:bg-white transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            Quick View
          </button>
        </div>
      </div>

      {/* Content Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
          <span className="uppercase font-semibold tracking-wider">
            {formatCategory(product.category)}
          </span>
          <div className="flex items-center gap-1 text-amber-600 font-medium">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{product.rating.rate}</span>
            <span className="text-stone-400">({product.rating.count})</span>
          </div>
        </div>

        <h3
          onClick={() => onQuickView(product)}
          className="text-sm font-semibold text-slate-900 line-clamp-2 hover:text-stone-600 cursor-pointer transition-colors mb-2 leading-snug"
          title={product.title}
        >
          {product.title}
        </h3>

        {/* Price & Add to Cart Button */}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-stone-100">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${product.onSale ? 'text-rose-700' : 'text-slate-900'} tracking-tight`}>
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-stone-400 line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          <button
            onClick={() => onAddToCartDirect(product)}
            className="p-2 bg-stone-100 text-slate-900 rounded-xl hover:bg-slate-900 hover:text-white transition-all flex items-center gap-1 text-xs font-semibold"
            aria-label="Add to cart"
            title="Quick Add to Bag"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
