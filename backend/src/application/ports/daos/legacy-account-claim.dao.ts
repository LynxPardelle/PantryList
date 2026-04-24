import { LegacyAccountClaim } from '../../../domain/entities/legacy-account-claim.entity';

export interface LegacyAccountClaimDao {
  save(claim: LegacyAccountClaim): Promise<LegacyAccountClaim>;
  findByLegacyUsername(
    legacyUsername: string,
  ): Promise<LegacyAccountClaim | null>;
  findAllUnclaimed(): Promise<LegacyAccountClaim[]>;
}
