import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MAX_SAVED_SHOPPING_LIST_ITEMS } from '../../../application/constants/query-limits';
import { QuantityUnit } from '../../../domain/enums';

export class ShoppingListItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  productTypeId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  baseName: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @Max(1000000)
  quantity: number;

  @ApiProperty({ enum: Object.values(QuantityUnit) })
  @IsString()
  @IsEnum(QuantityUnit)
  unit: QuantityUnit;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  shoppingLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(1000000)
  estimatedUnitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(1000000)
  estimatedLineTotal?: number;
}

export class CreateShoppingListDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  occasion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  shoppingLocation?: string;

  @ApiProperty({ type: [ShoppingListItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SAVED_SHOPPING_LIST_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ShoppingListItemDto)
  items: ShoppingListItemDto[];
}

export class ShoppingListResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ownerUserId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  occasion?: string;

  @ApiProperty({ required: false })
  shoppingLocation?: string;

  @ApiProperty({ type: [ShoppingListItemDto] })
  items: ShoppingListItemDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
