import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, RefreshCw, Truck } from 'lucide-react';
import { Category, Product } from '../types/product';

interface HeroBannerProps {
  onSelectCategory: (cat: Category) => void;
  featuredProduct?: Product;
  onQuickView?: (product: Product) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onSelectCategory,
  featuredProduct,
  onQuickView,
}) => {
  const displayImage =
    featuredProduct?.image ||
    'https://m.media-amazon.com/images/I/71li-ujtlUL._AC_UX679.jpg';
  const displayPrice = featuredProduct?.price ? `$${featuredProduct.price.toFixed(2)}` : '$55.99';
  const displayTitle = featuredProduct?.title || "Mens Cotton Jacket";
  return (
    <div className="relative overflow-hidden bg-[#f4ece3] border-b border-stone-200">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#ebdcd0] via-[#f7f2ed] to-[#ede3d8] opacity-70 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-stone-300 text-slate-800 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              New Season 2026 Ready-to-Wear
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]">
              Effortless Elegance. <br />
              <span className="italic font-normal text-slate-700">Tailored for Every Day.</span>
            </h1>

            <p className="text-base sm:text-lg text-stone-600 max-w-xl leading-relaxed">
              Discover timeless silhouettes and meticulously crafted wardrobe staples. Sourced with premium sustainable fabrics designed to endure beyond transient seasons.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onSelectCategory("women's clothing")}
                className="px-6 py-3.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm hover:translate-y-[-1px]"
              >
                Shop Women's
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelectCategory("men's clothing")}
                className="px-6 py-3.5 bg-white text-slate-900 text-sm font-semibold rounded-full hover:bg-stone-100 transition-all border border-stone-300 shadow-sm hover:translate-y-[-1px]"
              >
                Shop Men's
              </button>
            </div>
          </div>

          {/* Right Visual Collage */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white p-3 border border-stone-200">
                <div
                  className={`aspect-[4/5] overflow-hidden rounded-xl bg-stone-100 relative group ${
                    featuredProduct && onQuickView ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => featuredProduct && onQuickView && onQuickView(featuredProduct)}
                >
                  <img
                    src={displayImage}
                    alt={displayTitle}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.hasFailed) {
                        target.dataset.hasFailed = 'true';
                        target.src =
                          'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80';
                      }
                    }}
                    className="w-full h-full object-contain p-6 transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Editor's Pick
                  </div>
                  <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md border border-stone-200">
                    From {displayPrice}
                  </div>
                </div>
              </div>

              {/* Overlapping Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-stone-200 hidden sm:flex items-center gap-3 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  ★
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">4.8 / 5 Rating</p>
                  <p className="text-[11px] text-stone-500">Over 3,500+ happy buyers</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Badges Bar */}
        <div className="mt-14 pt-8 border-t border-stone-300/70 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-stone-700">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-stone-800 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Free Express Shipping</p>
              <p className="text-[11px] text-stone-500">On all orders over $75</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-stone-800 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">30-Day Easy Returns</p>
              <p className="text-[11px] text-stone-500">Hassle-free exchanges</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-stone-800 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Sustainably Sourced</p>
              <p className="text-[11px] text-stone-500">100% certified fabrics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-stone-800 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Authentic Quality</p>
              <p className="text-[11px] text-stone-500">Guaranteed craftsmanship</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
