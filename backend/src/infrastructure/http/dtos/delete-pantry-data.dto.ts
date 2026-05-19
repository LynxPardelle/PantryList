import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeletePantryDataDto {
  @ApiProperty({ example: 'ELIMINAR' })
  @IsString()
  confirmationText: string;
}

export class DeletePantryDataResponseDto {
  @ApiProperty()
  deletedInventoryLotCount: number;

  @ApiProperty()
  deletedProductTypeCount: number;

  @ApiProperty()
  deletedShoppingShareCount: number;
}
