import { UserAccountStatus } from '../enums';
import { UserId } from '../value-objects/user-id.vo';

export interface UserPrimitives {
  id: string;
  email: string;
  username: string;
  status: UserAccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(
    private readonly _id: UserId,
    private _email: string,
    private _username: string,
    private _status: UserAccountStatus,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
  ) {}

  static create(email: string, username: string): User {
    const id = UserId.generate();
    return new User(
      id,
      normalizeEmail(email),
      normalizeUsername(username),
      UserAccountStatus.ACTIVE,
    );
  }

  static fromPrimitives(primitives: UserPrimitives): User {
    return new User(
      UserId.fromString(primitives.id),
      primitives.email,
      primitives.username,
      primitives.status,
      primitives.createdAt,
      primitives.updatedAt,
    );
  }

  get id(): UserId {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get username(): string {
    return this._username;
  }

  get status(): UserAccountStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateUsername(newUsername: string): void {
    this._username = normalizeUsername(newUsername);
    this._updatedAt = new Date();
  }

  updateEmail(newEmail: string): void {
    this._email = normalizeEmail(newEmail);
    this._updatedAt = new Date();
  }

  disable(): void {
    this._status = UserAccountStatus.DISABLED;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._status = UserAccountStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  toPrimitives(): UserPrimitives {
    return {
      id: this._id.toString(),
      email: this._email,
      username: this._username,
      status: this._status,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

function normalizeEmail(email: string): string {
  const normalizedEmail = email.trim().toLocaleLowerCase('en-US');

  if (!normalizedEmail) {
    throw new Error('Email cannot be empty');
  }

  return normalizedEmail;
}

function normalizeUsername(username: string): string {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    throw new Error('Username cannot be empty');
  }

  return normalizedUsername;
}
