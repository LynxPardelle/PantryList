import { DepletionRulePrimitives } from '../../domain/entities/product-type.entity';
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
  estimatedCurrentQuantity?: number;
  estimatedConsumedQuantity?: number;
  estimatedDepletionAt?: Date;
  variants: string[];
  lots: PantryLotSummary[];
}

export interface PantryOverview {
  userId: string;
  generatedAt: Date;
  items: PantryOverviewItem[];
  expiringItems: ExpiringProductGroup[];
  depletingItems: DepletingProductGroup[];
}
