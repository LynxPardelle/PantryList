import { ApiProperty } from '@nestjs/swagger';

export class PantryLotSummaryResponseDto {
  @ApiProperty()
  lotId: string;

  @ApiProperty({ required: false })
  variantName?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit: string;

  @ApiProperty({ required: false })
  expiresAt?: Date;

  @ApiProperty()
  expirationStatus: string;

  @ApiProperty()
  updatedAt: Date;
}

export class ExpiringProductGroupResponseDto {
  @ApiProperty()
  productTypeId: string;

  @ApiProperty()
  baseName: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  totalExpiringQuantity: number;

  @ApiProperty({ required: false })
  nextExpirationAt?: Date;

  @ApiProperty()
  lotCount: number;

  @ApiProperty({ type: [PantryLotSummaryResponseDto] })
  lots: PantryLotSummaryResponseDto[];
}

export class DepletionRuleResponseDto {
  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  consumeAmount: number;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  everyAmount: number;

  @ApiProperty()
  everyPeriod: string;

  @ApiProperty()
  anchorDate: Date;
}

export class DepletingProductGroupResponseDto {
  @ApiProperty()
  productTypeId: string;

  @ApiProperty()
  baseName: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  defaultUnit: string;

  @ApiProperty()
  totalQuantity: number;

  @ApiProperty()
  estimatedCurrentQuantity: number;

  @ApiProperty()
  estimatedConsumedQuantity: number;

  @ApiProperty()
  estimatedDepletionAt: Date;

  @ApiProperty({ type: DepletionRuleResponseDto })
  depletionRule: DepletionRuleResponseDto;
}

export class ShoppingPlanItemResponseDto {
  @ApiProperty()
  productTypeId: string;

  @ApiProperty()
  baseName: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  defaultUnit: string;

  @ApiProperty()
  totalQuantity: number;

  @ApiProperty()
  estimatedCurrentQuantity: number;

  @ApiProperty()
  estimatedConsumedQuantity: number;

  @ApiProperty()
  estimatedDepletionAt: Date;

  @ApiProperty()
  recommendedPurchaseAt: Date;

  @ApiProperty()
  suggestedPurchaseQuantity: number;

  @ApiProperty()
  urgency: string;

  @ApiProperty({ type: DepletionRuleResponseDto })
  depletionRule: DepletionRuleResponseDto;
}

export class PantryOverviewItemResponseDto {
  @ApiProperty()
  productTypeId: string;

  @ApiProperty()
  baseName: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  defaultUnit: string;

  @ApiProperty()
  totalQuantity: number;

  @ApiProperty()
  lotCount: number;

  @ApiProperty({ required: false })
  nextExpirationAt?: Date;

  @ApiProperty()
  expiringSoonQuantity: number;

  @ApiProperty()
  hasDepletionRule: boolean;

  @ApiProperty({ required: false, type: DepletionRuleResponseDto })
  depletionRule?: DepletionRuleResponseDto;

  @ApiProperty({ required: false })
  estimatedCurrentQuantity?: number;

  @ApiProperty({ required: false })
  estimatedConsumedQuantity?: number;

  @ApiProperty({ required: false })
  estimatedDepletionAt?: Date;

  @ApiProperty({ type: [String] })
  variants: string[];

  @ApiProperty({ type: [PantryLotSummaryResponseDto] })
  lots: PantryLotSummaryResponseDto[];
}

export class PantryOverviewResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  generatedAt: Date;

  @ApiProperty()
  preferences: {
    expirationWarningDays: number;
    showExpiredEntryAlert: boolean;
    depletionWarningThresholdRatio: number;
    shoppingPlanLeadDays: number;
  };

  @ApiProperty({ type: [PantryOverviewItemResponseDto] })
  items: PantryOverviewItemResponseDto[];

  @ApiProperty({ type: [ExpiringProductGroupResponseDto] })
  expiringItems: ExpiringProductGroupResponseDto[];

  @ApiProperty({ type: [DepletingProductGroupResponseDto] })
  depletingItems: DepletingProductGroupResponseDto[];

  @ApiProperty({ type: [ShoppingPlanItemResponseDto] })
  shoppingPlanItems: ShoppingPlanItemResponseDto[];
}
