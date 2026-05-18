import { ConfigService } from '@nestjs/config';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ProductCategory, QuantityUnit } from '../../../domain/enums';
import { ProductType } from '../../../domain/entities/product-type.entity';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { DynamoDbDocumentClientService } from './dynamodb-document-client.service';
import { DynamoDbProductTypeRepository } from './dynamodb-product-type.repository';

describe('DynamoDbProductTypeRepository', () => {
  it('serializes price history dates before persisting shopping metadata', async () => {
    let capturedItem: Record<string, unknown> | undefined;
    const dynamoDb = {
      send: jest.fn(async (command: PutCommand | QueryCommand) => {
        if (command instanceof QueryCommand) {
          return { Items: [] };
        }

        capturedItem = command.input.Item as Record<string, unknown>;
        return {};
      }),
    } as unknown as DynamoDbDocumentClientService;
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('product-types'),
    } as unknown as ConfigService;
    const repository = new DynamoDbProductTypeRepository(
      dynamoDb,
      configService,
    );
    const productType = ProductType.create(
      UserId.fromString('user-1'),
      'Arroz',
      ProductCategory.FOOD,
      QuantityUnit.KILOGRAM,
      undefined,
      {
        shoppingLocation: 'Mercado',
        preferredBrand: 'Marca local',
        estimatedUnitPrice: 42,
        householdStaple: true,
        buyOnlyOnPromo: false,
      },
    );

    const saved = await repository.save(productType);

    const metadata = capturedItem?.['shoppingMetadata'] as
      | {
          priceHistory?: Array<{ recordedAt?: unknown }>;
        }
      | undefined;
    expect(metadata?.priceHistory?.[0]?.recordedAt).toEqual(expect.any(String));
    expect(
      Number.isNaN(
        Date.parse(metadata?.priceHistory?.[0]?.recordedAt as string),
      ),
    ).toBe(false);
    expect(
      saved.toPrimitives().shoppingMetadata?.priceHistory?.[0]?.recordedAt,
    ).toBeInstanceOf(Date);
  });
});
