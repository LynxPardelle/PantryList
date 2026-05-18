import {
  DepletionRulePrimitives,
  ProductTypeShoppingMetadataPrimitives,
} from '../../domain/entities/product-type.entity';
import { UserPreferencesPrimitives } from '../../domain/value-objects/user-preferences.vo';
import {
  ExpirationStatus,
  ProductCategory,
  QuantityUnit,
} from '../../domain/enums';

export interface PantryLotSummary {
  lotId: string;
  variantName?: string;
  quantity: number;
  unit: QuantityUnit;
  expiresAt?: Date;
  purchaseDate?: Date;
  expirationStatus: ExpirationStatus;
  updatedAt: Date;
}

export interface ExpiringProductGroup {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  totalExpiringQuantity: number;
  nextExpirationAt?: Date;
  lotCount: number;
  lots: PantryLotSummary[];
}

export interface DepletingProductGroup {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: QuantityUnit;
  totalQuantity: number;
  estimatedCurrentQuantity: number;
  estimatedConsumedQuantity: number;
  estimatedDepletionAt: Date;
  depletionRule: DepletionRulePrimitives;
  effectivePlanningSettings: ProductTypeEffectivePlanningSettings;
  shoppingMetadata: ProductTypeShoppingMetadataPrimitives;
}

export type ShoppingPlanUrgency = 'depleted' | 'critical' | 'upcoming';
export type PantryStapleStatus = 'available' | 'low' | 'missing';

export interface PantryStapleItem {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: QuantityUnit;
  totalQuantity: number;
  estimatedCurrentQuantity?: number;
  suggestedPurchaseQuantity: number;
  estimatedUnitPrice?: number;
  estimatedRestockTotal?: number;
  status: PantryStapleStatus;
  shoppingMetadata: ProductTypeShoppingMetadataPrimitives;
}

export interface PantryValueInsights {
  stapleCount: number;
  stapleAttentionCount: number;
  estimatedShoppingTotal: number;
  estimatedExpiringValue: number;
  estimatedStapleRestockTotal: number;
}

export interface ShoppingPlanItem {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: QuantityUnit;
  totalQuantity: number;
  estimatedCurrentQuantity: number;
  estimatedConsumedQuantity: number;
  estimatedDepletionAt: Date;
  recommendedPurchaseAt: Date;
  suggestedPurchaseQuantity: number;
  estimatedUnitPrice?: number;
  estimatedLineTotal?: number;
  urgency: ShoppingPlanUrgency;
  depletionRule: DepletionRulePrimitives;
  effectivePlanningSettings: ProductTypeEffectivePlanningSettings;
  shoppingMetadata: ProductTypeShoppingMetadataPrimitives;
}

export interface ShoppingRouteGroup {
  shoppingLocation: string;
  itemCount: number;
  urgentItemCount: number;
  promoOnlyCount: number;
  missingPriceCount: number;
  estimatedTotal: number;
  nextRecommendedPurchaseAt: Date;
  items: ShoppingPlanItem[];
}

export interface PriceHistoryEntry {
  shoppingLocation?: string;
  preferredBrand?: string;
  unit: QuantityUnit;
  estimatedUnitPrice: number;
  recordedAt: Date;
}

export interface PriceReferenceItem {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: QuantityUnit;
  shoppingLocation: string;
  preferredBrand?: string;
  substituteBrand?: string;
  estimatedUnitPrice: number;
  priceHistory: PriceHistoryEntry[];
  buyOnlyOnPromo: boolean;
  updatedAt: Date;
}

export type PlanningSettingSource = 'profile' | 'productType';

export interface ProductTypeEffectivePlanningSettings {
  planningEnabled: boolean;
  expirationWarningDays: number;
  depletionWarningThresholdRatio: number;
  shoppingPlanLeadDays: number;
  expirationWarningDaysSource: PlanningSettingSource;
  depletionWarningThresholdRatioSource: PlanningSettingSource;
  shoppingPlanLeadDaysSource: PlanningSettingSource;
}

export interface PantryOverviewItem {
  productTypeId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: QuantityUnit;
  totalQuantity: number;
  lotCount: number;
  nextExpirationAt?: Date;
  expiringSoonQuantity: number;
  hasDepletionRule: boolean;
  depletionRule?: DepletionRulePrimitives;
  effectivePlanningSettings: ProductTypeEffectivePlanningSettings;
  shoppingMetadata: ProductTypeShoppingMetadataPrimitives;
  estimatedCurrentQuantity?: number;
  estimatedConsumedQuantity?: number;
  estimatedDepletionAt?: Date;
  variants: string[];
  lots: PantryLotSummary[];
}

export interface PantryOverview {
  userId: string;
  generatedAt: Date;
  preferences: UserPreferencesPrimitives;
  items: PantryOverviewItem[];
  expiringItems: ExpiringProductGroup[];
  depletingItems: DepletingProductGroup[];
  shoppingPlanItems: ShoppingPlanItem[];
  shoppingPlanEstimatedTotal: number;
  shoppingRouteGroups: ShoppingRouteGroup[];
  priceReferenceItems: PriceReferenceItem[];
  stapleItems: PantryStapleItem[];
  valueInsights: PantryValueInsights;
}
