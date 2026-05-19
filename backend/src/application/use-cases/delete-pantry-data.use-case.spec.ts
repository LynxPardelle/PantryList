import { BadRequestException } from '@nestjs/common';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { DeletePantryDataUseCase } from './delete-pantry-data.use-case';

describe('DeletePantryDataUseCase', () => {
  it('requires explicit confirmation before deleting all pantry data for a user', async () => {
    const { useCase, productTypeRepository, inventoryLotRepository } =
      makeUseCase();

    await expect(
      useCase.execute({
        userId: 'user-1',
        confirmationText: 'BORRAR',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(productTypeRepository.deleteByUserId).not.toHaveBeenCalled();
    expect(inventoryLotRepository.deleteByUserId).not.toHaveBeenCalled();
  });

  it('deletes inventory lots before product types and returns deleted counts', async () => {
    const { useCase, productTypeRepository, inventoryLotRepository } =
      makeUseCase({
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
    });
    expect(inventoryLotRepository.deleteByUserId).toHaveBeenCalledWith(
      UserId.fromString('user-1'),
    );
    expect(productTypeRepository.deleteByUserId).toHaveBeenCalledWith(
      UserId.fromString('user-1'),
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
    deletedInventoryLotCount: number;
    deletedProductTypeCount: number;
  } = {
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
  const useCase = new DeletePantryDataUseCase(
    productTypeRepository,
    inventoryLotRepository,
  );

  return {
    useCase,
    productTypeRepository,
    inventoryLotRepository,
  };
}

function invocationOrder(mock: jest.Mock): number {
  return mock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;
}
