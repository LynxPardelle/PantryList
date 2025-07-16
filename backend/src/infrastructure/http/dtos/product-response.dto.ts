import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  currentQuantity: number;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  usageRate: {
    amount: number;
    period: string;
  };

  @ApiProperty()
  category: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  nextPurchaseDate?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
