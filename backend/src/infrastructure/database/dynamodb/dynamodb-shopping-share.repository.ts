import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  ShoppingShare,
  ShoppingSharePrimitives,
} from '../../../domain/entities/shopping-share.entity';
import { ShoppingShareRepository } from '../../../domain/repositories/shopping-share.repository';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { DynamoDbDocumentClientService } from './dynamodb-document-client.service';

type ShoppingShareItem = Omit<
  ShoppingSharePrimitives,
  'createdAt' | 'expiresAt' | 'revokedAt' | 'updatedAt'
> & {
  pk: string;
  entityType: 'SHOPPING_SHARE';
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  updatedAt: string;
};

@Injectable()
export class DynamoDbShoppingShareRepository implements ShoppingShareRepository {
  private readonly tableName: string;

  constructor(
    private readonly dynamoDb: DynamoDbDocumentClientService,
    configService: ConfigService,
  ) {
    this.tableName = configService.getOrThrow<string>('DYNAMODB_USERS_TABLE');
  }

  async save(share: ShoppingShare): Promise<ShoppingShare> {
    const item = this.toItem(share.toPrimitives());

    await this.dynamoDb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );

    return this.toDomain(item);
  }

  async findByTokenHash(tokenHash: string): Promise<ShoppingShare | null> {
    const result = await this.dynamoDb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: shoppingShareKey(tokenHash),
        },
      }),
    );

    return result.Item ? this.toDomain(result.Item as ShoppingShareItem) : null;
  }

  async deleteByOwnerUserId(userId: UserId): Promise<number> {
    const items: ShoppingShareItem[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const result = await this.dynamoDb.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression:
            'entityType = :entityType AND ownerUserId = :ownerUserId',
          ExpressionAttributeValues: {
            ':entityType': 'SHOPPING_SHARE',
            ':ownerUserId': userId.toString(),
          },
          ...(exclusiveStartKey
            ? { ExclusiveStartKey: exclusiveStartKey }
            : {}),
        }),
      );

      items.push(...((result.Items ?? []) as ShoppingShareItem[]));
      exclusiveStartKey = result.LastEvaluatedKey as
        | Record<string, unknown>
        | undefined;
    } while (exclusiveStartKey);

    await Promise.all(
      items.map((item) =>
        this.dynamoDb.send(
          new DeleteCommand({
            TableName: this.tableName,
            Key: { pk: item.pk },
          }),
        ),
      ),
    );

    return items.length;
  }

  private toItem(primitives: ShoppingSharePrimitives): ShoppingShareItem {
    return {
      pk: shoppingShareKey(primitives.tokenHash),
      entityType: 'SHOPPING_SHARE',
      id: primitives.id,
      ownerUserId: primitives.ownerUserId,
      tokenHash: primitives.tokenHash,
      text: primitives.text,
      createdAt: primitives.createdAt.toISOString(),
      expiresAt: primitives.expiresAt.toISOString(),
      revokedAt: primitives.revokedAt?.toISOString(),
      updatedAt: primitives.updatedAt.toISOString(),
    };
  }

  private toDomain(item: ShoppingShareItem): ShoppingShare {
    return ShoppingShare.fromPrimitives({
      id: item.id,
      ownerUserId: item.ownerUserId,
      tokenHash: item.tokenHash,
      text: item.text,
      createdAt: new Date(item.createdAt),
      expiresAt: new Date(item.expiresAt),
      revokedAt: item.revokedAt ? new Date(item.revokedAt) : undefined,
      updatedAt: new Date(item.updatedAt),
    });
  }
}

function shoppingShareKey(tokenHash: string): string {
  return `SHOPPING_SHARE#${tokenHash}`;
}
