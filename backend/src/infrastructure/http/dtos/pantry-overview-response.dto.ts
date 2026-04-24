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

  @ApiProperty({ type: [PantryOverviewItemResponseDto] })
  items: PantryOverviewItemResponseDto[];

  @ApiProperty({ type: [ExpiringProductGroupResponseDto] })
  expiringItems: ExpiringProductGroupResponseDto[];
}
