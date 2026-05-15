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
}
