import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UserPreferencesDao } from '../../../application/ports/daos';
import {
  UserPreferences,
  UserPreferencesPatch,
  UserPreferencesPrimitives,
} from '../../../domain/value-objects/user-preferences.vo';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { DynamoDbDocumentClientService } from './dynamodb-document-client.service';

type UserPreferencesProjection = {
  preferences?: Partial<UserPreferencesPrimitives>;
};

@Injectable()
export class DynamoDbUserPreferencesDao implements UserPreferencesDao {
  private readonly tableName: string;

  constructor(
    private readonly dynamoDb: DynamoDbDocumentClientService,
    configService: ConfigService,
  ) {
    this.tableName = configService.getOrThrow<string>('DYNAMODB_USERS_TABLE');
  }

  async findByUserId(userId: UserId): Promise<UserPreferences> {
    const result = await this.dynamoDb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: userKey(userId.toString()),
        },
        ProjectionExpression: 'preferences',
      }),
    );
    const item = result.Item as UserPreferencesProjection | undefined;

    return UserPreferences.resolve(item?.preferences);
  }

  async save(
    userId: UserId,
    preferences: UserPreferences | UserPreferencesPatch,
  ): Promise<UserPreferences> {
    const resolvedPreferences =
      preferences instanceof UserPreferences
        ? preferences
        : UserPreferences.resolve(preferences);

    const result = await this.dynamoDb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          pk: userKey(userId.toString()),
        },
        UpdateExpression:
          'SET preferences = :preferences, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':preferences': resolvedPreferences.toPrimitives(),
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      }),
    );
    const item = result.Attributes as UserPreferencesProjection | undefined;

    return UserPreferences.resolve(item?.preferences);
  }
}

function userKey(id: string): string {
  return `USER#${id}`;
}
