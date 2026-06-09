import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { QuantityUnit } from '../../domain/enums';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { InventoryLotId } from '../../domain/value-objects/inventory-lot-id.vo';
import { ArchiveInventoryLotUseCase } from './archive-inventory-lot.use-case';
import { DeleteInventoryLotUseCase } from './delete-inventory-lot.use-case';
import { RestoreInventoryLotUseCase } from './restore-inventory-lot.use-case';

describe('inventory lot archive use cases', () => {
  const makeRepository = (): jest.Mocked<InventoryLotRepository> => ({
    save: jest.fn((lot) => Promise.resolve(lot)),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findArchivedByUserId: jest.fn(),
    findArchivedPageByUserId: jest.fn(),
    findByProductTypeId: jest.fn(),
    reassignUserOwnership: jest.fn(),
    delete: jest.fn(),
    deleteByProductTypeId: jest.fn(),
    deleteByUserId: jest.fn(),
  });

  const makeLot = (): InventoryLot =>
    InventoryLot.fromPrimitives({
      id: 'lot-1',
      userId: 'owner-user',
      productTypeId: 'type-1',
      variantName: 'Dolores QA',
      quantity: 2,
      unit: QuantityUnit.PIECE,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    });

  it('archives and restores lots for the owning user', async () => {
    const repository = makeRepository();
    const lot = makeLot();
    repository.findById.mockResolvedValue(lot);

    const archived = await new ArchiveInventoryLotUseCase(repository).execute({
      lotId: 'lot-1',
      userId: 'owner-user',
      reason: 'Regalado',
    });

    expect(archived.isArchived()).toBe(true);
    expect(archived.toPrimitives().archivedReason).toBe('Regalado');

    const restored = await new RestoreInventoryLotUseCase(repository).execute({
      lotId: 'lot-1',
      userId: 'owner-user',
    });

    expect(restored.isArchived()).toBe(false);
  });

  it('hides lots from another user behind not found', async () => {
    const repository = makeRepository();
    repository.findById.mockResolvedValue(makeLot());

    await expect(
      new ArchiveInventoryLotUseCase(repository).execute({
        lotId: 'lot-1',
        userId: 'other-user',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires archive and confirmation before permanent lot delete', async () => {
    const repository = makeRepository();
    const lot = makeLot();
    repository.findById.mockResolvedValue(lot);
    const useCase = new DeleteInventoryLotUseCase(repository);

    await expect(
      useCase.execute({
        lotId: 'lot-1',
        userId: 'owner-user',
        confirmationText: 'Dolores QA',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    lot.archive();

    await expect(
      useCase.execute({
        lotId: 'lot-1',
        userId: 'owner-user',
        confirmationText: 'Dolores QA',
      }),
    ).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith(
      InventoryLotId.fromString('lot-1'),
    );
  });
});
