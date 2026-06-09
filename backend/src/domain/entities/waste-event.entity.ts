import { randomUUID } from 'node:crypto';
import { QuantityUnit } from '../enums';
import { InventoryLotId } from '../value-objects/inventory-lot-id.vo';
import { ProductTypeId } from '../value-objects/product-type-id.vo';
import { UserId } from '../value-objects/user-id.vo';

export const WASTE_REASONS = [
  'expired',
  'spoiled',
  'not_used',
  'overbought',
  'other',
] as const;

export type WasteReason = (typeof WASTE_REASONS)[number];

export interface WasteEventPrimitives {
  id: string;
  userId: string;
  productTypeId: string;
  inventoryLotId?: string;
  productName: string;
  quantity: number;
  unit: QuantityUnit;
  reason: WasteReason;
  note?: string;
  estimatedLoss?: number;
  occurredAt: Date;
  createdAt: Date;
}

export class WasteEvent {
  private constructor(
    private readonly _id: string,
    private readonly _userId: UserId,
    private readonly _productTypeId: ProductTypeId,
    private readonly _inventoryLotId: InventoryLotId | undefined,
    private readonly _productName: string,
    private readonly _quantity: number,
    private readonly _unit: QuantityUnit,
    private readonly _reason: WasteReason,
    private readonly _note: string | undefined,
    private readonly _estimatedLoss: number | undefined,
    private readonly _occurredAt: Date,
    private readonly _createdAt: Date,
  ) {}

  static create(input: {
    userId: UserId;
    productTypeId: ProductTypeId;
    inventoryLotId?: InventoryLotId;
    productName: string;
    quantity: number;
    unit: QuantityUnit;
    reason: WasteReason;
    note?: string;
    estimatedLoss?: number;
    now?: Date;
  }): WasteEvent {
    const now = input.now ?? new Date();

    return new WasteEvent(
      `waste_${randomUUID()}`,
      input.userId,
      input.productTypeId,
      input.inventoryLotId,
      normalizeLimitedText(input.productName, 120, 'Product name is required'),
      normalizeQuantity(input.quantity),
      input.unit,
      normalizeReason(input.reason),
      normalizeOptionalLimitedText(input.note, 160),
      normalizeOptionalMoney(input.estimatedLoss),
      now,
      now,
    );
  }

  static fromPrimitives(primitives: WasteEventPrimitives): WasteEvent {
    return new WasteEvent(
      normalizeId(primitives.id),
      UserId.fromString(primitives.userId),
      ProductTypeId.fromString(primitives.productTypeId),
      primitives.inventoryLotId
        ? InventoryLotId.fromString(primitives.inventoryLotId)
        : undefined,
      normalizeLimitedText(
        primitives.productName,
        120,
        'Product name is required',
      ),
      normalizeQuantity(primitives.quantity),
      primitives.unit,
      normalizeReason(primitives.reason),
      normalizeOptionalLimitedText(primitives.note, 160),
      normalizeOptionalMoney(primitives.estimatedLoss),
      new Date(primitives.occurredAt),
      new Date(primitives.createdAt),
    );
  }

  get userId(): UserId {
    return this._userId;
  }

  get occurredAt(): Date {
    return new Date(this._occurredAt);
  }

  toPrimitives(): WasteEventPrimitives {
    return {
      id: this._id,
      userId: this._userId.toString(),
      productTypeId: this._productTypeId.toString(),
      inventoryLotId: this._inventoryLotId?.toString(),
      productName: this._productName,
      quantity: this._quantity,
      unit: this._unit,
      reason: this._reason,
      note: this._note,
      estimatedLoss: this._estimatedLoss,
      occurredAt: new Date(this._occurredAt),
      createdAt: new Date(this._createdAt),
    };
  }
}

function normalizeId(id: string): string {
  const normalized = id.trim();

  if (!normalized) {
    throw new Error('Waste event id is required');
  }

  return normalized;
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Waste quantity must be greater than zero');
  }

  return Number(quantity.toFixed(2));
}

function normalizeReason(reason: WasteReason): WasteReason {
  if (!WASTE_REASONS.includes(reason)) {
    throw new Error('Unsupported waste reason');
  }

  return reason;
}

function normalizeLimitedText(
  value: string,
  maxLength: number,
  message: string,
): string {
  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) {
    throw new Error(message);
  }

  return normalized;
}

function normalizeOptionalLimitedText(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length > maxLength) {
    throw new Error(`Text must be ${maxLength} characters or fewer`);
  }

  return normalized;
}

function normalizeOptionalMoney(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Number(value.toFixed(2));
}
