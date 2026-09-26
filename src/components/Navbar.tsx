import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Heart, Search, Menu, X, Sparkles, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Category, Product } from '../types/product';

interface NavbarProps {
  currentCategory: Category;
  onSelectCategory: (cat: Category) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit?: () => void;
  searchResults?: Product[];
  onSelectProduct?: (product: Product) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchResults,
  onSelectProduct,
}) => {
  const { totalItems, openCart } = useCart();
  const { wishlist, openWishlist } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsDropdownOpen(false);
    setIsSearchOpen(false);
    if (onSearchSubmit) {
      onSearchSubmit();
    }
  };

  const matchingPreview =
    searchResults && searchQuery.trim() ? searchResults.slice(0, 4) : [];

  const categories: { label: string; value: Category }[] = [
    { label: 'All Collections', value: 'all' },
    { label: "Women's", value: "women's clothing" },
    { label: "Men's", value: "men's clothing" },
    { label: 'Jewelry & Acc', value: 'jewelery' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 transition-all">
      {/* Promo Announcement Banner */}
      <div className="bg-slate-900 text-stone-200 text-xs py-2 px-4 text-center font-medium tracking-wider flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>
          SUMMER CAPSULE: USE CODE <span className="font-bold text-amber-300">SAVE20</span> FOR 20% OFF • COMPLIMENTARY SHIPPING OVER $75
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobile menu trigger */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -ml-2 text-stone-700 hover:text-black rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectCategory('all')}>
            <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              ONIX
            </span>
            <span className="text-[10px] tracking-widest font-semibold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 hidden sm:inline-block">
              Apparel
            </span>
          </div>

          {/* Desktop Nav Categories */}
          <nav className="hidden lg:flex items-center space-x-8">
            {categories.map((cat) => {
              const active = currentCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => onSelectCategory(cat.value)}
                  className={`text-sm font-medium tracking-wide uppercase transition-colors relative py-1 ${
                    active ? 'text-black font-semibold' : 'text-stone-500 hover:text-black'
                  }`}
                >
                  {cat.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-full animate-fade-in" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action Icons */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search Input for Desktop with Dropdown */}
            <div ref={searchContainerRef} className="relative hidden sm:block">
              <form onSubmit={handleFormSubmit}>
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    if (searchQuery.trim()) setIsDropdownOpen(true);
                  }}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setIsDropdownOpen(Boolean(e.target.value.trim()));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsDropdownOpen(false);
                  }}
                  placeholder="Search jackets, shirts, jewelry..."
                  className="w-52 md:w-72 lg:w-80 pl-9 pr-8 py-2 text-xs bg-stone-100/90 hover:bg-stone-100 border border-stone-200 focus:border-slate-900 focus:bg-white rounded-full transition-all outline-none text-slate-900 placeholder:text-stone-400"
                />
                <button
                  type="submit"
                  className="w-4 h-4 text-stone-400 hover:text-slate-900 absolute left-3 top-2.5 flex items-center justify-center transition-colors"
                  aria-label="Submit search"
                >
                  <Search className="w-4 h-4" />
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange('');
                      setIsDropdownOpen(false);
                    }}
                    className="absolute right-2.5 top-2 w-4 h-4 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 hover:text-stone-900 flex items-center justify-center text-[10px] font-bold transition-colors"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </form>

              {/* Instant Search Suggestions Dropdown */}
              {isDropdownOpen && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 animate-fade-in min-w-[320px] max-w-sm">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex items-center justify-between border-b border-stone-100">
                    <span>Products ({searchResults?.length || 0})</span>
                    <span className="text-stone-400 lowercase font-normal">press enter to view all</span>
                  </div>

                  {matchingPreview.length === 0 ? (
                    <div className="px-4 py-5 text-center text-xs text-stone-500">
                      No matching pieces found for <span className="font-semibold text-slate-900">"{searchQuery}"</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {matchingPreview.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (onSelectProduct) onSelectProduct(item);
                            setIsDropdownOpen(false);
                          }}
                          className="px-3 py-2.5 flex items-center gap-3 hover:bg-stone-50 cursor-pointer transition-colors"
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-10 h-10 object-cover rounded-lg bg-stone-100 shrink-0 border border-stone-200"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-bold text-slate-900">${item.price.toFixed(2)}</span>
                              <span>•</span>
                              <span className="capitalize">{item.category}</span>
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        </div>
                      ))}

                      {searchResults && searchResults.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleFormSubmit()}
                          className="w-full text-left px-3 py-2.5 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-slate-900 flex items-center justify-between transition-colors"
                        >
                          <span>View all {searchResults.length} matching pieces in catalog</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile search toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-stone-700 hover:text-black sm:hidden"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Button */}
            <button
              onClick={openWishlist}
              className="relative p-2 text-stone-700 hover:text-black transition-colors rounded-full hover:bg-stone-100"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-fade-in">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={openCart}
              className="relative p-2.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="text-xs font-bold px-1 min-w-[16px] text-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search expandable */}
        {isSearchOpen && (
          <div className="pb-3 px-1 sm:hidden animate-fade-in">
            <form onSubmit={handleFormSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search jackets, shirts, jewelry..."
                className="w-full pl-9 pr-8 py-2.5 text-sm bg-stone-100 border border-stone-300 focus:border-slate-900 rounded-xl outline-none text-slate-900"
                autoFocus
              />
              <button
                type="submit"
                className="w-4 h-4 text-stone-400 absolute left-3 top-3.5 flex items-center justify-center"
                aria-label="Submit mobile search"
              >
                <Search className="w-4 h-4" />
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </form>

            {/* Mobile preview list if searching */}
            {searchQuery.trim() && matchingPreview.length > 0 && (
              <div className="mt-2 bg-white rounded-xl border border-stone-200 shadow-md divide-y divide-stone-100 overflow-hidden">
                {matchingPreview.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (onSelectProduct) onSelectProduct(item);
                      setIsSearchOpen(false);
                    }}
                    className="p-2.5 flex items-center gap-2.5 text-xs hover:bg-stone-50 cursor-pointer"
                  >
                    <img src={item.image} alt={item.title} className="w-9 h-9 object-cover rounded bg-stone-100 shrink-0 border border-stone-200" />
                    <span className="truncate font-medium text-slate-900 flex-1">{item.title}</span>
                    <span className="font-bold text-slate-900 shrink-0">${item.price.toFixed(2)}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleFormSubmit()}
                  className="w-full p-2.5 bg-stone-50 text-xs font-semibold text-slate-900 text-center flex items-center justify-center gap-1.5 hover:bg-stone-100"
                >
                  <span>View all {searchResults?.length || 0} results in catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-200 py-3 space-y-1 animate-fade-in">
            {categories.map((cat) => {
              const active = currentCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => {
                    onSelectCategory(cat.value);
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm font-medium rounded-md ${
                    active ? 'bg-stone-200/60 font-semibold text-black' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
