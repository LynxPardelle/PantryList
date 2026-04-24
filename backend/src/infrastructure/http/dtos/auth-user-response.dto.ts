import { ApiProperty } from '@nestjs/swagger';
import { UserAccountStatus } from '../../../domain/enums';

export class AuthUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ enum: Object.values(UserAccountStatus) })
  status: UserAccountStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
