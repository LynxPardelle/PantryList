import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateInventoryLotDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productTypeId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  variantName?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ enum: ['lt', 'kg', 'g', 'piezas', 'ml'] })
  @IsString()
  @IsEnum(['lt', 'kg', 'g', 'piezas', 'ml'])
  unit: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;
}
