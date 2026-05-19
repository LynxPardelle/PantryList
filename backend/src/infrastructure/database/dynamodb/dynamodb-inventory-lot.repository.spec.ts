import { ConfigService } from '@nestjs/config';
import { DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { QuantityUnit } from '../../../domain/enums';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { DynamoDbDocumentClientService } from './dynamodb-document-client.service';
import { DynamoDbInventoryLotRepository } from './dynamodb-inventory-lot.repository';

describe('DynamoDbInventoryLotRepository', () => {
  it('deletes inventory lots across all DynamoDB result pages', async () => {
    const firstItem = buildInventoryLotItem('lot-1');
    const secondItem = buildInventoryLotItem('lot-2');
    const dynamoDb = {
      send: jest
        .fn()
        .mockImplementationOnce(async (command: QueryCommand) => {
          expect(command.input.ExclusiveStartKey).toBeUndefined();

          return {
            Items: [firstItem],
            LastEvaluatedKey: { id: firstItem.id },
          };
        })
        .mockImplementationOnce(async (command: QueryCommand) => {
          expect(command.input.ExclusiveStartKey).toEqual({ id: firstItem.id });

          return { Items: [secondItem] };
        })
        .mockResolvedValue({}),
    } as unknown as DynamoDbDocumentClientService;
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('inventory-lots'),
    } as unknown as ConfigService;
    const repository = new DynamoDbInventoryLotRepository(
      dynamoDb,
      configService,
    );

    const deletedCount = await repository.deleteByUserId(
      UserId.fromString('user-1'),
    );

    expect(deletedCount).toBe(2);
    const deleteInputs = (dynamoDb.send as jest.Mock).mock.calls
      .map(([command]) => command)
      .filter((command) => command instanceof DeleteCommand)
      .map((command: DeleteCommand) => command.input);
    expect(deleteInputs).toEqual([
      expect.objectContaining({ Key: { id: 'lot-1' } }),
      expect.objectContaining({ Key: { id: 'lot-2' } }),
    ]);
  });
});

function buildInventoryLotItem(id: string) {
  return {
    entityType: 'INVENTORY_LOT',
    id,
    userId: 'user-1',
    productTypeId: 'type-1',
    variantName: 'Bolsa',
    quantity: 1,
    unit: QuantityUnit.PIECE,
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  };
}
