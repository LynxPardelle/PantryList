import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

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
}
