import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ClaimImportedAccountDto {
  @ApiProperty()
  @IsString()
  legacyUsername: string;

  @ApiProperty({ example: 'chef@pantrylist.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  finalUsername?: string;
}
