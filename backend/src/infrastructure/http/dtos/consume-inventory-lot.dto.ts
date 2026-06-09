import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  WASTE_REASONS,
  WasteReason,
} from '../../../domain/entities/waste-event.entity';

export class ConsumeInventoryLotDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ required: false, enum: WASTE_REASONS })
  @IsOptional()
  @IsIn(WASTE_REASONS)
  wasteReason?: WasteReason;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  wasteNote?: string;
}
