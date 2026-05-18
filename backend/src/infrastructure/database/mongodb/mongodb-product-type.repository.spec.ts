import { ProductCategory, QuantityUnit } from '../../../domain/enums';
import { ProductType } from '../../../domain/entities/product-type.entity';
import {
  MAX_ACTIVE_PRODUCT_TYPES_PER_USER,
  MAX_ARCHIVED_PRODUCT_TYPES_PER_USER,
} from '../../../application/constants/query-limits';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { MongoProductTypeRepository } from './mongodb-product-type.repository';

type QueryResult<T> = {
  sort: () => QueryResult<T>;
  limit: (limit: number) => QueryResult<T>;
  lean: () => {
    exec: () => Promise<T>;
  };
};

describe('MongoProductTypeRepository archive-aware queries', () => {
  const userId = UserId.fromString('user-1');

  const makeProductType = (): ProductType =>
    ProductType.fromPrimitives({
      id: 'type-1',
      userId: userId.toString(),
      baseName: 'Detergente',
      category: ProductCategory.CLEANING,
      defaultUnit: QuantityUnit.LITER,
      planningSettings: {
        planningEnabled: true,
        shoppingPlanLeadDaysOverride: 5,
      },
      archivedAt: new Date('2026-04-20T00:00:00.000Z'),
      archivedReason: 'Ya no se compra',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-20T00:00:00.000Z'),
    });

  const makeQuery = <T>(value: T): QueryResult<T> => {
    const query: QueryResult<T> = {
      sort: () => query,
      limit: () => query,
      lean: () => ({
        exec: () => Promise.resolve(value),
      }),
    };

    return query;
  };

  it('persists planning settings and archive state', async () => {
    const productType = makeProductType();
    const primitives = productType.toPrimitives();
    const model = {
      findOneAndUpdate: jest.fn().mockReturnValue(makeQuery(primitives)),
      findOne: jest.fn(),
      find: jest.fn(),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
    };

    const repository = new MongoProductTypeRepository(model as never);

    await repository.save(productType);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      {
        userId: primitives.userId,
        normalizedBaseName: 'detergente',
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          planningSettings: primitives.planningSettings,
          archivedAt: primitives.archivedAt,
          archivedReason: primitives.archivedReason,
        }),
      }),
      expect.objectContaining({
        new: true,
        upsert: true,
      }),
    );
  });

  it('excludes archived product types from active user listings', async () => {
    const query = makeQuery([]);
    const model = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue(query),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
    };
    jest.spyOn(query, 'limit');

    const repository = new MongoProductTypeRepository(model as never);

    await repository.findByUserId(userId);

    expect(model.find).toHaveBeenCalledWith({
      userId: userId.toString(),
      archivedAt: { $exists: false },
    });
    expect(query.limit).toHaveBeenCalledWith(MAX_ACTIVE_PRODUCT_TYPES_PER_USER);
  });

  it('lists archived product types separately', async () => {
    const productType = makeProductType().toPrimitives();
    const query = makeQuery([productType]);
    const model = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue(query),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
    };
    jest.spyOn(query, 'limit');

    const repository = new MongoProductTypeRepository(model as never);

    const archived = await repository.findArchivedByUserId(userId);

    expect(model.find).toHaveBeenCalledWith({
      userId: userId.toString(),
      archivedAt: { $exists: true },
    });
    expect(query.limit).toHaveBeenCalledWith(
      MAX_ARCHIVED_PRODUCT_TYPES_PER_USER,
    );
    expect(archived[0].toPrimitives()).toMatchObject({
      id: 'type-1',
      archivedReason: 'Ya no se compra',
    });
  });
});
