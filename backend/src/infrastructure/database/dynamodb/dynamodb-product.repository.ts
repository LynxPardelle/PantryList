import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
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
import { DynamoDbDocumentClientService } from './dynamodb-document-client.service';

type ProductItem = Omit<
  ProductPrimitives,
  'nextPurchaseDate' | 'createdAt' | 'updatedAt'
> & {
  entityType: 'PRODUCT';
  nextPurchaseDate?: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class DynamoDbProductRepository implements ProductRepository {
  private readonly tableName: string;

  constructor(
    private readonly dynamoDb: DynamoDbDocumentClientService,
    configService: ConfigService,
  ) {
    this.tableName = configService.getOrThrow<string>(
      'DYNAMODB_PRODUCTS_TABLE',
    );
  }

  async save(product: Product): Promise<Product> {
    const item = this.toItem(product.toPrimitives());

    await this.dynamoDb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );

    return this.toDomain(item);
  }

  async findById(id: ProductId): Promise<Product | null> {
    const result = await this.dynamoDb.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': id.toString(),
        },
        Limit: 1,
      }),
    );
    const item = result.Items?.[0] as ProductItem | undefined;

    return item ? this.toDomain(item) : null;
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
    const products = await this.findByUserId(fromUserId);

    await Promise.all(
      products.map((product) =>
        this.dynamoDb.send(
          new PutCommand({
            TableName: this.tableName,
            Item: this.toItem({
              ...product.toPrimitives(),
              userId: toUserId.toString(),
              updatedAt: new Date(),
            }),
          }),
        ),
      ),
    );

    return products.length;
  }

  async delete(id: ProductId): Promise<void> {
    await this.dynamoDb.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          id: id.toString(),
        },
      }),
    );
  }

  async findAll(filter?: ProductFilter): Promise<Product[]> {
    if (filter?.userId && !filter.category && !filter.status) {
      return this.findAllByUserId(UserId.fromString(filter.userId));
    }

    const result = await this.dynamoDb.send(
      new ScanCommand({
        TableName: this.tableName,
      }),
    );

    return (result.Items ?? [])
      .map((item) => this.toDomain(item as ProductItem))
      .filter((product) => matchesFilter(product, filter))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  private async findAllByUserId(userId: UserId): Promise<Product[]> {
    const result = await this.dynamoDb.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserUpdatedAtIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId.toString(),
        },
        ScanIndexForward: false,
      }),
    );

    return (result.Items ?? []).map((item) =>
      this.toDomain(item as ProductItem),
    );
  }

  private toItem(primitives: ProductPrimitives): ProductItem {
    return {
      entityType: 'PRODUCT',
      id: primitives.id,
      userId: primitives.userId,
      title: primitives.title,
      currentQuantity: primitives.currentQuantity,
      unit: primitives.unit,
      usageRate: primitives.usageRate,
      category: primitives.category,
      status: primitives.status,
      nextPurchaseDate: primitives.nextPurchaseDate?.toISOString(),
      createdAt: primitives.createdAt.toISOString(),
      updatedAt: primitives.updatedAt.toISOString(),
    };
  }

  private toDomain(item: ProductItem): Product {
    return Product.fromPrimitives({
      id: item.id,
      userId: item.userId,
      title: item.title,
      currentQuantity: item.currentQuantity,
      unit: item.unit,
      usageRate: item.usageRate,
      category: item.category,
      status: item.status,
      nextPurchaseDate: item.nextPurchaseDate
        ? new Date(item.nextPurchaseDate)
        : undefined,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    });
  }
}

function matchesFilter(product: Product, filter?: ProductFilter): boolean {
  if (!filter) {
    return true;
  }

  if (filter.userId && product.userId.toString() !== filter.userId) {
    return false;
  }

  if (filter.category && product.category !== filter.category) {
    return false;
  }

  if (filter.status && product.status !== filter.status) {
    return false;
  }

  return true;
}
