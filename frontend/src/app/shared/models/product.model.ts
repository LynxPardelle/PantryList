export type UsageRatePeriod = 'day' | 'week' | 'month' | 'year';
export type ProductUnit = 'lt' | 'kg' | 'g' | 'piezas' | 'ml';
export type ProductCategory = 'food' | 'cleaning' | 'hygiene' | 'other';
export type ProductStatus = 'available' | 'low_stock' | 'out_of_stock';

export const PRODUCT_UNITS: ProductUnit[] = ['lt', 'kg', 'g', 'piezas', 'ml'];
export const PRODUCT_CATEGORIES: ProductCategory[] = ['food', 'cleaning', 'hygiene', 'other'];
export const USAGE_RATE_PERIODS: UsageRatePeriod[] = ['day', 'week', 'month', 'year'];

export interface UsageRate {
  amount: number;
  period: UsageRatePeriod;
}

export interface ApiProduct {
  id: string;
  userId: string;
  title: string;
  currentQuantity: number;
  unit: ProductUnit;
  usageRate: UsageRate;
  category: ProductCategory;
  status: ProductStatus;
  nextPurchaseDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  userId: string;
  title: string;
  currentQuantity: number;
  unit: ProductUnit;
  usageRate: UsageRate;
  category: ProductCategory;
  status: ProductStatus;
  nextPurchaseDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  title: string;
  currentQuantity: number;
  unit: ProductUnit;
  usageRate: UsageRate;
  category: ProductCategory;
}

export interface UpdateQuantityRequest {
  quantity: number;
}
