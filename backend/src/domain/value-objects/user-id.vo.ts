import { randomUUID } from 'crypto';

export class UserId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('UserId cannot be empty');
    }
  }

  static generate(): UserId {
    return new UserId(randomUUID());
  }

  static fromString(id: string): UserId {
    return new UserId(id);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}
