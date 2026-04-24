import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  DepletionRulePrimitives,
  ProductType,
  ProductTypePrimitives,
} from '../../../domain/entities/product-type.entity';
import { ProductTypeRepository } from '../../../domain/repositories/product-type.repository';
import { ProductTypeId } from '../../../domain/value-objects/product-type-id.vo';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { ProductTypeDocument } from './schemas/product-type.schema';

type PersistedDepletionRule = Omit<DepletionRulePrimitives, 'everyPeriod'> & {
  everyPeriod: string;
};

type PersistedProductType = Omit<
  ProductTypePrimitives,
  'defaultDepletionRule'
> & {
  normalizedBaseName: string;
  defaultDepletionRule?: PersistedDepletionRule;
};

@Injectable()
export class MongoProductTypeRepository implements ProductTypeRepository {
  constructor(
    @InjectModel(ProductTypeDocument.name)
    private readonly productTypeModel: Model<ProductTypeDocument>,
  ) {}

  async save(productType: ProductType): Promise<ProductType> {
    const primitives = productType.toPrimitives();
    const normalizedBaseName = normalizeBaseName(primitives.baseName);
    const savedProductType = await this.productTypeModel
      .findOneAndUpdate(
        {
          userId: primitives.userId,
          normalizedBaseName,
        },
        {
          $setOnInsert: {
            id: primitives.id,
            userId: primitives.userId,
            createdAt: primitives.createdAt,
          },
          $set: {
            baseName: primitives.baseName,
            category: primitives.category,
            defaultUnit: primitives.defaultUnit,
            defaultDepletionRule: primitives.defaultDepletionRule,
            updatedAt: primitives.updatedAt,
            normalizedBaseName,
          },
        },
        {
          new: true,
          upsert: true,
        },
      )
      .lean()
      .exec();

    return this.toDomain(savedProductType);
  }

  async findById(id: ProductTypeId): Promise<ProductType | null> {
    const productType = await this.productTypeModel
      .findOne({ id: id.toString() })
      .lean()
      .exec();

    return productType ? this.toDomain(productType) : null;
  }

  async findByUserId(userId: UserId): Promise<ProductType[]> {
    const productTypes = await this.productTypeModel
      .find({ userId: userId.toString() })
      .sort({ baseName: 1 })
      .lean()
      .exec();

    return productTypes.map((productType) =>
      this.toDomain(productType as PersistedProductType),
    );
  }

  async searchByUserId(
    userId: UserId,
    search?: string,
  ): Promise<ProductType[]> {
    const normalizedSearch = search ? normalizeBaseName(search) : undefined;
    const query = normalizedSearch
      ? {
          userId: userId.toString(),
          normalizedBaseName: { $regex: escapeRegExp(normalizedSearch) },
        }
      : { userId: userId.toString() };

    const productTypes = await this.productTypeModel
      .find(query)
      .sort({ baseName: 1 })
      .lean()
      .exec();

    return productTypes.map((productType) =>
      this.toDomain(productType as PersistedProductType),
    );
  }

  async findByBaseName(
    userId: UserId,
    baseName: string,
  ): Promise<ProductType | null> {
    const productType = await this.productTypeModel
      .findOne({
        userId: userId.toString(),
        normalizedBaseName: normalizeBaseName(baseName),
      })
      .lean()
      .exec();

    return productType ? this.toDomain(productType) : null;
  }

  async reassignUserOwnership(
    fromUserId: UserId,
    toUserId: UserId,
  ): Promise<number> {
    const result = await this.productTypeModel
      .updateMany(
        { userId: fromUserId.toString() },
        { $set: { userId: toUserId.toString(), updatedAt: new Date() } },
      )
      .exec();

    return result.modifiedCount;
  }

  private toDomain(productType: PersistedProductType): ProductType {
    return ProductType.fromPrimitives({
      id: productType.id,
      userId: productType.userId,
      baseName: productType.baseName,
      category: productType.category,
      defaultUnit: productType.defaultUnit,
      defaultDepletionRule: productType.defaultDepletionRule
        ? {
            ...productType.defaultDepletionRule,
            everyPeriod: toDepletionPeriod(
              productType.defaultDepletionRule.everyPeriod,
            ),
            anchorDate: new Date(productType.defaultDepletionRule.anchorDate),
          }
        : undefined,
      createdAt: new Date(productType.createdAt),
      updatedAt: new Date(productType.updatedAt),
    });
  }
}

function normalizeBaseName(value: string): string {
  return value.trim().toLocaleLowerCase('es');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toDepletionPeriod(
  value: string,
): DepletionRulePrimitives['everyPeriod'] {
  if (value === 'day' || value === 'week' || value === 'month') {
    return value;
  }

  throw new Error(`Unsupported persisted depletion interval period: ${value}`);
}
