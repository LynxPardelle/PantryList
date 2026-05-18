import { BadRequestException } from '@nestjs/common';
import { CloseShoppingPurchaseUseCase } from './close-shopping-purchase.use-case';
import { ProductType } from '../../domain/entities/product-type.entity';
import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { ProductCategory, QuantityUnit } from '../../domain/enums';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';

describe('CloseShoppingPurchaseUseCase', () => {
  it('creates lots and records paid price metadata', async () => {
    const productType = makeProductType();
    const { useCase, inventoryLotRepository, productTypeRepository } =
      makeUseCase(productType);

    const lots = await useCase.execute({
      userId: 'user-1',
      items: [
        {
          productTypeId: 'type-1',
          quantity: 2,
          unit: QuantityUnit.KILOGRAM,
          paidUnitPrice: 35.5,
          shoppingLocation: 'Mercado',
        },
      ],
    });

    expect(lots).toHaveLength(1);
    expect(inventoryLotRepository.save).toHaveBeenCalledWith(
      expect.any(InventoryLot),
    );
    expect(productTypeRepository.save).toHaveBeenCalledWith(
      expect.any(ProductType),
    );
    expect(
      productTypeRepository.save.mock.calls[0][0].shoppingMetadata
        .estimatedUnitPrice,
    ).toBe(35.5);
    expect(
      productTypeRepository.save.mock.calls[0][0].shoppingMetadata
        .shoppingLocation,
    ).toBe('Mercado');
    expect(
      productTypeRepository.save.mock.calls[0][0].shoppingMetadata.priceHistory,
    ).toHaveLength(1);
  });

  it('rejects archived product types', async () => {
    const productType = makeProductType();
    productType.archive('Temporal');
    const { useCase } = makeUseCase(productType);

    await expect(
      useCase.execute({
        userId: 'user-1',
        items: [
          {
            productTypeId: 'type-1',
            quantity: 1,
            unit: QuantityUnit.KILOGRAM,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function makeUseCase(productType: ProductType): {
  useCase: CloseShoppingPurchaseUseCase;
  inventoryLotRepository: jest.Mocked<InventoryLotRepository>;
  productTypeRepository: jest.Mocked<ProductTypeRepository>;
} {
  const inventoryLotRepository = {
    save: jest.fn((lot: InventoryLot) => Promise.resolve(lot)),
  } as unknown as jest.Mocked<InventoryLotRepository>;
  const productTypeRepository = {
    findById: jest.fn().mockResolvedValue(productType),
    save: jest.fn((value: ProductType) => Promise.resolve(value)),
  } as unknown as jest.Mocked<ProductTypeRepository>;

  return {
    useCase: new CloseShoppingPurchaseUseCase(
      inventoryLotRepository,
      productTypeRepository,
    ),
    inventoryLotRepository,
    productTypeRepository,
  };
}

function makeProductType(): ProductType {
  return ProductType.fromPrimitives({
    id: 'type-1',
    userId: 'user-1',
    baseName: 'Arroz',
    category: ProductCategory.FOOD,
    defaultUnit: QuantityUnit.KILOGRAM,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  });
}
