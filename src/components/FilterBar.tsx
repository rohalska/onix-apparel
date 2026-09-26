import React from 'react';
import { SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { Category, SortOption } from '../types/product';

interface FilterBarProps {
  currentCategory: Category;
  onSelectCategory: (cat: Category) => void;
  maxPrice: number;
  onMaxPriceChange: (val: number) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalCount: number;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentCategory,
  onSelectCategory,
  maxPrice,
  onMaxPriceChange,
  sortBy,
  onSortChange,
  totalCount,
  onResetFilters,
  hasActiveFilters,
}) => {
  const categories: { label: string; value: Category }[] = [
    { label: 'All Items', value: 'all' },
    { label: "Women's Collection", value: "women's clothing" },
    { label: "Men's Collection", value: "men's clothing" },
    { label: 'Fine Jewelry', value: 'jewelery' },
  ];

  return (
    <div className="bg-white border-b border-stone-200 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const active = currentCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => onSelectCategory(cat.value)}
                className={`px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Right side controls: Price slider, Sort, Reset */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Price Range Slider */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs font-medium text-stone-600">Max Price:</span>
            <span className="text-xs font-bold text-slate-900 min-w-[45px]">
              ${maxPrice === 700 ? 'Any' : `$${maxPrice}`}
            </span>
            <input
              type="range"
              min="10"
              max="700"
              step="10"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(Number(e.target.value))}
              className="w-24 sm:w-28 accent-slate-900 cursor-pointer"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="text-xs font-medium bg-stone-100 border border-stone-200 rounded-lg px-3 py-1.5 text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              <option value="featured">Featured / Popular</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">New Arrivals</option>
            </select>
          </div>

          {/* Reset Filters & Count */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" />
              Reset
            </button>
          )}

          <div className="text-xs text-stone-400 font-medium ml-auto md:ml-0">
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </div>
        </div>
      </div>
    </div>
  );
};
