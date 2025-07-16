import { ProductId } from '../value-objects/product-id.vo';
import { UserId } from '../value-objects/user-id.vo';
import { UsageRate } from '../value-objects/usage-rate.vo';
import { QuantityUnit, ProductCategory, ProductStatus } from '../enums';
import { SchedulingService } from '../services/scheduling.service';

export interface ProductPrimitives {
  id: string;
  userId: string;
  title: string;
  currentQuantity: number;
  unit: QuantityUnit;
  usageRate: {
    amount: number;
    period: string;
  };
  category: ProductCategory;
  status: ProductStatus;
  nextPurchaseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Product {
  private constructor(
    private readonly _id: ProductId,
    private readonly _userId: UserId,
    private _title: string,
    private _currentQuantity: number,
    private _unit: QuantityUnit,
    private _usageRate: UsageRate,
    private _category: ProductCategory,
    private _status: ProductStatus,
    private _nextPurchaseDate?: Date,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date()
  ) {}

  static create(
    userId: UserId,
    title: string,
    currentQuantity: number,
    unit: QuantityUnit,
    usageRate: UsageRate,
    category: ProductCategory
  ): Product {
    const id = ProductId.generate();
    return new Product(
      id,
      userId,
      title,
      currentQuantity,
      unit,
      usageRate,
      category,
      ProductStatus.AVAILABLE
    );
  }

  static fromPrimitives(primitives: ProductPrimitives): Product {
    return new Product(
      ProductId.fromString(primitives.id),
      UserId.fromString(primitives.userId),
      primitives.title,
      primitives.currentQuantity,
      primitives.unit,
      new UsageRate(primitives.usageRate.amount, primitives.usageRate.period as any),
      primitives.category,
      primitives.status,
      primitives.nextPurchaseDate,
      primitives.createdAt,
      primitives.updatedAt
    );
  }

  // Getters
  get id(): ProductId { return this._id; }
  get userId(): UserId { return this._userId; }
  get title(): string { return this._title; }
  get currentQuantity(): number { return this._currentQuantity; }
  get unit(): QuantityUnit { return this._unit; }
  get usageRate(): UsageRate { return this._usageRate; }
  get category(): ProductCategory { return this._category; }
  get status(): ProductStatus { return this._status; }
  get nextPurchaseDate(): Date | undefined { return this._nextPurchaseDate; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // Métodos de dominio
  updateQuantity(newQuantity: number): void {
    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative');
    }
    this._currentQuantity = newQuantity;
    this._updatedAt = new Date();
  }

  calculateNextPurchaseDate(schedulingService: SchedulingService): void {
    this._nextPurchaseDate = schedulingService.calculateNextPurchaseDate(this);
    this._status = schedulingService.updateProductStatus(this);
    this._updatedAt = new Date();
  }

  updateUsageRate(newUsageRate: UsageRate): void {
    this._usageRate = newUsageRate;
    this._updatedAt = new Date();
  }

  updateTitle(newTitle: string): void {
    if (!newTitle || newTitle.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }
    this._title = newTitle;
    this._updatedAt = new Date();
  }

  toPrimitives(): ProductPrimitives {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      title: this._title,
      currentQuantity: this._currentQuantity,
      unit: this._unit,
      usageRate: {
        amount: this._usageRate.Amount,
        period: this._usageRate.Period
      },
      category: this._category,
      status: this._status,
      nextPurchaseDate: this._nextPurchaseDate,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}
