import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class ConsumeInventoryLotDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity: number;
}
