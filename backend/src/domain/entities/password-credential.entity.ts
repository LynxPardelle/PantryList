import { UserId } from '../value-objects/user-id.vo';

export interface PasswordCredentialPrimitives {
  userId: string;
  passwordHash: string;
  passwordVersion: number;
  lastPasswordChangeAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PasswordCredential {
  private constructor(
    private readonly _userId: UserId,
    private _passwordHash: string,
    private _passwordVersion: number,
    private _lastPasswordChangeAt: Date,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
  ) {}

  static create(userId: UserId, passwordHash: string): PasswordCredential {
    if (!passwordHash?.trim()) {
      throw new Error('Password hash cannot be empty');
    }

    const now = new Date();
    return new PasswordCredential(userId, passwordHash, 1, now, now, now);
  }

  static fromPrimitives(
    primitives: PasswordCredentialPrimitives,
  ): PasswordCredential {
    return new PasswordCredential(
      UserId.fromString(primitives.userId),
      primitives.passwordHash,
      primitives.passwordVersion,
      primitives.lastPasswordChangeAt,
      primitives.createdAt,
      primitives.updatedAt,
    );
  }

  get userId(): UserId {
    return this._userId;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get passwordVersion(): number {
    return this._passwordVersion;
  }

  get lastPasswordChangeAt(): Date {
    return this._lastPasswordChangeAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  rotatePassword(passwordHash: string): void {
    if (!passwordHash?.trim()) {
      throw new Error('Password hash cannot be empty');
    }

    this._passwordHash = passwordHash;
    this._passwordVersion += 1;
    this._lastPasswordChangeAt = new Date();
    this._updatedAt = new Date();
  }

  toPrimitives(): PasswordCredentialPrimitives {
    return {
      userId: this._userId.toString(),
      passwordHash: this._passwordHash,
      passwordVersion: this._passwordVersion,
      lastPasswordChangeAt: this._lastPasswordChangeAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
