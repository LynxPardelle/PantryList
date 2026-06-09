import { BadRequestException } from '@nestjs/common';
import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { ProductType } from '../../domain/entities/product-type.entity';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { WasteEventRepository } from '../../domain/repositories/waste-event.repository';
import { ProductCategory, QuantityUnit } from '../../domain/enums';
import { InventoryLotId } from '../../domain/value-objects/inventory-lot-id.vo';
import { ConsumeInventoryLotUseCase } from './consume-inventory-lot.use-case';

describe('ConsumeInventoryLotUseCase', () => {
  const makeRepository = (): jest.Mocked<InventoryLotRepository> => ({
    save: jest.fn((lot) => Promise.resolve(lot)),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByProductTypeId: jest.fn(),
    findArchivedByUserId: jest.fn(),
    findArchivedPageByUserId: jest.fn(),
    reassignUserOwnership: jest.fn(),
    delete: jest.fn(),
    deleteByProductTypeId: jest.fn(),
    deleteByUserId: jest.fn(),
  });
  const makeProductTypeRepository = (): jest.Mocked<ProductTypeRepository> =>
    ({
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(makeProductType()),
      findByUserId: jest.fn(),
      findArchivedByUserId: jest.fn(),
      findArchivedPageByUserId: jest.fn(),
      searchByUserId: jest.fn(),
      findByBaseName: jest.fn(),
      reassignUserOwnership: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
    }) as unknown as jest.Mocked<ProductTypeRepository>;
  const makeWasteEventRepository = (): jest.Mocked<WasteEventRepository> =>
    ({
      save: jest.fn((event) => Promise.resolve(event)),
      findRecentByUserId: jest.fn(),
      findSinceByUserId: jest.fn(),
      deleteByUserId: jest.fn(),
    }) as unknown as jest.Mocked<WasteEventRepository>;

  it('returns a clean BadRequestException when consumption exceeds the lot quantity', async () => {
    const repository = makeRepository();
    repository.findById.mockResolvedValue(
      InventoryLot.fromPrimitives({
        id: 'lot-1',
        userId: 'user-1',
        productTypeId: 'type-1',
        quantity: 1,
        unit: QuantityUnit.PIECE,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
    );
    const useCase = new ConsumeInventoryLotUseCase(
      repository,
      makeProductTypeRepository(),
      makeWasteEventRepository(),
    );

    await expect(useCase.execute('lot-1', 'user-1', 2)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(useCase.execute('lot-1', 'user-1', 2)).rejects.toThrow(
      'Consume quantity exceeds lot quantity',
    );
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalledWith(
      InventoryLotId.fromString('lot-1'),
    );
  });

  it('records a waste event before consuming a lot as waste', async () => {
    const repository = makeRepository();
    const productTypeRepository = makeProductTypeRepository();
    const wasteEventRepository = makeWasteEventRepository();
    repository.findById.mockResolvedValue(
      InventoryLot.fromPrimitives({
        id: 'lot-1',
        userId: 'user-1',
        productTypeId: 'type-1',
        quantity: 2,
        unit: QuantityUnit.PIECE,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
    );
    const useCase = new ConsumeInventoryLotUseCase(
      repository,
      productTypeRepository,
      wasteEventRepository,
    );

    await useCase.execute('lot-1', 'user-1', 1, {
      wasteReason: 'expired',
      wasteNote: 'Fecha vencida',
    });

    expect(wasteEventRepository.save).toHaveBeenCalledTimes(1);
    expect(
      wasteEventRepository.save.mock.calls[0][0].toPrimitives(),
    ).toMatchObject({
      userId: 'user-1',
      productTypeId: 'type-1',
      inventoryLotId: 'lot-1',
      productName: 'Leche',
      quantity: 1,
      unit: QuantityUnit.PIECE,
      reason: 'expired',
      note: 'Fecha vencida',
      estimatedLoss: 25,
    });
    expect(repository.save).toHaveBeenCalled();
  });
});

function makeProductType(): ProductType {
  return ProductType.fromPrimitives({
    id: 'type-1',
    userId: 'user-1',
    baseName: 'Leche',
    category: ProductCategory.FOOD,
    defaultUnit: QuantityUnit.PIECE,
    planningSettings: {
      planningEnabled: true,
    },
    shoppingMetadata: {
      estimatedUnitPrice: 25,
      householdStaple: true,
      buyOnlyOnPromo: false,
      replenishWhenLow: true,
    },
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
  });
}
