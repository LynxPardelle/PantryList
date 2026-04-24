export type ProductUnit = 'lt' | 'kg' | 'g' | 'piezas' | 'ml';
export type ProductCategory = 'food' | 'cleaning' | 'hygiene' | 'other';
export type ExpirationStatus = 'critical' | 'soon' | 'stable' | 'none';
export type ProductTypeSelectionMode = 'existing' | 'new';

export const PRODUCT_UNITS: ProductUnit[] = ['lt', 'kg', 'g', 'piezas', 'ml'];
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'food',
  'cleaning',
  'hygiene',
  'other',
];

export interface ProductType {
  id: string;
  userId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLot {
  id: string;
  userId: string;
  productTypeId: string;
  variantName?: string;
  quantity: number;
  unit: ProductUnit;
  expiresAt: Date | null;
  purchaseDate: Date | null;
  expirationStatus: ExpirationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PantryLotSummary {
  lotId: string;
  variantName?: string;
  quantity: number;
  unit: ProductUnit;
  expiresAt: Date | null;
  expirationStatus: ExpirationStatus;
  updatedAt: Date;
}

export interface PantryOverviewItem {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  totalQuantity: number;
  lotCount: number;
  nextExpirationAt: Date | null;
  expiringSoonQuantity: number;
  variants: string[];
  lots: PantryLotSummary[];
}

export interface ExpiringProductGroup {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  totalExpiringQuantity: number;
  nextExpirationAt: Date | null;
  lotCount: number;
  lots: PantryLotSummary[];
}

export interface PantryOverview {
  userId: string;
  generatedAt: Date;
  items: PantryOverviewItem[];
  expiringItems: ExpiringProductGroup[];
}

export interface CreateProductTypeRequest {
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
}

export interface CreateInventoryLotRequest {
  productTypeId: string;
  variantName?: string;
  quantity: number;
  unit: ProductUnit;
  expiresAt?: string;
  purchaseDate?: string;
}

export interface ConsumeInventoryLotRequest {
  quantity: number;
}

export interface RegisterLotRequest {
  selectionMode: ProductTypeSelectionMode;
  existingProductTypeId?: string;
  newProductType?: {
    baseName: string;
    category: ProductCategory;
    defaultUnit: ProductUnit;
  };
  variantName?: string;
  quantity: number;
  unit: ProductUnit;
  expiresAt?: string;
  purchaseDate?: string;
}

export interface ApiProductType {
  id: string;
  userId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPantryLotSummary {
  lotId: string;
  variantName?: string;
  quantity: number;
  unit: ProductUnit;
  expiresAt?: string | null;
  expirationStatus: ExpirationStatus;
  updatedAt: string;
}

export interface ApiPantryOverviewItem {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  totalQuantity: number;
  lotCount: number;
  nextExpirationAt?: string | null;
  expiringSoonQuantity: number;
  variants: string[];
  lots: ApiPantryLotSummary[];
}

export interface ApiExpiringProductGroup {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  totalExpiringQuantity: number;
  nextExpirationAt?: string | null;
  lotCount: number;
  lots: ApiPantryLotSummary[];
}

export interface ApiPantryOverview {
  userId: string;
  generatedAt: string;
  items: ApiPantryOverviewItem[];
  expiringItems: ApiExpiringProductGroup[];
}

export interface ApiInventoryLot {
  id: string;
  userId: string;
  productTypeId: string;
  variantName?: string;
  quantity: number;
  unit: ProductUnit;
  expiresAt?: string | null;
  purchaseDate?: string | null;
  expirationStatus: ExpirationStatus;
  createdAt: string;
  updatedAt: string;
}
