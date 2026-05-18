import { InventoryLot } from '../../../domain/entities/inventory-lot.entity';
import { QuantityUnit } from '../../../domain/enums';
import {
  MAX_ACTIVE_INVENTORY_LOTS_PER_USER,
  MAX_ARCHIVED_INVENTORY_LOTS_PER_USER,
  MAX_INVENTORY_LOTS_PER_PRODUCT_TYPE,
} from '../../../application/constants/query-limits';
import { ProductTypeId } from '../../../domain/value-objects/product-type-id.vo';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { MongoInventoryLotRepository } from './mongodb-inventory-lot.repository';

type QueryResult<T> = {
  sort: () => QueryResult<T>;
  limit: (limit: number) => QueryResult<T>;
  lean: () => {
    exec: () => Promise<T>;
  };
};

describe('MongoInventoryLotRepository archive-aware queries', () => {
  const userId = UserId.fromString('user-1');
  const productTypeId = ProductTypeId.fromString('type-1');

  const makeInventoryLot = (): InventoryLot =>
    InventoryLot.fromPrimitives({
      id: 'lot-1',
      userId: userId.toString(),
      productTypeId: productTypeId.toString(),
      variantName: 'Marca QA',
      quantity: 2,
      unit: QuantityUnit.PIECE,
      archivedAt: new Date('2026-04-20T00:00:00.000Z'),
      archivedReason: 'Regalado',
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

  it('persists archive state', async () => {
    const lot = makeInventoryLot();
    const primitives = lot.toPrimitives();
    const model = {
      findOneAndUpdate: jest.fn().mockReturnValue(makeQuery(primitives)),
      findOne: jest.fn(),
      find: jest.fn(),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
    };

    const repository = new MongoInventoryLotRepository(model as never);

    await repository.save(lot);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { id: primitives.id },
      expect.objectContaining({
        $set: expect.objectContaining({
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

  it('excludes archived lots from active user listings', async () => {
    const query = makeQuery([]);
    const model = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue(query),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
    };
    jest.spyOn(query, 'limit');

    const repository = new MongoInventoryLotRepository(model as never);

    await repository.findByUserId(userId);

    expect(model.find).toHaveBeenCalledWith({
      userId: userId.toString(),
      archivedAt: { $exists: false },
    });
    expect(query.limit).toHaveBeenCalledWith(
      MAX_ACTIVE_INVENTORY_LOTS_PER_USER,
    );
  });

  it('excludes archived lots from active product type listings', async () => {
    const query = makeQuery([]);
    const model = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue(query),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
    };
    jest.spyOn(query, 'limit');

    const repository = new MongoInventoryLotRepository(model as never);

    await repository.findByProductTypeId(productTypeId);

    expect(model.find).toHaveBeenCalledWith({
      productTypeId: productTypeId.toString(),
      archivedAt: { $exists: false },
    });
    expect(query.limit).toHaveBeenCalledWith(
      MAX_INVENTORY_LOTS_PER_PRODUCT_TYPE,
    );
  });

  it('lists archived lots separately', async () => {
    const lot = makeInventoryLot().toPrimitives();
    const query = makeQuery([lot]);
    const model = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue(query),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
    };
    jest.spyOn(query, 'limit');

    const repository = new MongoInventoryLotRepository(model as never);

    const archived = await repository.findArchivedByUserId(userId);

    expect(model.find).toHaveBeenCalledWith({
      userId: userId.toString(),
      archivedAt: { $exists: true },
    });
    expect(query.limit).toHaveBeenCalledWith(
      MAX_ARCHIVED_INVENTORY_LOTS_PER_USER,
    );
    expect(archived[0].toPrimitives()).toMatchObject({
      id: 'lot-1',
      archivedReason: 'Regalado',
    });
  });
});
