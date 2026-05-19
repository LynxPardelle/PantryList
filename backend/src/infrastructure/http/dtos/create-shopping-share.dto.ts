import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MAX_SHOPPING_SHARE_TEXT_LENGTH } from '../../../application/constants/shopping-share-limits';

export class CreateShoppingShareDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_SHOPPING_SHARE_TEXT_LENGTH)
  text: string;
}
