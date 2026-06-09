import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryLotResponseDto } from './inventory-lot-response.dto';
import { ProductTypeResponseDto } from './product-type-response.dto';

export class ArchivedPantryPaginationResponseDto {
  @ApiProperty()
  limit: number;

  @ApiPropertyOptional()
  productTypesNextCursor?: string;

  @ApiPropertyOptional()
  inventoryLotsNextCursor?: string;

  @ApiProperty()
  hasMoreProductTypes: boolean;

  @ApiProperty()
  hasMoreInventoryLots: boolean;
}

export class ArchivedPantryItemsResponseDto {
  @ApiProperty({ type: [ProductTypeResponseDto] })
  productTypes: ProductTypeResponseDto[];

  @ApiProperty({ type: [InventoryLotResponseDto] })
  inventoryLots: InventoryLotResponseDto[];

  @ApiPropertyOptional({ type: ArchivedPantryPaginationResponseDto })
  pagination?: ArchivedPantryPaginationResponseDto;
}
