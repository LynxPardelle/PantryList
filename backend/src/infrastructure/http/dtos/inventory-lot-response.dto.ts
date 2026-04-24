import { ApiProperty } from '@nestjs/swagger';

export class InventoryLotResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  productTypeId: string;

  @ApiProperty({ required: false })
  variantName?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit: string;

  @ApiProperty({ required: false })
  expiresAt?: Date;

  @ApiProperty({ required: false })
  purchaseDate?: Date;

  @ApiProperty()
  expirationStatus: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
