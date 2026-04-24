import { ProductCategory, QuantityUnit } from '../enums';
import { ProductTypeId } from '../value-objects/product-type-id.vo';
import { UserId } from '../value-objects/user-id.vo';

export interface ProductTypePrimitives {
  id: string;
  userId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: QuantityUnit;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductType {
  private constructor(
    private readonly _id: ProductTypeId,
    private readonly _userId: UserId,
    private _baseName: string,
    private _category: ProductCategory,
    private _defaultUnit: QuantityUnit,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
  ) {}

  static create(
    userId: UserId,
    baseName: string,
    category: ProductCategory,
    defaultUnit: QuantityUnit,
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
    );
  }

  static fromPrimitives(primitives: ProductTypePrimitives): ProductType {
    return new ProductType(
      ProductTypeId.fromString(primitives.id),
      UserId.fromString(primitives.userId),
      primitives.baseName,
      primitives.category,
      primitives.defaultUnit,
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

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  toPrimitives(): ProductTypePrimitives {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      baseName: this._baseName,
      category: this._category,
      defaultUnit: this._defaultUnit,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
