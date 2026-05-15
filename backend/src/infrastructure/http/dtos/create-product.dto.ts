import {
  IsString,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { QuantityUnit } from '../../../domain/enums';

class UsageRateDto {
  @ApiProperty({ description: 'Amount of usage', example: 2 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Period of usage',
    enum: ['day', 'week', 'month', 'year'],
  })
  @IsString()
  @IsEnum(['day', 'week', 'month', 'year'])
  period: string;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Product title', example: 'Aceite de oliva' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Current quantity', example: 1 })
  @IsNumber()
  @IsPositive()
  currentQuantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    enum: Object.values(QuantityUnit),
  })
  @IsString()
  @IsEnum(QuantityUnit)
  unit: string;

  @ApiProperty({ description: 'Usage rate information' })
  @ValidateNested()
  @Type(() => UsageRateDto)
  usageRate: UsageRateDto;

  @ApiProperty({
    description: 'Product category',
    enum: ['food', 'cleaning', 'hygiene', 'other'],
  })
  @IsString()
  @IsEnum(['food', 'cleaning', 'hygiene', 'other'])
  category: string;
}
