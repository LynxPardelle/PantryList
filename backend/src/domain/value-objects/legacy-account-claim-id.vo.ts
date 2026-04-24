import { randomUUID } from 'crypto';

export class LegacyAccountClaimId {
  constructor(private readonly value: string) {
    if (!value?.trim()) {
      throw new Error('LegacyAccountClaimId cannot be empty');
    }
  }

  static generate(): LegacyAccountClaimId {
    return new LegacyAccountClaimId(randomUUID());
  }

  static fromString(value: string): LegacyAccountClaimId {
    return new LegacyAccountClaimId(value);
  }

  toString(): string {
    return this.value;
  }
}
