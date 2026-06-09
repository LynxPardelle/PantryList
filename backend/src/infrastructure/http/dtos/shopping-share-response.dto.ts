import { ApiProperty } from '@nestjs/swagger';

export class ShoppingShareResponseDto {
  @ApiProperty({ required: false })
  id?: string;

  @ApiProperty({ required: false })
  token?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ required: false })
  revokedAt?: Date;
}

export class PublicShoppingShareResponseDto {
  @ApiProperty()
  text: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  expiresAt: Date;
}
