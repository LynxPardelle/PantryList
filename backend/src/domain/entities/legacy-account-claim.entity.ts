import { LegacyAccountClaimStatus } from '../enums';
import { LegacyAccountClaimId } from '../value-objects/legacy-account-claim-id.vo';
import { UserId } from '../value-objects/user-id.vo';

export interface LegacyAccountClaimPrimitives {
  id: string;
  legacyUsername: string;
  status: LegacyAccountClaimStatus;
  claimedUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  claimedAt?: Date | null;
}

export class LegacyAccountClaim {
  private constructor(
    private readonly _id: LegacyAccountClaimId,
    private readonly _legacyUsername: string,
    private _status: LegacyAccountClaimStatus,
    private _claimedUserId: UserId | null,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
    private _claimedAt: Date | null = null,
  ) {}

  static create(legacyUsername: string): LegacyAccountClaim {
    const normalizedUsername = legacyUsername.trim();

    if (!normalizedUsername) {
      throw new Error('Legacy username cannot be empty');
    }

    const now = new Date();
    return new LegacyAccountClaim(
      LegacyAccountClaimId.generate(),
      normalizedUsername,
      LegacyAccountClaimStatus.UNCLAIMED,
      null,
      now,
      now,
      null,
    );
  }

  static fromPrimitives(
    primitives: LegacyAccountClaimPrimitives,
  ): LegacyAccountClaim {
    return new LegacyAccountClaim(
      LegacyAccountClaimId.fromString(primitives.id),
      primitives.legacyUsername,
      primitives.status,
      primitives.claimedUserId
        ? UserId.fromString(primitives.claimedUserId)
        : null,
      primitives.createdAt,
      primitives.updatedAt,
      primitives.claimedAt ?? null,
    );
  }

  get id(): LegacyAccountClaimId {
    return this._id;
  }

  get legacyUsername(): string {
    return this._legacyUsername;
  }

  get status(): LegacyAccountClaimStatus {
    return this._status;
  }

  get claimedUserId(): UserId | null {
    return this._claimedUserId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get claimedAt(): Date | null {
    return this._claimedAt;
  }

  markClaiming(): void {
    this._status = LegacyAccountClaimStatus.CLAIMING;
    this._updatedAt = new Date();
  }

  markClaimed(userId: UserId): void {
    const now = new Date();
    this._status = LegacyAccountClaimStatus.CLAIMED;
    this._claimedUserId = userId;
    this._claimedAt = now;
    this._updatedAt = now;
  }

  lock(): void {
    this._status = LegacyAccountClaimStatus.LOCKED;
    this._updatedAt = new Date();
  }

  toPrimitives(): LegacyAccountClaimPrimitives {
    return {
      id: this._id.toString(),
      legacyUsername: this._legacyUsername,
      status: this._status,
      claimedUserId: this._claimedUserId?.toString() ?? null,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      claimedAt: this._claimedAt,
    };
  }
}
