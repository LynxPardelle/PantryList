import { randomUUID } from 'crypto';

export class InventoryLotId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('InventoryLotId cannot be empty');
    }
  }

  static generate(): InventoryLotId {
    return new InventoryLotId(randomUUID());
  }

  static fromString(id: string): InventoryLotId {
    return new InventoryLotId(id);
  }

  toString(): string {
    return this.value;
  }
}
