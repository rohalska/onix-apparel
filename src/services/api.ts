import { Product, Category } from '../types/product';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';

const API_BASE_URL = 'https://fakestoreapi.com';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const MEN_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const ACCESSORY_SIZES = ['One Size'];

const CLOTHING_COLORS = [
  { name: 'Onyx Black', hex: '#1c1917' },
  { name: 'Heather Grey', hex: '#64748b' },
  { name: 'Navy Blue', hex: '#1e3a5f' },
  { name: 'Warm Cream', hex: '#f5efe6' },
  { name: 'Forest Green', hex: '#2d4a3e' }
];

export function normalizeImageUrl(url: string): string {
  if (!url) return '';
  let cleanUrl = url;
  if (cleanUrl.includes('fakestoreapi.com/img/')) {
    const filename = cleanUrl.split('fakestoreapi.com/img/')[1];
    cleanUrl = `https://m.media-amazon.com/images/I/${filename}`;
  }

  // Normalize Amazon CDN format:
  cleanUrl = cleanUrl.replace('71z3kpMAYUL', '71z3kpMAYsL');
  cleanUrl = cleanUrl.replace('71HblAHs5xL._AC_UY879_-2.jpg', '71HblAHs5xL._AC_UY879_-2t.jpg');
  cleanUrl = cleanUrl.replace(/_t\.png$/i, '.jpg');
  cleanUrl = cleanUrl.replace(/_\.jpg$/i, '.jpg');
  if (cleanUrl.endsWith('.png')) {
    cleanUrl = cleanUrl.slice(0, -4) + '.jpg';
  }

  return cleanUrl;
}

function enhanceProduct(item: any): Product {
  const isClothing = item.category === "men's clothing" || item.category === "women's clothing";
  const isMen = item.category === "men's clothing";

  return {
    ...item,
    image: normalizeImageUrl(item.image),
    sizes: item.sizes || (isClothing ? (isMen ? MEN_SIZES : DEFAULT_SIZES) : ACCESSORY_SIZES),
    colors: item.colors || CLOTHING_COLORS,
    inStock: item.inStock !== undefined ? item.inStock : true,
    featured: item.featured !== undefined ? item.featured : (item.rating?.rate >= 4.0),
    isNewArrival: item.isNewArrival !== undefined ? item.isNewArrival : (item.id % 2 === 0),
    onSale: item.onSale !== undefined ? item.onSale : (item.price < 35),
    originalPrice: item.originalPrice !== undefined ? item.originalPrice : (item.onSale || item.price < 35 ? Math.round(item.price * 1.35 * 100) / 100 : undefined),
    discountPercent: item.discountPercent !== undefined ? item.discountPercent : (item.onSale || item.price < 35 ? Math.round((1 - item.price / (item.price * 1.35)) * 100) : undefined),
  };
}

export async function fetchProducts(category?: Category): Promise<Product[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    let url = `${API_BASE_URL}/products`;
    if (category && category !== 'all') {
      url = `${API_BASE_URL}/products/category/${encodeURIComponent(category)}`;
    }

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }

    const data = await res.json();
    
    // Filter to retain only clothing and jewelry (retail fashion focus)
    const fashionItems = (data as any[]).filter(
      (item) => item.category === "men's clothing" || 
                item.category === "women's clothing" || 
                item.category === "jewelery"
    );

    if (fashionItems.length === 0) {
      return getFallback(category);
    }

    return fashionItems.map(enhanceProduct);
  } catch (error) {
    console.warn('Fake Store API unavailable or blocked, falling back to local dataset:', error);
    return getFallback(category);
  }
}

function getFallback(category?: Category): Product[] {
  const items = !category || category === 'all'
    ? FALLBACK_PRODUCTS
    : FALLBACK_PRODUCTS.filter((item) => item.category === category);
  return items.map((item) => ({
    ...item,
    image: normalizeImageUrl(item.image),
  }));
}

export async function fetchProductById(id: number): Promise<Product | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE_URL}/products/${id}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    return enhanceProduct(data);
  } catch (error) {
    const fallbackItem = FALLBACK_PRODUCTS.find((p) => p.id === id);
    return fallbackItem || null;
  }
}
