import { ApiProperty } from '@nestjs/swagger';

export class ProductTypeDepletionRuleResponseDto {
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

export class ProductTypePlanningSettingsResponseDto {
  @ApiProperty()
  planningEnabled: boolean;

  @ApiProperty({ required: false })
  expirationWarningDaysOverride?: number;

  @ApiProperty({ required: false })
  depletionWarningThresholdRatioOverride?: number;

  @ApiProperty({ required: false })
  shoppingPlanLeadDaysOverride?: number;
}

export class ProductTypeShoppingMetadataResponseDto {
  @ApiProperty({ required: false })
  storageLocation?: string;

  @ApiProperty({ required: false })
  shoppingLocation?: string;

  @ApiProperty({ required: false })
  preferredBrand?: string;

  @ApiProperty({ required: false })
  substituteBrand?: string;

  @ApiProperty({ required: false })
  shoppingNotes?: string;

  @ApiProperty({ required: false })
  estimatedUnitPrice?: number;

  @ApiProperty()
  buyOnlyOnPromo: boolean;
}

export class ProductTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  baseName: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  defaultUnit: string;

  @ApiProperty({ required: false, type: ProductTypeDepletionRuleResponseDto })
  defaultDepletionRule?: ProductTypeDepletionRuleResponseDto;

  @ApiProperty({ type: ProductTypePlanningSettingsResponseDto })
  planningSettings: ProductTypePlanningSettingsResponseDto;

  @ApiProperty({ type: ProductTypeShoppingMetadataResponseDto })
  shoppingMetadata: ProductTypeShoppingMetadataResponseDto;

  @ApiProperty({ required: false })
  archivedAt?: Date;

  @ApiProperty({ required: false })
  archivedReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
