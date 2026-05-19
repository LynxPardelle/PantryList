import { BadRequestException } from '@nestjs/common';
import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { QuantityUnit } from '../../domain/enums';
import { InventoryLotId } from '../../domain/value-objects/inventory-lot-id.vo';
import { ConsumeInventoryLotUseCase } from './consume-inventory-lot.use-case';

describe('ConsumeInventoryLotUseCase', () => {
  const makeRepository = (): jest.Mocked<InventoryLotRepository> => ({
    save: jest.fn((lot) => Promise.resolve(lot)),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByProductTypeId: jest.fn(),
    findArchivedByUserId: jest.fn(),
    reassignUserOwnership: jest.fn(),
    delete: jest.fn(),
    deleteByProductTypeId: jest.fn(),
    deleteByUserId: jest.fn(),
  });

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
    const useCase = new ConsumeInventoryLotUseCase(repository);

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
});
