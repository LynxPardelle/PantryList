import { PasswordResetTokenId } from '../value-objects/password-reset-token-id.vo';
import { UserId } from '../value-objects/user-id.vo';

export interface PasswordResetTokenPrimitives {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export class PasswordResetToken {
  private constructor(
    private readonly _id: PasswordResetTokenId,
    private readonly _userId: UserId,
    private readonly _tokenHash: string,
    private readonly _expiresAt: Date,
    private _usedAt: Date | null,
    private readonly _createdAt: Date = new Date(),
  ) {}

  static create(
    userId: UserId,
    tokenHash: string,
    expiresAt: Date,
  ): PasswordResetToken {
    if (!tokenHash?.trim()) {
      throw new Error('Password reset token hash cannot be empty');
    }

    return new PasswordResetToken(
      PasswordResetTokenId.generate(),
      userId,
      tokenHash,
      expiresAt,
      null,
      new Date(),
    );
  }

  static fromPrimitives(
    primitives: PasswordResetTokenPrimitives,
  ): PasswordResetToken {
    return new PasswordResetToken(
      PasswordResetTokenId.fromString(primitives.id),
      UserId.fromString(primitives.userId),
      primitives.tokenHash,
      primitives.expiresAt,
      primitives.usedAt ?? null,
      primitives.createdAt,
    );
  }

  get id(): PasswordResetTokenId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get tokenHash(): string {
    return this._tokenHash;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get usedAt(): Date | null {
    return this._usedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return this._expiresAt.getTime() <= now.getTime();
  }

  isUsed(): boolean {
    return this._usedAt !== null;
  }

  markAsUsed(at: Date = new Date()): void {
    this._usedAt = at;
  }

  toPrimitives(): PasswordResetTokenPrimitives {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      tokenHash: this._tokenHash,
      expiresAt: this._expiresAt,
      usedAt: this._usedAt,
      createdAt: this._createdAt,
    };
  }
}
