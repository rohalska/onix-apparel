import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { FilterBar } from './components/FilterBar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { Footer } from './components/Footer';
import { Toast, ToastMessage } from './components/Toast';
import { fetchProducts } from './services/api';
import {
  searchVertexProducts,
  trackVertexUserEvent,
  getVertexHealth,
  FacetGroup,
  VertexHealthResponse,
} from './services/vertexSearch';
import { Product, Category, SortOption } from './types/product';
import { useCart } from './context/CartContext';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { FALLBACK_PRODUCTS } from './data/fallbackProducts';
import { correctQuery } from './utils/fuzzySearch';
import { CustomerCarePage, CustomerCareSection } from './components/CustomerCare/CustomerCarePage';
import { ConciergeChatModal } from './components/ConciergeChatModal';
import { subscribeToAgentActions } from './services/agentActionBus';

export type SpecialCollection = 'all' | 'new' | 'sale';

export const AppContent: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<Category>('all');
  const [specialCollection, setSpecialCollection] = useState<SpecialCollection>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(700);
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Vertex AI Commerce Search State
  const [vertexHealth, setVertexHealth] = useState<VertexHealthResponse | null>(null);
  const [vertexResults, setVertexResults] = useState<Product[] | null>(null);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [searchSource, setSearchSource] = useState<string>('local-fallback');
  const [facets, setFacets] = useState<FacetGroup[]>([]);
  const [selectedFacetSize, setSelectedFacetSize] = useState<string | null>(null);
  const [selectedFacetColor, setSelectedFacetColor] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [customerCareRoute, setCustomerCareRoute] = useState<CustomerCareSection | null>(() => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.replace('#', '');
    if (['shipping', 'returns', 'sizing', 'order-lookup', 'contact'].includes(hash)) {
      return hash as CustomerCareSection;
    }
    return null;
  });

  const { addToCart } = useCart();

  const handleSelectCollection = (collectionKey: 'women' | 'men' | 'accessories' | 'new' | 'sale') => {
    setCustomerCareRoute(null);
    setSearchQuery('');
    setSelectedProduct(null);

    if (collectionKey === 'women') {
      setCategory("women's clothing");
      setSpecialCollection('all');
      setMaxPrice(700);
    } else if (collectionKey === 'men') {
      setCategory("men's clothing");
      setSpecialCollection('all');
      setMaxPrice(700);
    } else if (collectionKey === 'accessories') {
      setCategory('jewelery');
      setSpecialCollection('all');
      setMaxPrice(700);
    } else if (collectionKey === 'new') {
      setCategory('all');
      setSpecialCollection('new');
      setSortBy('newest');
      setMaxPrice(700);
    } else if (collectionKey === 'sale') {
      setCategory('all');
      setSpecialCollection('sale');
      setMaxPrice(700);
    }

    if (typeof window !== 'undefined') {
      if (window.location.hash !== `#${collectionKey}`) {
        window.location.hash = collectionKey;
      }
      setTimeout(() => {
        const catalogEl = document.getElementById('catalog');
        if (catalogEl) {
          catalogEl.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    }
  };

  // Listen to hash changes for Customer Care navigation and footer collection links
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace('#', '');
      if (['shipping', 'returns', 'sizing', 'order-lookup', 'contact', 'privacy'].includes(rawHash)) {
        setCustomerCareRoute(rawHash as CustomerCareSection);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (['women', 'men', 'accessories', 'new', 'sale'].includes(rawHash)) {
        handleSelectCollection(rawHash as 'women' | 'men' | 'accessories' | 'new' | 'sale');
      } else if (rawHash === '' || rawHash === 'catalog' || rawHash === 'shop') {
        setCustomerCareRoute(null);
      }
    };

    // Run on mount to honor deep-linked URLs like #women, #sale, etc.
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Check Vertex AI proxy health and active mode
  useEffect(() => {
    getVertexHealth().then((health) => {
      if (health) setVertexHealth(health);
    });
  }, []);

  // Query Vertex AI Commerce Search in background to enrich facets / live GCP data
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await searchVertexProducts(
          {
            query: searchQuery,
            category,
            maxPrice,
            size: selectedFacetSize || undefined,
            color: selectedFacetColor || undefined,
            sortBy,
          },
          products.length > 0 ? products : undefined
        );

        if (res) {
          if (res.products && res.products.length > 0) {
            setVertexResults(res.products);
          }
          if (res.correctedQuery) {
            setCorrectedQuery(res.correctedQuery);
          } else {
            setCorrectedQuery(null);
          }
          if (res.source) {
            setSearchSource(res.source);
          }
          if (res.facets && res.facets.length > 0) {
            setFacets(res.facets);
          }
        }
      } catch (err) {
        console.warn('Vertex search sync error:', err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, category, maxPrice, sortBy, selectedFacetSize, selectedFacetColor, products]);

  // Load products from Fake Store API (with local fallback)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchProducts(category)
      .then((data) => {
        if (isMounted) {
          setProducts(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [category]);

  // Toast notification helper
  const addToast = (type: 'cart' | 'wishlist' | 'info', title: string, subtitle?: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, title, subtitle }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Quick direct add to bag
  const handleAddToCartDirect = (product: Product) => {
    const size = product.sizes?.[0] || 'M';
    const color = product.colors?.[0]?.name || 'Standard';
    addToCart(product, size, color, 1);
    trackVertexUserEvent('add-to-cart', product, { quantity: 1, size, color });
    addToast('cart', 'Added to Shopping Bag', `${product.title} (Size: ${size})`);
  };

  const handleWishlistNotify = (title: string, added: boolean) => {
    addToast(
      'wishlist',
      added ? 'Saved to Wishlist' : 'Removed from Wishlist',
      title
    );
  };

  const handleAddedToCartNotify = (product: Product, size: string) => {
    addToast('cart', 'Added to Shopping Bag', `${product.title} (Size: ${size})`);
  };

  // Instant, synchronous 0ms search & filter logic
  const filteredProducts = useMemo(() => {
    const cleanQ = searchQuery.trim().toLowerCase();
    const { tokens } = correctQuery(cleanQ);

    return products
      .filter((p) => {
        // Search query filter (matches title, description, category, color, size)
        if (tokens.length > 0) {
          const titleLower = (p.title || '').toLowerCase();
          const descLower = (p.description || '').toLowerCase();
          const catLower = (p.category || '').toLowerCase();
          const colorsLower = (p.colors || []).map((c) => c.name.toLowerCase()).join(' ');
          const sizesLower = (p.sizes || []).join(' ').toLowerCase();

          const matches = tokens.some(
            (token) =>
              titleLower.includes(token) ||
              descLower.includes(token) ||
              catLower.includes(token) ||
              colorsLower.includes(token) ||
              sizesLower.includes(token)
          );
          if (!matches) return false;
        } else {
          // When no search query is typed, filter by category
          if (category !== 'all' && p.category.toLowerCase() !== category.toLowerCase()) {
            return false;
          }

          // Special Collection filters
          if (specialCollection === 'new' && !p.isNewArrival) {
            return false;
          }
          if (specialCollection === 'sale' && !p.onSale && p.price > 50) {
            return false;
          }
        }

        // Price filter
        if (p.price > maxPrice) return false;

        // Size facet filter
        if (selectedFacetSize && !p.sizes?.includes(selectedFacetSize)) {
          return false;
        }

        // Color facet filter
        if (
          selectedFacetColor &&
          !p.colors?.some((c) => c.name.toLowerCase() === selectedFacetColor.toLowerCase())
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return b.rating.rate - a.rating.rate;
        if (sortBy === 'newest') return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [products, searchQuery, category, specialCollection, maxPrice, sortBy, selectedFacetSize, selectedFacetColor]);

  // Detected autocorrection for the UI notice
  const detectedCorrection = useMemo(() => {
    if (correctedQuery) return correctedQuery;
    const { correctedQuery: autoCorrect } = correctQuery(searchQuery);
    return autoCorrect;
  }, [correctedQuery, searchQuery]);

  // Dynamic Facets computed in real time from matching items
  const computedFacets = useMemo<FacetGroup[]>(() => {
    if (facets.length > 0 && vertexHealth?.mode === 'live') {
      return facets;
    }
    const sizeMap: Record<string, number> = {};
    const colorMap: Record<string, number> = {};

    filteredProducts.forEach((p) => {
      p.sizes?.forEach((s) => {
        sizeMap[s] = (sizeMap[s] || 0) + 1;
      });
      p.colors?.forEach((c) => {
        colorMap[c.name] = (colorMap[c.name] || 0) + 1;
      });
    });

    return [
      {
        key: 'sizes',
        values: Object.entries(sizeMap)
          .sort((a, b) => b[1] - a[1])
          .map(([value, count]) => ({ value, count })),
      },
      {
        key: 'colors',
        values: Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .map(([value, count]) => ({ value, count })),
      },
    ];
  }, [facets, vertexHealth, filteredProducts]);

  // If Live GCP returned server results, use them; otherwise use instant filtered list
  const displayedProducts =
    vertexHealth?.mode === 'live' && vertexResults !== null && vertexResults.length > 0
      ? vertexResults
      : filteredProducts;

  const hasActiveFilters =
    searchQuery !== '' ||
    category !== 'all' ||
    specialCollection !== 'all' ||
    maxPrice < 700 ||
    sortBy !== 'featured' ||
    selectedFacetSize !== null ||
    selectedFacetColor !== null;

  const handleSelectCategory = (cat: Category) => {
    setCategory(cat);
    setSpecialCollection('all');
    setCustomerCareRoute(null);
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (specialCollection !== 'all') {
      setSpecialCollection('all');
    }
    if (customerCareRoute) {
      setCustomerCareRoute(null);
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.pushState(null, '', window.location.pathname);
      }
    }
    if (query.trim() && category !== 'all') {
      // Auto-switch to 'all' so search is global across all collections
      setCategory('all');
    }
  };

  const handleSearchSubmit = () => {
    const catalogEl = document.getElementById('catalog');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('all');
    setSpecialCollection('all');
    setMaxPrice(700);
    setSortBy('featured');
    setSelectedFacetSize(null);
    setSelectedFacetColor(null);
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  // Listen to Client Action Bus events dispatched by Gemini Concierge or external agents
  useEffect(() => {
    return subscribeToAgentActions((action) => {
      if (action.action === 'ADD_TO_CART') {
        const prod =
          action.product ||
          products.find((p) => p.id === action.productId) ||
          (action.productTitle
            ? products.find((p) => p.title.toLowerCase().includes(action.productTitle!.toLowerCase()))
            : undefined);

        if (prod) {
          const size = action.size || prod.sizes?.[0] || 'M';
          const color = action.color || prod.colors?.[0]?.name || 'Standard';
          const qty = action.quantity || 1;
          addToCart(prod, size, color, qty);
          addToast('cart', 'Added to Shopping Bag by Concierge', `${prod.title} (${size}, ${color})`);
        }
      } else if (action.action === 'OPEN_PRODUCT') {
        const prod =
          action.product ||
          products.find((p) => p.id === action.productId) ||
          (action.productTitle
            ? products.find((p) => p.title.toLowerCase().includes(action.productTitle!.toLowerCase()))
            : undefined);

        if (prod) {
          setSelectedProduct(prod);
        }
      } else if (action.action === 'NAVIGATE_COLLECTION' && action.collection) {
        handleSelectCollection(action.collection);
      } else if (action.action === 'SEARCH' && action.query !== undefined) {
        handleSearchChange(action.query);
        handleSearchSubmit();
      } else if (action.action === 'CLEAR_FILTERS') {
        handleResetFilters();
      }
    });
  }, [products, addToCart]);

  const featuredProduct = useMemo(() => {
    return products.find((p) => p.featured) || products[0];
  }, [products]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-800">
      {/* Navbar with live autocomplete preview and keyboard submit */}
      <Navbar
        currentCategory={category}
        onSelectCategory={handleSelectCategory}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        searchResults={filteredProducts}
        onSelectProduct={setSelectedProduct}
      />

      {customerCareRoute ? (
        <CustomerCarePage
          currentSection={customerCareRoute}
          onNavigate={(sec) => {
            window.location.hash = sec;
            setCustomerCareRoute(sec);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBackToShop={() => {
            if (typeof window !== 'undefined' && window.location.hash) {
              window.history.pushState(null, '', window.location.pathname);
            }
            setCustomerCareRoute(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : (
        <>
          {/* Hero Banner (Shown when not actively searching) */}
          {!searchQuery.trim() && (
            <HeroBanner
              onSelectCategory={handleSelectCategory}
              featuredProduct={featuredProduct}
              onQuickView={setSelectedProduct}
            />
          )}

          {/* Filter and Control Bar */}
          <FilterBar
            currentCategory={category}
            onSelectCategory={handleSelectCategory}
            maxPrice={maxPrice}
            onMaxPriceChange={setMaxPrice}
            sortBy={sortBy}
            onSortChange={setSortBy}
            totalCount={displayedProducts.length}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Main Catalog Section */}
          <main id="catalog" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-bold text-slate-900 tracking-tight capitalize">
              {searchQuery.trim()
                ? `Search Results for "${searchQuery}"`
                : specialCollection === 'new'
                ? 'Seasonal New Arrivals'
                : specialCollection === 'sale'
                ? 'End of Season Sale — Exclusive Markdowns'
                : category === 'all'
                ? 'Curated Wardrobe Collection'
                : category === "men's clothing"
                ? "Men's Apparel & Outerwear"
                : category === "women's clothing"
                ? "Women's Collection & Tops"
                : 'Fine Jewelry & Accessories'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {searchQuery.trim()
                ? `Found ${displayedProducts.length} matching piece${displayedProducts.length === 1 ? '' : 's'} across all departments.`
                : specialCollection === 'new'
                ? `Showing ${displayedProducts.length} new seasonal arrivals fresh off the runway.`
                : specialCollection === 'sale'
                ? `Limited-time archive pricing and seasonal reductions. Up to 50% off select styles.`
                : 'Refined tailoring, premium sustainable staples, and effortless styling.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Vertex AI Mode Indicator */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                vertexHealth?.mode === 'live'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-stone-100 text-stone-700 border-stone-200'
              }`}
              title={
                vertexHealth?.mode === 'live'
                  ? `Connected to Google Cloud project: ${vertexHealth.gcpProjectId}`
                  : `Running in local Vertex AI mode (${searchSource})`
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  vertexHealth?.mode === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
                }`}
              />
              Vertex AI Commerce Search ({vertexHealth?.mode === 'live' ? 'Live GCP' : 'Simulation'})
            </span>

            {displayedProducts.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-200/60 text-stone-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                In Stock & Ready to Ship
              </span>
            )}
          </div>
        </div>

        {/* Autocorrect / Query Expansion Notice */}
        {detectedCorrection && (
          <div className="mb-5 px-4 py-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-sm animate-fade-in">
            <div>
              <span>Showing results for </span>
              <strong className="underline decoration-amber-400 font-bold">{detectedCorrection}</strong>
              <span className="text-amber-700 ml-1.5">(autocorrected from "{searchQuery}")</span>
            </div>
            <button
              onClick={() => setSearchQuery(detectedCorrection)}
              className="px-2.5 py-1 bg-amber-200/70 hover:bg-amber-200 text-amber-900 rounded-lg font-semibold transition-colors"
            >
              Update Search
            </button>
          </div>
        )}

        {/* Dynamic Facet Chips (from Vertex AI) */}
        {computedFacets.length > 0 && (searchQuery.trim() || category !== 'all' || selectedFacetSize || selectedFacetColor) && (
          <div className="mb-6 flex flex-wrap items-center gap-2 p-3 bg-white border border-stone-200 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider mr-1">
              Refine by Facet:
            </span>
            {computedFacets
              .find((f) => f.key === 'sizes' || f.key === 'attributes.sizes')
              ?.values.slice(0, 5)
              .map((v) => (
                <button
                  key={v.value}
                  onClick={() => setSelectedFacetSize(selectedFacetSize === v.value ? null : v.value)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    selectedFacetSize === v.value
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  Size {v.value} ({v.count})
                </button>
              ))}
            {computedFacets
              .find((f) => f.key === 'colors' || f.key === 'attributes.colors')
              ?.values.slice(0, 4)
              .map((v) => (
                <button
                  key={v.value}
                  onClick={() => setSelectedFacetColor(selectedFacetColor === v.value ? null : v.value)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                    selectedFacetColor === v.value
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {v.value} ({v.count})
                </button>
              ))}
            {(selectedFacetSize || selectedFacetColor) && (
              <button
                onClick={() => {
                  setSelectedFacetSize(null);
                  setSelectedFacetColor(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 underline font-medium ml-2"
              >
                Clear Facets
              </button>
            )}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-stone-200 animate-pulse space-y-3"
              >
                <div className="aspect-[3/4] bg-stone-200 rounded-xl" />
                <div className="h-4 bg-stone-200 rounded w-3/4" />
                <div className="h-4 bg-stone-200 rounded w-1/2" />
                <div className="h-6 bg-stone-200 rounded w-1/4 mt-4" />
              </div>
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-serif font-bold text-slate-900 mb-1">
              No matching pieces found
            </h3>
            <p className="text-xs text-stone-500 mb-6">
              We couldn't find any products matching your current filters or search term.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-full hover:bg-slate-800 transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        ) : (
          /* Products Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={setSelectedProduct}
                onAddToCartDirect={handleAddToCartDirect}
                onWishlistNotify={handleWishlistNotify}
              />
            ))}
          </div>
        )}
      </main>
      </>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddedToCartNotify={handleAddedToCartNotify}
      />

      {/* Cart Slide-Over Drawer */}
      <CartDrawer onProceedToCheckout={() => setIsCheckoutOpen(true)} />

      {/* Wishlist Slide-Over Drawer */}
      <WishlistDrawer
        onQuickView={setSelectedProduct}
        onAddedToCartNotify={handleAddedToCartNotify}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />

      {/* Gemini Enterprise AI Concierge Assistant & Client Action Bus Shell */}
      <ConciergeChatModal />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      {/* Footer */}
      <Footer
        onSelectCollection={handleSelectCollection}
        onSelectCustomerCare={(section) => {
          setCustomerCareRoute(section);
          window.location.hash = section;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
};

export default AppContent;
