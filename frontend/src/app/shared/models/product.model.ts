export interface UsageRate {
  amount: number;
  period: 'day' | 'week' | 'month' | 'year';
}

export interface Product {
  id: string;
  userId: string;
  title: string;
  currentQuantity: number;
  unit: 'lt' | 'kg' | 'g' | 'piezas' | 'ml';
  usageRate: UsageRate;
  category: 'food' | 'cleaning' | 'hygiene' | 'other';
  status: 'available' | 'low_stock' | 'out_of_stock';
  nextPurchaseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  userId: string;
  title: string;
  currentQuantity: number;
  unit: string;
  usageRate: UsageRate;
  category: string;
}

export interface UpdateQuantityRequest {
  quantity: number;
}
