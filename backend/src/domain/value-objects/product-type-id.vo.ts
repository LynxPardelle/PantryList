import { randomUUID } from 'crypto';

export class ProductTypeId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ProductTypeId cannot be empty');
    }
  }

  static generate(): ProductTypeId {
    return new ProductTypeId(randomUUID());
  }

  static fromString(id: string): ProductTypeId {
    return new ProductTypeId(id);
  }

  toString(): string {
    return this.value;
  }
}
