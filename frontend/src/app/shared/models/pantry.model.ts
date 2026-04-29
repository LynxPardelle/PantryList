import { UserPreferences } from './profile.model';

export type ProductUnit = 'lt' | 'kg' | 'g' | 'piezas' | 'ml';
export type ProductCategory = 'food' | 'cleaning' | 'hygiene' | 'other';
export type ExpirationStatus = 'expired' | 'critical' | 'soon' | 'stable' | 'none';
export type ProductTypeSelectionMode = 'existing' | 'new';
export type DepletionPeriod = 'day' | 'week' | 'month';
export type ShoppingPlanUrgency = 'depleted' | 'critical' | 'upcoming';
export type PlanningSettingSource = 'profile' | 'productType';

export const PRODUCT_UNITS: ProductUnit[] = ['lt', 'kg', 'g', 'piezas', 'ml'];
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'food',
  'cleaning',
  'hygiene',
  'other',
];
export const DEPLETION_PERIODS: DepletionPeriod[] = ['day', 'week', 'month'];

export interface ProductTypeDepletionRule {
  enabled: boolean;
  consumeAmount: number;
  unit: ProductUnit;
  everyAmount: number;
  everyPeriod: DepletionPeriod;
  anchorDate: Date;
}

export interface ProductTypeDepletionRuleRequest {
  enabled: boolean;
  consumeAmount: number;
  unit: ProductUnit;
  everyAmount: number;
  everyPeriod: DepletionPeriod;
  anchorDate: string;
}

export interface ProductTypePlanningSettings {
  planningEnabled: boolean;
  expirationWarningDaysOverride?: number;
  depletionWarningThresholdRatioOverride?: number;
  shoppingPlanLeadDaysOverride?: number;
}

export interface ProductTypeEffectivePlanningSettings {
  planningEnabled: boolean;
  expirationWarningDays: number;
  depletionWarningThresholdRatio: number;
  shoppingPlanLeadDays: number;
  expirationWarningDaysSource: PlanningSettingSource;
  depletionWarningThresholdRatioSource: PlanningSettingSource;
  shoppingPlanLeadDaysSource: PlanningSettingSource;
}

export interface ProductType {
  id: string;
  userId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  defaultDepletionRule?: ProductTypeDepletionRule;
  planningSettings: ProductTypePlanningSettings;
  archivedAt: Date | null;
  archivedReason?: string;
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
  archivedAt: Date | null;
  archivedReason?: string;
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
  purchaseDate: Date | null;
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
  hasDepletionRule: boolean;
  depletionRule?: ProductTypeDepletionRule;
  effectivePlanningSettings: ProductTypeEffectivePlanningSettings;
  estimatedCurrentQuantity?: number;
  estimatedConsumedQuantity?: number;
  estimatedDepletionAt?: Date;
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

export interface DepletingProductGroup {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  totalQuantity: number;
  estimatedCurrentQuantity: number;
  estimatedConsumedQuantity: number;
  estimatedDepletionAt: Date;
  depletionRule: ProductTypeDepletionRule;
  effectivePlanningSettings: ProductTypeEffectivePlanningSettings;
}

export interface ShoppingPlanItem {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  totalQuantity: number;
  estimatedCurrentQuantity: number;
  estimatedConsumedQuantity: number;
  estimatedDepletionAt: Date;
  recommendedPurchaseAt: Date;
  suggestedPurchaseQuantity: number;
  urgency: ShoppingPlanUrgency;
  depletionRule: ProductTypeDepletionRule;
  effectivePlanningSettings: ProductTypeEffectivePlanningSettings;
}

export interface PantryOverview {
  userId: string;
  generatedAt: Date;
  preferences: UserPreferences;
  items: PantryOverviewItem[];
  expiringItems: ExpiringProductGroup[];
  depletingItems: DepletingProductGroup[];
  shoppingPlanItems: ShoppingPlanItem[];
}

export interface CreateProductTypeRequest {
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  defaultDepletionRule?: ProductTypeDepletionRuleRequest;
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

export interface ArchivePantryItemRequest {
  reason?: string;
}

export interface DeletePantryItemRequest {
  confirmationText: string;
}

export interface ProductTypePlanningSettingsRequest {
  planningEnabled?: boolean;
  expirationWarningDaysOverride?: number;
  depletionWarningThresholdRatioOverride?: number;
  shoppingPlanLeadDaysOverride?: number;
}

export interface ArchivedPantryItems {
  productTypes: ProductType[];
  inventoryLots: InventoryLot[];
}

export interface RegisterLotRequest {
  selectionMode: ProductTypeSelectionMode;
  existingProductTypeId?: string;
  newProductType?: {
    baseName: string;
    category: ProductCategory;
    defaultUnit: ProductUnit;
    defaultDepletionRule?: ProductTypeDepletionRuleRequest;
  };
  defaultDepletionRule?: ProductTypeDepletionRuleRequest;
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
  defaultDepletionRule?: ApiProductTypeDepletionRule;
  planningSettings: ProductTypePlanningSettings;
  archivedAt?: string | null;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProductTypeDepletionRule {
  enabled: boolean;
  consumeAmount: number;
  unit: ProductUnit;
  everyAmount: number;
  everyPeriod: DepletionPeriod;
  anchorDate: string;
}

export interface ApiPantryLotSummary {
  lotId: string;
  variantName?: string;
  quantity: number;
  unit: ProductUnit;
  expiresAt?: string | null;
  purchaseDate?: string | null;
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
  hasDepletionRule: boolean;
  depletionRule?: ApiProductTypeDepletionRule;
  effectivePlanningSettings: ProductTypeEffectivePlanningSettings;
  estimatedCurrentQuantity?: number;
  estimatedConsumedQuantity?: number;
  estimatedDepletionAt?: string | null;
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

export interface ApiDepletingProductGroup {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  totalQuantity: number;
  estimatedCurrentQuantity: number;
  estimatedConsumedQuantity: number;
  estimatedDepletionAt: string;
  depletionRule: ApiProductTypeDepletionRule;
  effectivePlanningSettings: ProductTypeEffectivePlanningSettings;
}

export interface ApiShoppingPlanItem {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: ProductUnit;
  totalQuantity: number;
  estimatedCurrentQuantity: number;
  estimatedConsumedQuantity: number;
  estimatedDepletionAt: string;
  recommendedPurchaseAt: string;
  suggestedPurchaseQuantity: number;
  urgency: ShoppingPlanUrgency;
  depletionRule: ApiProductTypeDepletionRule;
  effectivePlanningSettings: ProductTypeEffectivePlanningSettings;
}

export interface ApiPantryOverview {
  userId: string;
  generatedAt: string;
  preferences: UserPreferences;
  items: ApiPantryOverviewItem[];
  expiringItems: ApiExpiringProductGroup[];
  depletingItems: ApiDepletingProductGroup[];
  shoppingPlanItems: ApiShoppingPlanItem[];
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
  archivedAt?: string | null;
  archivedReason?: string;
  expirationStatus: ExpirationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiArchivedPantryItems {
  productTypes: ApiProductType[];
  inventoryLots: ApiInventoryLot[];
}
