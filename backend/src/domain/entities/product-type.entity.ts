import { ProductCategory, QuantityUnit } from '../enums';
import { ProductTypeId } from '../value-objects/product-type-id.vo';
import { UserId } from '../value-objects/user-id.vo';

export interface ProductTypePrimitives {
  id: string;
  userId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: QuantityUnit;
  defaultDepletionRule?: DepletionRulePrimitives;
  createdAt: Date;
  updatedAt: Date;
}

export type DepletionPeriod = 'day' | 'week' | 'month';

export interface DepletionRulePrimitives {
  enabled: boolean;
  consumeAmount: number;
  unit: QuantityUnit;
  everyAmount: number;
  everyPeriod: DepletionPeriod;
  anchorDate: Date;
}

export class ProductType {
  private constructor(
    private readonly _id: ProductTypeId,
    private readonly _userId: UserId,
    private _baseName: string,
    private _category: ProductCategory,
    private _defaultUnit: QuantityUnit,
    private _defaultDepletionRule: DepletionRulePrimitives | undefined,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
  ) {}

  static create(
    userId: UserId,
    baseName: string,
    category: ProductCategory,
    defaultUnit: QuantityUnit,
    defaultDepletionRule?: DepletionRulePrimitives,
  ): ProductType {
    const normalizedBaseName = baseName.trim();

    if (!normalizedBaseName) {
      throw new Error('Base name cannot be empty');
    }

    return new ProductType(
      ProductTypeId.generate(),
      userId,
      normalizedBaseName,
      category,
      defaultUnit,
      normalizeDefaultDepletionRule(defaultDepletionRule, defaultUnit),
    );
  }

  static fromPrimitives(primitives: ProductTypePrimitives): ProductType {
    return new ProductType(
      ProductTypeId.fromString(primitives.id),
      UserId.fromString(primitives.userId),
      primitives.baseName,
      primitives.category,
      primitives.defaultUnit,
      normalizeDefaultDepletionRule(
        primitives.defaultDepletionRule,
        primitives.defaultUnit,
      ),
      primitives.createdAt,
      primitives.updatedAt,
    );
  }

  get id(): ProductTypeId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get baseName(): string {
    return this._baseName;
  }

  get category(): ProductCategory {
    return this._category;
  }

  get defaultUnit(): QuantityUnit {
    return this._defaultUnit;
  }

  get defaultDepletionRule(): DepletionRulePrimitives | undefined {
    return cloneDefaultDepletionRule(this._defaultDepletionRule);
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateDefaultDepletionRule(
    defaultDepletionRule?: DepletionRulePrimitives,
  ): void {
    this._defaultDepletionRule = normalizeDefaultDepletionRule(
      defaultDepletionRule,
      this._defaultUnit,
    );
    this._updatedAt = new Date();
  }

  toPrimitives(): ProductTypePrimitives {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      baseName: this._baseName,
      category: this._category,
      defaultUnit: this._defaultUnit,
      defaultDepletionRule: cloneDefaultDepletionRule(
        this._defaultDepletionRule,
      ),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

function normalizeDefaultDepletionRule(
  rule: DepletionRulePrimitives | undefined,
  defaultUnit: QuantityUnit,
): DepletionRulePrimitives | undefined {
  if (!rule) {
    return undefined;
  }

  if (rule.consumeAmount <= 0) {
    throw new Error('Depletion consume amount must be greater than zero');
  }

  if (rule.everyAmount <= 0) {
    throw new Error('Depletion interval amount must be greater than zero');
  }

  if (rule.unit !== defaultUnit) {
    throw new Error('Depletion rule unit must match product type default unit');
  }

  if (!['day', 'week', 'month'].includes(rule.everyPeriod)) {
    throw new Error('Unsupported depletion interval period');
  }

  return {
    ...rule,
    anchorDate: new Date(rule.anchorDate),
  };
}

function cloneDefaultDepletionRule(
  rule: DepletionRulePrimitives | undefined,
): DepletionRulePrimitives | undefined {
  if (!rule) {
    return undefined;
  }

  return {
    ...rule,
    anchorDate: new Date(rule.anchorDate),
  };
}
