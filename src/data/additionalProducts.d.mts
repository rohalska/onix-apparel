export interface AdditionalProduct {
  id: number;
  title: string;
  price: number;
  originalPrice: number;
  description: string;
  category: string;
  subcategory: string;
  gender: string;
  image: string;
  rating: { rate: number; count: number };
  sizes: string[];
  colors: { name: string; hex: string }[];
  inStock: boolean;
  availableQuantity: number;
  featured: boolean;
  isNewArrival: boolean;
}

export const ADDITIONAL_PRODUCTS: AdditionalProduct[];
