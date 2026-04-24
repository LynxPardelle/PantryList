import { ApiProperty } from '@nestjs/swagger';

export class ProductTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  baseName: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  defaultUnit: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
