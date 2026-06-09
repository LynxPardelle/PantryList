import { ConfigService } from '@nestjs/config';

export interface RetentionPolicyPrimitives {
  archivedRecordRetentionDays: number;
  archivedRecordAutoDeleteEnabled: boolean;
  temporaryShoppingShareRetentionDays: number;
  permanentlyDeletedRecords: 'removed_immediately';
  accountDeletion: 'local_and_cognito_delete_requested';
}

export function buildRetentionPolicy(
  configService: ConfigService,
): RetentionPolicyPrimitives {
  return {
    archivedRecordRetentionDays: readPositiveInteger(
      configService,
      'ARCHIVED_RECORD_RETENTION_DAYS',
      365,
    ),
    archivedRecordAutoDeleteEnabled:
      configService.get<string>('ARCHIVED_RECORD_AUTO_DELETE_ENABLED') ===
      'true',
    temporaryShoppingShareRetentionDays: readPositiveInteger(
      configService,
      'TEMPORARY_SHOPPING_SHARE_RETENTION_DAYS',
      7,
    ),
    permanentlyDeletedRecords: 'removed_immediately',
    accountDeletion: 'local_and_cognito_delete_requested',
  };
}

export function getArchivedRecordRetentionExpiresAt(
  archivedAt: Date | undefined,
  configService: ConfigService,
): Date | undefined {
  const policy = buildRetentionPolicy(configService);

  if (!archivedAt || !policy.archivedRecordAutoDeleteEnabled) {
    return undefined;
  }

  return new Date(
    archivedAt.getTime() +
      policy.archivedRecordRetentionDays * 24 * 60 * 60 * 1000,
  );
}

function readPositiveInteger(
  configService: ConfigService,
  key: string,
  fallback: number,
): number {
  const value = Number(configService.get<string | number>(key) ?? fallback);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}
