import { randomUUID } from 'crypto';

export class RefreshSessionId {
  constructor(private readonly value: string) {
    if (!value?.trim()) {
      throw new Error('RefreshSessionId cannot be empty');
    }
  }

  static generate(): RefreshSessionId {
    return new RefreshSessionId(randomUUID());
  }

  static fromString(value: string): RefreshSessionId {
    return new RefreshSessionId(value);
  }

  toString(): string {
    return this.value;
  }
}
