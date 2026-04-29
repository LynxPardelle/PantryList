import { ApiProperty } from '@nestjs/swagger';
import { InventoryLotResponseDto } from './inventory-lot-response.dto';
import { ProductTypeResponseDto } from './product-type-response.dto';

export class ArchivedPantryItemsResponseDto {
  @ApiProperty({ type: [ProductTypeResponseDto] })
  productTypes: ProductTypeResponseDto[];

  @ApiProperty({ type: [InventoryLotResponseDto] })
  inventoryLots: InventoryLotResponseDto[];
}
