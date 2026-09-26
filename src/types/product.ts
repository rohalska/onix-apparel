export interface Rating {
  rate: number;
  count: number;
}

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: Rating;
  // Extended clothing retail properties
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  inStock?: boolean;
  featured?: boolean;
  isNewArrival?: boolean;
  onSale?: boolean;
  originalPrice?: number;
  discountPercent?: number;
}

export interface CartItem {
  id: string; // Composite unique key: `${productId}-${selectedSize}-${selectedColor}`
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export type Category = 'all' | "men's clothing" | "women's clothing" | 'jewelery';

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

export interface FilterState {
  category: Category;
  searchQuery: string;
  maxPrice: number;
  minRating: number;
  sortBy: SortOption;
}

export interface PromoCode {
  code: string;
  discountType: 'percentage' | 'fixed' | 'shipping';
  value: number;
  description: string;
}

export interface OrderDetails {
  orderId: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  customer: {
    fullName: string;
    email: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
}
