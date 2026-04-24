import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProductTypeDepletionRuleDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.01)
  consumeAmount: number;

  @ApiProperty({ enum: ['lt', 'kg', 'g', 'piezas', 'ml'] })
  @IsString()
  @IsEnum(['lt', 'kg', 'g', 'piezas', 'ml'])
  unit: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  everyAmount: number;

  @ApiProperty({ enum: ['day', 'week', 'month'] })
  @IsString()
  @IsEnum(['day', 'week', 'month'])
  everyPeriod: string;

  @ApiProperty({ example: '2026-04-24' })
  @IsDateString()
  anchorDate: string;
}

export class CreateProductTypeDto {
  @ApiProperty({ example: 'Atun' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  baseName: string;

  @ApiProperty({ enum: ['food', 'cleaning', 'hygiene', 'other'] })
  @IsString()
  @IsEnum(['food', 'cleaning', 'hygiene', 'other'])
  category: string;

  @ApiProperty({ enum: ['lt', 'kg', 'g', 'piezas', 'ml'] })
  @IsString()
  @IsEnum(['lt', 'kg', 'g', 'piezas', 'ml'])
  defaultUnit: string;

  @ApiProperty({ required: false, type: ProductTypeDepletionRuleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductTypeDepletionRuleDto)
  defaultDepletionRule?: ProductTypeDepletionRuleDto;
}

export class UpdateProductTypeDepletionRuleDto {
  @ApiProperty({ type: ProductTypeDepletionRuleDto })
  @ValidateNested()
  @Type(() => ProductTypeDepletionRuleDto)
  defaultDepletionRule: ProductTypeDepletionRuleDto;
}
