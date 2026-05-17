import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class ProductTypeShoppingMetadataDto {
  @ApiPropertyOptional({ maxLength: 80, example: 'Despensa' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(80)
  storageLocation?: string;

  @ApiPropertyOptional({ maxLength: 80, example: 'Mercado' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(80)
  shoppingLocation?: string;

  @ApiPropertyOptional({ maxLength: 80, example: 'Marca local' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(80)
  preferredBrand?: string;

  @ApiPropertyOptional({ maxLength: 80, example: 'Marca propia' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(80)
  substituteBrand?: string;

  @ApiPropertyOptional({ maxLength: 160 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(160)
  shoppingNotes?: string;

  @ApiPropertyOptional({ minimum: 0.01, maximum: 1000000, example: 36.5 })
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  estimatedUnitPrice?: number;

  @ApiPropertyOptional({ default: false })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  householdStaple?: boolean;

  @ApiPropertyOptional({ default: false })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  buyOnlyOnPromo?: boolean;
}
