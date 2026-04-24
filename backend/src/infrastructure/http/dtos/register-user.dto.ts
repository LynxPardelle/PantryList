import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({ example: 'chef@pantrylist.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ChefPantry' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  username: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  password: string;
}
