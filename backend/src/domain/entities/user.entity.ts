import { UserId } from '../value-objects/user-id.vo';

export interface UserPrimitives {
  id: string;
  username: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(
    private readonly _id: UserId,
    private _username: string,
    private _email?: string,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date()
  ) {}

  static create(username: string, email?: string): User {
    const id = UserId.generate();
    return new User(id, username, email);
  }

  static fromPrimitives(primitives: UserPrimitives): User {
    return new User(
      UserId.fromString(primitives.id),
      primitives.username,
      primitives.email,
      primitives.createdAt,
      primitives.updatedAt
    );
  }

  get id(): UserId { return this._id; }
  get username(): string { return this._username; }
  get email(): string | undefined { return this._email; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  updateUsername(newUsername: string): void {
    if (!newUsername || newUsername.trim().length === 0) {
      throw new Error('Username cannot be empty');
    }
    this._username = newUsername;
    this._updatedAt = new Date();
  }

  updateEmail(newEmail: string): void {
    this._email = newEmail;
    this._updatedAt = new Date();
  }

  toPrimitives(): UserPrimitives {
    return {
      id: this._id.toString(),
      username: this._username,
      email: this._email,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}
