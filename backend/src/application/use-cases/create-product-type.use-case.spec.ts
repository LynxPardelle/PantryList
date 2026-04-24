import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { QuantityUnit } from '../../domain/enums';
import { CreateProductTypeUseCase } from './create-product-type.use-case';

describe('CreateProductTypeUseCase', () => {
  const makeRepository = (): jest.Mocked<ProductTypeRepository> => ({
    save: jest.fn((productType) => Promise.resolve(productType)),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    searchByUserId: jest.fn(),
    findByBaseName: jest.fn(),
    reassignUserOwnership: jest.fn(),
  });

  it('persists a default depletion rule when creating a product type', async () => {
    const repository = makeRepository();
    repository.findByBaseName.mockResolvedValue(null);
    const useCase = new CreateProductTypeUseCase(repository);

    const productType = await useCase.execute({
      userId: 'rule-user',
      baseName: 'Detergente liquido',
      category: 'cleaning',
      defaultUnit: 'lt',
      defaultDepletionRule: {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'month',
        anchorDate: new Date('2026-01-24T00:00:00.000Z'),
      },
    });

    expect(productType.toPrimitives().defaultDepletionRule).toMatchObject({
      enabled: true,
      consumeAmount: 1,
      unit: QuantityUnit.LITER,
      everyAmount: 1,
      everyPeriod: 'month',
    });
  });

  it('rejects depletion rules that use a different unit than the product type', async () => {
    const repository = makeRepository();
    repository.findByBaseName.mockResolvedValue(null);
    const useCase = new CreateProductTypeUseCase(repository);

    await expect(
      useCase.execute({
        userId: 'rule-user',
        baseName: 'Detergente liquido',
        category: 'cleaning',
        defaultUnit: 'lt',
        defaultDepletionRule: {
          enabled: true,
          consumeAmount: 1,
          unit: QuantityUnit.KILOGRAM,
          everyAmount: 1,
          everyPeriod: 'month',
          anchorDate: new Date('2026-01-24T00:00:00.000Z'),
        },
      }),
    ).rejects.toThrow(
      'Depletion rule unit must match product type default unit',
    );
  });
});
