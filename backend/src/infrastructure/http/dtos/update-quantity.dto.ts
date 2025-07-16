import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateQuantityDto {
  @ApiProperty({ description: 'New quantity', example: 2.5 })
  @IsNumber()
  @IsPositive()
  quantity: number;
}
