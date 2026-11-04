import type { Product } from '../types/product.js';

export interface HolidayGiftProduct extends Product {
  subcategory: string;
  gender: string;
  availableQuantity: number;
  productType: string;
  useCases: string[];
  keyFeatures: string[];
  searchTags: string[];
}

export const HOLIDAY_GIFT_PRODUCTS: HolidayGiftProduct[];
