import { ProductType } from '../../domain/entities/product-type.entity';
import { ProductCategory, QuantityUnit } from '../../domain/enums';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { GetProductTypeByIdUseCase } from './get-product-type-by-id.use-case';

describe('GetProductTypeByIdUseCase', () => {
  const makeRepository = (): jest.Mocked<ProductTypeRepository> => ({
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    searchByUserId: jest.fn(),
    findByBaseName: jest.fn(),
    reassignUserOwnership: jest.fn(),
  });

  const makeProductType = (userId: string): ProductType =>
    ProductType.create(
      UserId.fromString(userId),
      'Jamon de pierna de pavo',
      ProductCategory.FOOD,
      QuantityUnit.PIECE,
    );

  it('returns the product type when the owner matches', async () => {
    const repository = makeRepository();
    const productType = makeProductType('owner-user');
    repository.findById.mockResolvedValue(productType);

    const useCase = new GetProductTypeByIdUseCase(repository);

    await expect(
      useCase.execute(productType.id.toString(), 'owner-user'),
    ).resolves.toBe(productType);
  });

  it('throws when another user requests the product type', async () => {
    const repository = makeRepository();
    const productType = makeProductType('owner-user');
    repository.findById.mockResolvedValue(productType);

    const useCase = new GetProductTypeByIdUseCase(repository);

    await expect(
      useCase.execute(productType.id.toString(), 'other-user'),
    ).rejects.toThrow('Product type not found');
  });
});
