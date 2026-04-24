import { RefreshSessionId } from '../value-objects/refresh-session-id.vo';
import { UserId } from '../value-objects/user-id.vo';

export interface RefreshSessionPrimitives {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export class RefreshSession {
  private constructor(
    private readonly _id: RefreshSessionId,
    private readonly _userId: UserId,
    private _refreshTokenHash: string,
    private _expiresAt: Date,
    private _revokedAt: Date | null,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
    private readonly _userAgent?: string | null,
    private readonly _ipAddress?: string | null,
  ) {}

  static create(
    userId: UserId,
    refreshTokenHash: string,
    expiresAt: Date,
    metadata?: {
      userAgent?: string | null;
      ipAddress?: string | null;
    },
  ): RefreshSession {
    if (!refreshTokenHash?.trim()) {
      throw new Error('Refresh token hash cannot be empty');
    }

    const now = new Date();
    return new RefreshSession(
      RefreshSessionId.generate(),
      userId,
      refreshTokenHash,
      expiresAt,
      null,
      now,
      now,
      metadata?.userAgent ?? null,
      metadata?.ipAddress ?? null,
    );
  }

  static createWithId(
    id: RefreshSessionId,
    userId: UserId,
    refreshTokenHash: string,
    expiresAt: Date,
    metadata?: {
      userAgent?: string | null;
      ipAddress?: string | null;
    },
  ): RefreshSession {
    if (!refreshTokenHash?.trim()) {
      throw new Error('Refresh token hash cannot be empty');
    }

    const now = new Date();
    return new RefreshSession(
      id,
      userId,
      refreshTokenHash,
      expiresAt,
      null,
      now,
      now,
      metadata?.userAgent ?? null,
      metadata?.ipAddress ?? null,
    );
  }

  static fromPrimitives(primitives: RefreshSessionPrimitives): RefreshSession {
    return new RefreshSession(
      RefreshSessionId.fromString(primitives.id),
      UserId.fromString(primitives.userId),
      primitives.refreshTokenHash,
      primitives.expiresAt,
      primitives.revokedAt ?? null,
      primitives.createdAt,
      primitives.updatedAt,
      primitives.userAgent ?? null,
      primitives.ipAddress ?? null,
    );
  }

  get id(): RefreshSessionId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get refreshTokenHash(): string {
    return this._refreshTokenHash;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get userAgent(): string | null | undefined {
    return this._userAgent;
  }

  get ipAddress(): string | null | undefined {
    return this._ipAddress;
  }

  isRevoked(): boolean {
    return this._revokedAt !== null;
  }

  isExpired(now: Date = new Date()): boolean {
    return this._expiresAt.getTime() <= now.getTime();
  }

  rotate(refreshTokenHash: string, expiresAt: Date): void {
    if (!refreshTokenHash?.trim()) {
      throw new Error('Refresh token hash cannot be empty');
    }

    this._refreshTokenHash = refreshTokenHash;
    this._expiresAt = expiresAt;
    this._updatedAt = new Date();
  }

  revoke(at: Date = new Date()): void {
    this._revokedAt = at;
    this._updatedAt = at;
  }

  toPrimitives(): RefreshSessionPrimitives {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      refreshTokenHash: this._refreshTokenHash,
      expiresAt: this._expiresAt,
      revokedAt: this._revokedAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      userAgent: this._userAgent ?? null,
      ipAddress: this._ipAddress ?? null,
    };
  }
}
