import { ConfigService } from '@nestjs/config';
import {
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDbDocumentClientService } from './dynamodb-document-client.service';
import { DynamoDbHouseholdRepository } from './dynamodb-household.repository';

describe('DynamoDbHouseholdRepository', () => {
  it('deletes indexed and legacy household records without duplicates', async () => {
    const indexed = {
      pk: 'HOUSEHOLD#household-1#MEMBER#user-1',
      entityType: 'HOUSEHOLD_MEMBERSHIP',
      householdId: 'household-1',
    };
    const legacy = {
      pk: 'HOUSEHOLD_INVITE#invite-legacy',
      entityType: 'HOUSEHOLD_INVITE',
      householdId: 'household-1',
    };
    const deletedKeys: unknown[] = [];
    const dynamoDb = {
      send: jest.fn(
        async (command: QueryCommand | ScanCommand | DeleteCommand) => {
          if (command instanceof QueryCommand) {
            return { Items: [indexed] };
          }

          if (command instanceof ScanCommand) {
            return { Items: [indexed, legacy] };
          }

          deletedKeys.push(command.input.Key);
          return {};
        },
      ),
    } as unknown as DynamoDbDocumentClientService;
    const repository = new DynamoDbHouseholdRepository(
      dynamoDb,
      makeConfigService(),
    );

    await repository.deleteHouseholdCascade('household-1');

    expect(deletedKeys).toEqual([
      { pk: 'HOUSEHOLD#household-1#MEMBER#user-1' },
      { pk: 'HOUSEHOLD_INVITE#invite-legacy' },
    ]);
  });
});

function makeConfigService(): ConfigService {
  return {
    getOrThrow: jest.fn().mockReturnValue('users'),
  } as unknown as ConfigService;
}
