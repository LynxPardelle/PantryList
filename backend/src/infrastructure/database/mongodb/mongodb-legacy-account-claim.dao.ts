import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { LegacyAccountClaimDao } from '../../../application/ports/daos';
import {
  LegacyAccountClaim,
  LegacyAccountClaimPrimitives,
} from '../../../domain/entities/legacy-account-claim.entity';
import { LegacyAccountClaimDocument } from './schemas/legacy-account-claim.schema';

type PersistedLegacyAccountClaim = LegacyAccountClaimPrimitives & {
  normalizedLegacyUsername: string;
};

@Injectable()
export class MongoLegacyAccountClaimDao implements LegacyAccountClaimDao {
  constructor(
    @InjectModel(LegacyAccountClaimDocument.name)
    private readonly legacyAccountClaimModel: Model<LegacyAccountClaimDocument>,
  ) {}

  async save(claim: LegacyAccountClaim): Promise<LegacyAccountClaim> {
    const primitives = claim.toPrimitives();
    const normalizedLegacyUsername = normalizeLegacyUsername(
      primitives.legacyUsername,
    );
    const savedClaim = await this.legacyAccountClaimModel
      .findOneAndUpdate(
        { normalizedLegacyUsername },
        {
          ...primitives,
          normalizedLegacyUsername,
        },
        {
          new: true,
          upsert: true,
        },
      )
      .lean()
      .exec();

    return this.toDomain(savedClaim);
  }

  async findByLegacyUsername(
    legacyUsername: string,
  ): Promise<LegacyAccountClaim | null> {
    const claim = await this.legacyAccountClaimModel
      .findOne({
        normalizedLegacyUsername: normalizeLegacyUsername(legacyUsername),
      })
      .lean()
      .exec();

    return claim ? this.toDomain(claim) : null;
  }

  async findAllUnclaimed(): Promise<LegacyAccountClaim[]> {
    const claims = await this.legacyAccountClaimModel
      .find({ status: 'unclaimed' })
      .lean()
      .exec();

    return claims.map((claim) =>
      this.toDomain(claim as PersistedLegacyAccountClaim),
    );
  }

  private toDomain(claim: PersistedLegacyAccountClaim): LegacyAccountClaim {
    return LegacyAccountClaim.fromPrimitives({
      id: claim.id,
      legacyUsername: claim.legacyUsername,
      status: claim.status,
      claimedUserId: claim.claimedUserId ?? null,
      createdAt: new Date(claim.createdAt),
      updatedAt: new Date(claim.updatedAt),
      claimedAt: claim.claimedAt ? new Date(claim.claimedAt) : null,
    });
  }
}

function normalizeLegacyUsername(value: string): string {
  return value.trim().toLocaleLowerCase('es');
}
