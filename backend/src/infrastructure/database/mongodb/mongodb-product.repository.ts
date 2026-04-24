import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import {
  Product,
  ProductPrimitives,
} from '../../../domain/entities/product.entity';
import { ProductCategory, ProductStatus } from '../../../domain/enums';
import {
  ProductFilter,
  ProductRepository,
} from '../../../domain/repositories/product.repository';
import { ProductId } from '../../../domain/value-objects/product-id.vo';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { ProductDocument } from './schemas/product.schema';

type PersistedProduct = Omit<ProductPrimitives, 'nextPurchaseDate'> & {
  nextPurchaseDate?: Date | null;
};

@Injectable()
export class MongoProductRepository implements ProductRepository {
  constructor(
    @InjectModel(ProductDocument.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async save(product: Product): Promise<Product> {
    const primitives = product.toPrimitives();
    const savedProduct = await this.productModel
      .findOneAndUpdate({ id: primitives.id }, primitives, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toDomain(savedProduct);
  }

  async findById(id: ProductId): Promise<Product | null> {
    const product = await this.productModel
      .findOne({ id: id.toString() })
      .lean()
      .exec();

    return product ? this.toDomain(product) : null;
  }

  async findByUserId(userId: UserId): Promise<Product[]> {
    return this.findAll({ userId: userId.toString() });
  }

  async findByCategory(category: ProductCategory): Promise<Product[]> {
    return this.findAll({ category });
  }

  async findByStatus(status: ProductStatus): Promise<Product[]> {
    return this.findAll({ status });
  }

  async reassignUserOwnership(
    fromUserId: UserId,
    toUserId: UserId,
  ): Promise<number> {
    const result = await this.productModel
      .updateMany(
        { userId: fromUserId.toString() },
        { $set: { userId: toUserId.toString(), updatedAt: new Date() } },
      )
      .exec();

    return result.modifiedCount;
  }

  async delete(id: ProductId): Promise<void> {
    await this.productModel.deleteOne({ id: id.toString() }).exec();
  }

  async findAll(filter?: ProductFilter): Promise<Product[]> {
    const query: FilterQuery<ProductDocument> = {};

    if (filter?.userId) {
      query.userId = filter.userId;
    }

    if (filter?.category) {
      query.category = filter.category;
    }

    if (filter?.status) {
      query.status = filter.status;
    }

    const products = await this.productModel
      .find(query)
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    return products.map((product) =>
      this.toDomain(product as PersistedProduct),
    );
  }

  private toDomain(product: PersistedProduct): Product {
    return Product.fromPrimitives({
      ...product,
      nextPurchaseDate: product.nextPurchaseDate ?? undefined,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
    });
  }
}
