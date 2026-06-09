import { BadRequestException } from '@nestjs/common';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ShoppingShareRepository } from '../../domain/repositories/shopping-share.repository';
import { WasteEventRepository } from '../../domain/repositories/waste-event.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { DeletePantryDataUseCase } from './delete-pantry-data.use-case';

describe('DeletePantryDataUseCase', () => {
  it('requires explicit confirmation before deleting all pantry data for a user', async () => {
    const {
      useCase,
      productTypeRepository,
      inventoryLotRepository,
      shoppingShareRepository,
      wasteEventRepository,
    } = makeUseCase();

    await expect(
      useCase.execute({
        userId: 'user-1',
        confirmationText: 'BORRAR',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(productTypeRepository.deleteByUserId).not.toHaveBeenCalled();
    expect(inventoryLotRepository.deleteByUserId).not.toHaveBeenCalled();
    expect(shoppingShareRepository.deleteByOwnerUserId).not.toHaveBeenCalled();
    expect(wasteEventRepository.deleteByUserId).not.toHaveBeenCalled();
  });

  it('deletes share links before inventory lots and product types', async () => {
    const {
      useCase,
      productTypeRepository,
      inventoryLotRepository,
      shoppingShareRepository,
      wasteEventRepository,
    } = makeUseCase({
      deletedShoppingShareCount: 2,
      deletedWasteEventCount: 4,
      deletedInventoryLotCount: 5,
      deletedProductTypeCount: 3,
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        confirmationText: 'ELIMINAR',
      }),
    ).resolves.toEqual({
      deletedInventoryLotCount: 5,
      deletedProductTypeCount: 3,
      deletedShoppingShareCount: 2,
      deletedWasteEventCount: 4,
    });
    expect(shoppingShareRepository.deleteByOwnerUserId).toHaveBeenCalledWith(
      UserId.fromString('user-1'),
    );
    expect(inventoryLotRepository.deleteByUserId).toHaveBeenCalledWith(
      UserId.fromString('user-1'),
    );
    expect(wasteEventRepository.deleteByUserId).toHaveBeenCalledWith(
      UserId.fromString('user-1'),
    );
    expect(productTypeRepository.deleteByUserId).toHaveBeenCalledWith(
      UserId.fromString('user-1'),
    );
    expect(
      invocationOrder(shoppingShareRepository.deleteByOwnerUserId as jest.Mock),
    ).toBeLessThan(
      invocationOrder(wasteEventRepository.deleteByUserId as jest.Mock),
    );
    expect(
      invocationOrder(wasteEventRepository.deleteByUserId as jest.Mock),
    ).toBeLessThan(
      invocationOrder(inventoryLotRepository.deleteByUserId as jest.Mock),
    );
    expect(
      invocationOrder(inventoryLotRepository.deleteByUserId as jest.Mock),
    ).toBeLessThan(
      invocationOrder(productTypeRepository.deleteByUserId as jest.Mock),
    );
  });
});

function makeUseCase(
  counts: {
    deletedShoppingShareCount: number;
    deletedWasteEventCount: number;
    deletedInventoryLotCount: number;
    deletedProductTypeCount: number;
  } = {
    deletedShoppingShareCount: 0,
    deletedWasteEventCount: 0,
    deletedInventoryLotCount: 0,
    deletedProductTypeCount: 0,
  },
) {
  const productTypeRepository = {
    deleteByUserId: jest.fn().mockResolvedValue(counts.deletedProductTypeCount),
  } as unknown as jest.Mocked<ProductTypeRepository>;
  const inventoryLotRepository = {
    deleteByUserId: jest
      .fn()
      .mockResolvedValue(counts.deletedInventoryLotCount),
  } as unknown as jest.Mocked<InventoryLotRepository>;
  const shoppingShareRepository = {
    deleteByOwnerUserId: jest
      .fn()
      .mockResolvedValue(counts.deletedShoppingShareCount),
  } as unknown as jest.Mocked<ShoppingShareRepository>;
  const wasteEventRepository = {
    deleteByUserId: jest.fn().mockResolvedValue(counts.deletedWasteEventCount),
  } as unknown as jest.Mocked<WasteEventRepository>;
  const useCase = new DeletePantryDataUseCase(
    productTypeRepository,
    inventoryLotRepository,
    shoppingShareRepository,
    wasteEventRepository,
  );

  return {
    useCase,
    productTypeRepository,
    inventoryLotRepository,
    shoppingShareRepository,
    wasteEventRepository,
  };
}

function invocationOrder(mock: jest.Mock): number {
  return mock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;
}
