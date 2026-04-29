import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { UserDao } from '../../../application/ports/daos';
import { User, UserPrimitives } from '../../../domain/entities/user.entity';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { DynamoDbDocumentClientService } from './dynamodb-document-client.service';

type UserItem = Omit<UserPrimitives, 'createdAt' | 'updatedAt'> & {
  pk: string;
  entityType: 'USER';
  normalizedEmail: string;
  normalizedUsername: string;
  createdAt: string;
  updatedAt: string;
};

type UserLookupItem = {
  pk: string;
  entityType: 'USER_LOOKUP';
  userId: string;
};

@Injectable()
export class DynamoDbUserDao implements UserDao {
  private readonly tableName: string;

  constructor(
    private readonly dynamoDb: DynamoDbDocumentClientService,
    configService: ConfigService,
  ) {
    this.tableName = configService.getOrThrow<string>('DYNAMODB_USERS_TABLE');
  }

  async save(user: User): Promise<User> {
    const primitives = user.toPrimitives();
    const existingUser = await this.findById(UserId.fromString(primitives.id));
    const existingPrimitives = existingUser?.toPrimitives();
    const normalizedEmail = normalizeEmail(primitives.email);
    const normalizedUsername = normalizeUsername(primitives.username);
    const userItem = this.toUserItem(primitives);
    const lookupItems = [
      this.toLookupItem(emailKey(normalizedEmail), primitives.id),
      this.toLookupItem(usernameKey(normalizedUsername), primitives.id),
      ...normalizeAuthSubjectIds(primitives.authSubjectIds ?? []).map(
        (authSubjectId) =>
          this.toLookupItem(authSubjectKey(authSubjectId), primitives.id),
      ),
    ];
    const staleLookupKeys = this.getStaleLookupKeys(
      existingPrimitives,
      primitives,
    );

    await this.dynamoDb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.tableName,
              Item: userItem,
            },
          },
          ...lookupItems.map((item) => ({
            Put: {
              TableName: this.tableName,
              Item: item,
              ConditionExpression:
                'attribute_not_exists(pk) OR userId = :userId',
              ExpressionAttributeValues: {
                ':userId': primitives.id,
              },
            },
          })),
          ...staleLookupKeys.map((key) => ({
            Delete: {
              TableName: this.tableName,
              Key: { pk: key },
            },
          })),
        ],
      }),
    );

    return this.toDomain(userItem);
  }

  async findById(id: UserId): Promise<User | null> {
    const result = await this.dynamoDb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: userKey(id.toString()),
        },
      }),
    );

    return result.Item ? this.toDomain(result.Item as UserItem) : null;
  }

  async findByAuthSubject(authSubjectId: string): Promise<User | null> {
    return this.findByLookup(
      authSubjectKey(normalizeAuthSubjectId(authSubjectId)),
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findByLookup(emailKey(normalizeEmail(email)));
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findByLookup(usernameKey(normalizeUsername(username)));
  }

  async delete(id: UserId): Promise<void> {
    const user = await this.findById(id);
    const primitives = user?.toPrimitives();

    if (!primitives) {
      return;
    }

    const lookupKeys = this.getLookupKeys(primitives);

    await this.dynamoDb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: this.tableName,
              Key: { pk: userKey(id.toString()) },
            },
          },
          ...lookupKeys.map((key) => ({
            Delete: {
              TableName: this.tableName,
              Key: { pk: key },
            },
          })),
        ],
      }),
    );
  }

  private async findByLookup(lookupPk: string): Promise<User | null> {
    const lookupResult = await this.dynamoDb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: lookupPk },
      }),
    );
    const lookup = lookupResult.Item as UserLookupItem | undefined;

    if (!lookup?.userId) {
      return null;
    }

    return this.findById(UserId.fromString(lookup.userId));
  }

  private toUserItem(primitives: UserPrimitives): UserItem {
    return {
      pk: userKey(primitives.id),
      entityType: 'USER',
      id: primitives.id,
      email: primitives.email,
      username: primitives.username,
      authSubjectIds: normalizeAuthSubjectIds(primitives.authSubjectIds ?? []),
      status: primitives.status,
      normalizedEmail: normalizeEmail(primitives.email),
      normalizedUsername: normalizeUsername(primitives.username),
      createdAt: primitives.createdAt.toISOString(),
      updatedAt: primitives.updatedAt.toISOString(),
    };
  }

  private toLookupItem(pk: string, userId: string): UserLookupItem {
    return {
      pk,
      entityType: 'USER_LOOKUP',
      userId,
    };
  }

  private toDomain(item: UserItem): User {
    return User.fromPrimitives({
      id: item.id,
      email: item.email,
      username: item.username,
      authSubjectIds: item.authSubjectIds ?? [],
      status: item.status,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    });
  }

  private getLookupKeys(primitives: UserPrimitives): string[] {
    return [
      emailKey(normalizeEmail(primitives.email)),
      usernameKey(normalizeUsername(primitives.username)),
      ...normalizeAuthSubjectIds(primitives.authSubjectIds ?? []).map(
        authSubjectKey,
      ),
    ];
  }

  private getStaleLookupKeys(
    existing: UserPrimitives | undefined,
    next: UserPrimitives,
  ): string[] {
    if (!existing) {
      return [];
    }

    const nextKeys = new Set(this.getLookupKeys(next));

    return this.getLookupKeys(existing).filter((key) => !nextKeys.has(key));
  }
}

function userKey(id: string): string {
  return `USER#${id}`;
}

function emailKey(email: string): string {
  return `EMAIL#${email}`;
}

function usernameKey(username: string): string {
  return `USERNAME#${username}`;
}

function authSubjectKey(authSubjectId: string): string {
  return `AUTH#${authSubjectId}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase('en-US');
}

function normalizeUsername(username: string): string {
  return username.trim().toLocaleLowerCase('es');
}

function normalizeAuthSubjectId(authSubjectId: string): string {
  return authSubjectId.trim();
}

function normalizeAuthSubjectIds(authSubjectIds: string[]): string[] {
  return [...new Set(authSubjectIds.map(normalizeAuthSubjectId))];
}
