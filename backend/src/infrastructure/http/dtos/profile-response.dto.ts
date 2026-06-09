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

export class RetentionPolicyResponseDto {
  @ApiProperty()
  archivedRecordRetentionDays: number;

  @ApiProperty()
  archivedRecordAutoDeleteEnabled: boolean;

  @ApiProperty()
  temporaryShoppingShareRetentionDays: number;

  @ApiProperty()
  permanentlyDeletedRecords: string;

  @ApiProperty()
  accountDeletion: string;
}

export class StepUpSecurityResponseDto {
  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  maxAgeSeconds: number;

  @ApiProperty()
  fresh: boolean;

  @ApiProperty({ required: false })
  authenticatedAt?: Date;

  @ApiProperty({ required: false })
  freshUntil?: Date;
}

export class ProfileSecurityResponseDto {
  @ApiProperty({ type: StepUpSecurityResponseDto })
  stepUp: StepUpSecurityResponseDto;
}

export class KnownUserDeviceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  userAgentSummary: string;

  @ApiProperty()
  firstSeenAt: Date;

  @ApiProperty()
  lastSeenAt: Date;

  @ApiProperty()
  seenCount: number;

  @ApiProperty()
  current: boolean;
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

  @ApiProperty({ type: RetentionPolicyResponseDto })
  retentionPolicy: RetentionPolicyResponseDto;

  @ApiProperty({ type: ProfileSecurityResponseDto })
  security: ProfileSecurityResponseDto;

  @ApiProperty({ type: [KnownUserDeviceResponseDto] })
  knownDevices: KnownUserDeviceResponseDto[];
}
