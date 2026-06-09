import { FastifyRequest } from 'fastify';
import { ArchiveInventoryLotUseCase } from '../../../application/use-cases/archive-inventory-lot.use-case';
import { ConsumeInventoryLotUseCase } from '../../../application/use-cases/consume-inventory-lot.use-case';
import { CreateInventoryLotUseCase } from '../../../application/use-cases/create-inventory-lot.use-case';
import { DeleteInventoryLotUseCase } from '../../../application/use-cases/delete-inventory-lot.use-case';
import { GetExpiringLotsUseCase } from '../../../application/use-cases/get-expiring-lots.use-case';
import { ResolveHouseholdPantryAccessUseCase } from '../../../application/use-cases/household.use-cases';
import { ListInventoryLotsUseCase } from '../../../application/use-cases/list-inventory-lots.use-case';
import { RestoreInventoryLotUseCase } from '../../../application/use-cases/restore-inventory-lot.use-case';
import { InventoryLot } from '../../../domain/entities/inventory-lot.entity';
import { QuantityUnit } from '../../../domain/enums';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { InventoryLotsController } from './inventory-lots.controller';

describe('InventoryLotsController archive endpoints', () => {
  it('requires XSRF and archives a lot for the current user', async () => {
    const { controller, authCookieService, archiveInventoryLotUseCase } =
      makeController();
    const request = { method: 'POST' } as FastifyRequest;

    await controller.archive(
      'lot-1',
      makeCurrentUser('user-1'),
      { reason: 'Regalado' },
      request,
    );

    expect(authCookieService.ensureXsrfForRequest).toHaveBeenCalledWith(
      request,
    );
    expect(archiveInventoryLotUseCase.execute).toHaveBeenCalledWith({
      lotId: 'lot-1',
      userId: 'user-1',
      reason: 'Regalado',
    });
  });

  it('archives a lot under the household owner scope for an editor', async () => {
    const {
      controller,
      resolveHouseholdPantryAccessUseCase,
      archiveInventoryLotUseCase,
    } = makeController();
    const request = { method: 'POST' } as FastifyRequest;
    resolveHouseholdPantryAccessUseCase.executeWrite.mockResolvedValueOnce(
      makeHouseholdAccess({
        requesterUserId: 'editor-user',
        pantryOwnerUserId: 'owner-user',
        role: 'editor',
      }),
    );

    await controller.archive(
      'lot-1',
      makeCurrentUser('editor-user'),
      { reason: 'Regalado' },
      request,
    );

    expect(archiveInventoryLotUseCase.execute).toHaveBeenCalledWith({
      lotId: 'lot-1',
      userId: 'owner-user',
      reason: 'Regalado',
    });
  });
});

function makeController(): {
  controller: InventoryLotsController;
  authCookieService: jest.Mocked<AuthCookieService>;
  archiveInventoryLotUseCase: jest.Mocked<ArchiveInventoryLotUseCase>;
  resolveHouseholdPantryAccessUseCase: jest.Mocked<ResolveHouseholdPantryAccessUseCase>;
} {
  const lot = InventoryLot.fromPrimitives({
    id: 'lot-1',
    userId: 'user-1',
    productTypeId: 'type-1',
    quantity: 1,
    unit: QuantityUnit.PIECE,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
  });
  const archiveInventoryLotUseCase = {
    execute: jest.fn().mockResolvedValue(lot),
  } as unknown as jest.Mocked<ArchiveInventoryLotUseCase>;
  const authCookieService = {
    ensureXsrfForRequest: jest.fn(),
  } as unknown as jest.Mocked<AuthCookieService>;
  const resolveHouseholdPantryAccessUseCase = {
    executeRead: jest.fn().mockResolvedValue(makeHouseholdAccess()),
    executeWrite: jest.fn().mockResolvedValue(makeHouseholdAccess()),
    executeOwner: jest.fn().mockResolvedValue(makeHouseholdAccess()),
  } as unknown as jest.Mocked<ResolveHouseholdPantryAccessUseCase>;

  return {
    controller: new InventoryLotsController(
      {} as jest.Mocked<CreateInventoryLotUseCase>,
      {} as jest.Mocked<ListInventoryLotsUseCase>,
      {} as jest.Mocked<GetExpiringLotsUseCase>,
      {} as jest.Mocked<ConsumeInventoryLotUseCase>,
      archiveInventoryLotUseCase,
      {
        execute: jest.fn(),
      } as unknown as jest.Mocked<RestoreInventoryLotUseCase>,
      {
        execute: jest.fn(),
      } as unknown as jest.Mocked<DeleteInventoryLotUseCase>,
      resolveHouseholdPantryAccessUseCase,
      authCookieService,
    ),
    authCookieService,
    archiveInventoryLotUseCase,
    resolveHouseholdPantryAccessUseCase,
  };
}

function makeCurrentUser(userId: string): AuthenticatedUser {
  return {
    userId,
    authSubjectId: `${userId}-subject`,
  };
}

function makeHouseholdAccess(
  overrides: Partial<{
    requesterUserId: string;
    householdId: string;
    pantryOwnerUserId: string;
    role: 'owner' | 'editor' | 'viewer';
  }> = {},
) {
  return {
    requesterUserId: 'user-1',
    householdId: 'household-1',
    pantryOwnerUserId: 'user-1',
    role: 'owner' as const,
    ...overrides,
  };
}
