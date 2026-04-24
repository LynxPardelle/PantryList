import { Product } from '../../../../src/domain/entities/product.entity';
import { Period } from '../../../../src/domain/enums/period.enum';
import { ProductCategory, QuantityUnit } from '../../../../src/domain/enums';
import { ProductId } from '../../../../src/domain/value-objects/product-id.vo';
import { UsageRate } from '../../../../src/domain/value-objects/usage-rate.vo';
import { UserId } from '../../../../src/domain/value-objects/user-id.vo';
import { MongoProductRepository } from './mongodb-product.repository';

type QueryResult<T> = {
  lean: () => {
    exec: () => Promise<T>;
  };
};

describe('MongoProductRepository', () => {
  const makeProduct = (): Product =>
    Product.create(
      UserId.fromString('user-1'),
      'Aceite de oliva',
      2,
      QuantityUnit.LITER,
      new UsageRate(1, Period.MONTH),
      ProductCategory.FOOD,
    );

  const makeQuery = <T>(value: T): QueryResult<T> => ({
    lean: () => ({
      exec: () => Promise.resolve(value),
    }),
  });

  it('persists a product and returns it as a domain entity', async () => {
    const product = makeProduct();
    const primitives = product.toPrimitives();
    const model = {
      findOneAndUpdate: jest.fn().mockReturnValue(makeQuery(primitives)),
      findOne: jest.fn(),
      find: jest.fn(),
      deleteOne: jest.fn(),
    };

    const repository = new MongoProductRepository(model as never);

    const saved = await repository.save(product);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { id: primitives.id },
      primitives,
      expect.objectContaining({
        new: true,
        upsert: true,
      }),
    );
    expect(saved.toPrimitives()).toMatchObject(primitives);
  });

  it('returns a product by id when it exists', async () => {
    const product = makeProduct();
    const primitives = product.toPrimitives();
    const query = makeQuery(primitives);
    const model = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn().mockReturnValue(query),
      find: jest.fn(),
      deleteOne: jest.fn(),
    };

    const repository = new MongoProductRepository(model as never);

    const found = await repository.findById(
      ProductId.fromString(primitives.id),
    );

    expect(model.findOne).toHaveBeenCalledWith({ id: primitives.id });
    expect(found?.toPrimitives()).toMatchObject(primitives);
  });

  it('returns null when a product does not exist', async () => {
    const query = makeQuery(null);
    const model = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn().mockReturnValue(query),
      find: jest.fn(),
      deleteOne: jest.fn(),
    };

    const repository = new MongoProductRepository(model as never);

    await expect(
      repository.findById(ProductId.fromString('missing-product')),
    ).resolves.toBeNull();
  });
});
