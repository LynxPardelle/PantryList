import { randomUUID } from 'crypto';

export class PasswordResetTokenId {
  constructor(private readonly value: string) {
    if (!value?.trim()) {
      throw new Error('PasswordResetTokenId cannot be empty');
    }
  }

  static generate(): PasswordResetTokenId {
    return new PasswordResetTokenId(randomUUID());
  }

  static fromString(value: string): PasswordResetTokenId {
    return new PasswordResetTokenId(value);
  }

  toString(): string {
    return this.value;
  }
}
