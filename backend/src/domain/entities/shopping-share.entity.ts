import { randomUUID } from 'crypto';
import { MAX_SHOPPING_SHARE_TEXT_LENGTH } from '../../application/constants/shopping-share-limits';
import { UserId } from '../value-objects/user-id.vo';

export interface ShoppingSharePrimitives {
  id: string;
  ownerUserId: string;
  tokenHash: string;
  text: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  updatedAt: Date;
}

export class ShoppingShare {
  private constructor(
    private readonly _id: string,
    private readonly _ownerUserId: UserId,
    private readonly _tokenHash: string,
    private readonly _text: string,
    private readonly _createdAt: Date,
    private readonly _expiresAt: Date,
    private _revokedAt: Date | undefined,
    private _updatedAt: Date,
  ) {}

  static create(params: {
    ownerUserId: string;
    tokenHash: string;
    text: string;
    createdAt: Date;
    expiresAt: Date;
  }): ShoppingShare {
    return new ShoppingShare(
      randomUUID(),
      UserId.fromString(params.ownerUserId),
      normalizeTokenHash(params.tokenHash),
      normalizeShareText(params.text),
      params.createdAt,
      params.expiresAt,
      undefined,
      params.createdAt,
    );
  }

  static fromPrimitives(primitives: ShoppingSharePrimitives): ShoppingShare {
    return new ShoppingShare(
      primitives.id,
      UserId.fromString(primitives.ownerUserId),
      normalizeTokenHash(primitives.tokenHash),
      normalizeShareText(primitives.text),
      new Date(primitives.createdAt),
      new Date(primitives.expiresAt),
      primitives.revokedAt ? new Date(primitives.revokedAt) : undefined,
      new Date(primitives.updatedAt),
    );
  }

  get ownerUserId(): string {
    return this._ownerUserId.toString();
  }

  get expiresAt(): Date {
    return new Date(this._expiresAt);
  }

  get revokedAt(): Date | undefined {
    return this._revokedAt ? new Date(this._revokedAt) : undefined;
  }

  isExpired(now = new Date()): boolean {
    return this._expiresAt.getTime() <= now.getTime();
  }

  isRevoked(): boolean {
    return Boolean(this._revokedAt);
  }

  revoke(ownerUserId: string, now = new Date()): void {
    if (this.ownerUserId !== UserId.fromString(ownerUserId).toString()) {
      throw new Error('Shopping share is not owned by the current user');
    }

    if (this._revokedAt) {
      return;
    }

    this._revokedAt = now;
    this._updatedAt = now;
  }

  toPrimitives(): ShoppingSharePrimitives {
    return {
      id: this._id,
      ownerUserId: this.ownerUserId,
      tokenHash: this._tokenHash,
      text: this._text,
      createdAt: new Date(this._createdAt),
      expiresAt: new Date(this._expiresAt),
      revokedAt: this._revokedAt ? new Date(this._revokedAt) : undefined,
      updatedAt: new Date(this._updatedAt),
    };
  }
}

function normalizeShareText(text: string): string {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error('Shopping share text cannot be empty');
  }

  if (normalizedText.length > MAX_SHOPPING_SHARE_TEXT_LENGTH) {
    throw new Error(
      `Shopping share text exceeds ${MAX_SHOPPING_SHARE_TEXT_LENGTH} characters`,
    );
  }

  return normalizedText;
}

function normalizeTokenHash(tokenHash: string): string {
  const normalizedTokenHash = tokenHash.trim();

  if (!/^[a-f0-9]{64}$/.test(normalizedTokenHash)) {
    throw new Error('Shopping share token hash must match sha256 hex format');
  }

  return normalizedTokenHash;
}
