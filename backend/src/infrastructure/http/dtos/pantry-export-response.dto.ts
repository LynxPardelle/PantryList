import { ApiProperty } from '@nestjs/swagger';
import { ArchivedPantryItemsResponseDto } from './archived-pantry-items-response.dto';
import { PantryOverviewResponseDto } from './pantry-overview-response.dto';
import { UserProfileResponseDto } from './profile-response.dto';
import { ShoppingListResponseDto } from './shopping-list.dto';

export class PantryDataLimitsResponseDto {
  @ApiProperty({ example: 500 })
  activeProductTypesPerUser: number;

  @ApiProperty({ example: 250 })
  archivedProductTypesPerUser: number;

  @ApiProperty({ example: 25 })
  productTypeSearchResults: number;

  @ApiProperty({ example: 1000 })
  activeInventoryLotsPerUser: number;

  @ApiProperty({ example: 250 })
  archivedInventoryLotsPerUser: number;

  @ApiProperty({ example: 50 })
  archivedPantryPageSize: number;

  @ApiProperty({ example: 500 })
  inventoryLotsPerProductType: number;

  @ApiProperty({ example: 50 })
  shoppingCheckoutItems: number;

  @ApiProperty({ example: 25 })
  savedShoppingListsPerUser: number;

  @ApiProperty({ example: 100 })
  savedShoppingListItems: number;
}

export class PantryExportResponseDto {
  @ApiProperty({ example: 1 })
  formatVersion: 1;

  @ApiProperty()
  exportedAt: Date;

  @ApiProperty({ type: UserProfileResponseDto })
  profile: UserProfileResponseDto;

  @ApiProperty({ type: PantryOverviewResponseDto })
  overview: PantryOverviewResponseDto;

  @ApiProperty({ type: ArchivedPantryItemsResponseDto })
  archived: ArchivedPantryItemsResponseDto;

  @ApiProperty({ type: [ShoppingListResponseDto] })
  shoppingLists: ShoppingListResponseDto[];

  @ApiProperty({ type: PantryDataLimitsResponseDto })
  limits: PantryDataLimitsResponseDto;
}
