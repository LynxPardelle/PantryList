import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  DepletionRulePrimitives,
  ProductType,
  ProductTypePlanningSettingsPrimitives,
  ProductTypePrimitives,
} from '../../../domain/entities/product-type.entity';
import { ProductTypeRepository } from '../../../domain/repositories/product-type.repository';
import { ProductTypeId } from '../../../domain/value-objects/product-type-id.vo';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { DynamoDbDocumentClientService } from './dynamodb-document-client.service';

type ProductTypeItem = Omit<
  ProductTypePrimitives,
  'defaultDepletionRule' | 'archivedAt' | 'createdAt' | 'updatedAt'
> & {
  entityType: 'PRODUCT_TYPE';
  normalizedBaseName: string;
  defaultDepletionRule?: PersistedDepletionRule;
  planningSettings?: ProductTypePlanningSettingsPrimitives;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type PersistedDepletionRule = Omit<DepletionRulePrimitives, 'anchorDate'> & {
  anchorDate: string;
};

@Injectable()
export class DynamoDbProductTypeRepository implements ProductTypeRepository {
  private readonly tableName: string;

  constructor(
    private readonly dynamoDb: DynamoDbDocumentClientService,
    configService: ConfigService,
  ) {
    this.tableName = configService.getOrThrow<string>(
      'DYNAMODB_PRODUCT_TYPES_TABLE',
    );
  }

  async save(productType: ProductType): Promise<ProductType> {
    const primitives = productType.toPrimitives();
    const existing = await this.findByUserBaseName(
      UserId.fromString(primitives.userId),
      primitives.baseName,
    );
    const existingPrimitives = existing?.toPrimitives();
    const item = this.toItem({
      ...primitives,
      id: existingPrimitives?.id ?? primitives.id,
      createdAt: existingPrimitives?.createdAt ?? primitives.createdAt,
    });

    await this.dynamoDb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );

    return this.toDomain(item);
  }

  async findById(id: ProductTypeId): Promise<ProductType | null> {
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
    const item = result.Items?.[0] as ProductTypeItem | undefined;

    return item ? this.toDomain(item) : null;
  }

  async findByUserId(userId: UserId): Promise<ProductType[]> {
    const productTypes = await this.findAllByUserId(userId);

    return productTypes
      .filter((productType) => !productType.archivedAt)
      .sort((a, b) => a.baseName.localeCompare(b.baseName, 'es'));
  }

  async findArchivedByUserId(userId: UserId): Promise<ProductType[]> {
    const productTypes = await this.findAllByUserId(userId);

    return productTypes
      .filter((productType) => Boolean(productType.archivedAt))
      .sort(
        (a, b) =>
          (b.archivedAt?.getTime() ?? 0) - (a.archivedAt?.getTime() ?? 0),
      );
  }

  async searchByUserId(
    userId: UserId,
    search?: string,
  ): Promise<ProductType[]> {
    const productTypes = await this.findByUserId(userId);
    const normalizedSearch = search ? normalizeBaseName(search) : undefined;

    if (!normalizedSearch) {
      return productTypes;
    }

    return productTypes.filter((productType) =>
      normalizeBaseName(productType.baseName).includes(normalizedSearch),
    );
  }

  async findByBaseName(
    userId: UserId,
    baseName: string,
  ): Promise<ProductType | null> {
    const productType = await this.findByUserBaseName(userId, baseName);

    return productType && !productType.archivedAt ? productType : null;
  }

  async reassignUserOwnership(
    fromUserId: UserId,
    toUserId: UserId,
  ): Promise<number> {
    const productTypes = await this.findAllByUserId(fromUserId);

    await Promise.all(
      productTypes.map((productType) =>
        this.dynamoDb.send(
          new PutCommand({
            TableName: this.tableName,
            Item: this.toItem({
              ...productType.toPrimitives(),
              userId: toUserId.toString(),
              updatedAt: new Date(),
            }),
          }),
        ),
      ),
    );

    return productTypes.length;
  }

  async delete(id: ProductTypeId): Promise<void> {
    await this.dynamoDb.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          id: id.toString(),
        },
      }),
    );
  }

  private async findAllByUserId(userId: UserId): Promise<ProductType[]> {
    const result = await this.dynamoDb.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserBaseNameIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId.toString(),
        },
      }),
    );

    return (result.Items ?? []).map((item) =>
      this.toDomain(item as ProductTypeItem),
    );
  }

  private async findByUserBaseName(
    userId: UserId,
    baseName: string,
  ): Promise<ProductType | null> {
    const result = await this.dynamoDb.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserBaseNameIndex',
        KeyConditionExpression:
          'userId = :userId AND normalizedBaseName = :normalizedBaseName',
        ExpressionAttributeValues: {
          ':userId': userId.toString(),
          ':normalizedBaseName': normalizeBaseName(baseName),
        },
        Limit: 1,
      }),
    );
    const item = result.Items?.[0] as ProductTypeItem | undefined;

    return item ? this.toDomain(item) : null;
  }

  private toItem(primitives: ProductTypePrimitives): ProductTypeItem {
    return {
      entityType: 'PRODUCT_TYPE',
      id: primitives.id,
      userId: primitives.userId,
      baseName: primitives.baseName,
      normalizedBaseName: normalizeBaseName(primitives.baseName),
      category: primitives.category,
      defaultUnit: primitives.defaultUnit,
      defaultDepletionRule: primitives.defaultDepletionRule
        ? {
            ...primitives.defaultDepletionRule,
            anchorDate:
              primitives.defaultDepletionRule.anchorDate.toISOString(),
          }
        : undefined,
      planningSettings: primitives.planningSettings,
      archivedAt: primitives.archivedAt?.toISOString(),
      archivedReason: primitives.archivedReason,
      createdAt: primitives.createdAt.toISOString(),
      updatedAt: primitives.updatedAt.toISOString(),
    };
  }

  private toDomain(item: ProductTypeItem): ProductType {
    return ProductType.fromPrimitives({
      id: item.id,
      userId: item.userId,
      baseName: item.baseName,
      category: item.category,
      defaultUnit: item.defaultUnit,
      defaultDepletionRule: item.defaultDepletionRule
        ? {
            ...item.defaultDepletionRule,
            anchorDate: new Date(item.defaultDepletionRule.anchorDate),
          }
        : undefined,
      planningSettings: item.planningSettings,
      archivedAt: item.archivedAt ? new Date(item.archivedAt) : undefined,
      archivedReason: item.archivedReason,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    });
  }
}

function normalizeBaseName(value: string): string {
  return value.trim().toLocaleLowerCase('es');
}
