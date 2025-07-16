import { randomUUID } from 'crypto';

export class ProductId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ProductId cannot be empty');
    }
  }

  static generate(): ProductId {
    return new ProductId(randomUUID());
  }

  static fromString(id: string): ProductId {
    return new ProductId(id);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ProductId): boolean {
    return this.value === other.value;
  }
}
