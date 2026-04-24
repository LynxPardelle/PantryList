import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({ example: 'chef@pantrylist.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  password: string;
}
