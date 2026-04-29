import { ApiProperty } from '@nestjs/swagger';

export class UserPreferencesResponseDto {
  @ApiProperty()
  expirationWarningDays: number;

  @ApiProperty()
  showExpiredEntryAlert: boolean;

  @ApiProperty()
  depletionWarningThresholdRatio: number;

  @ApiProperty()
  shoppingPlanLeadDays: number;

  @ApiProperty()
  showGuidanceTips: boolean;
}

export class UserProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  connectedIdentityCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: UserPreferencesResponseDto })
  preferences: UserPreferencesResponseDto;
}
