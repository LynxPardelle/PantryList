import { FastifyRequest } from 'fastify';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { CloseShoppingPurchaseUseCase } from '../../../application/use-cases/close-shopping-purchase.use-case';
import { GetArchivedPantryItemsUseCase } from '../../../application/use-cases/get-archived-pantry-items.use-case';
import { GetPantryOverviewUseCase } from '../../../application/use-cases/get-pantry-overview.use-case';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile.use-case';
import {
  CreateShoppingShareUseCase,
  RevokeShoppingShareUseCase,
} from '../../../application/use-cases/shopping-share.use-cases';
import { ShoppingShare } from '../../../domain/entities/shopping-share.entity';
import { InventoryLot } from '../../../domain/entities/inventory-lot.entity';
import { QuantityUnit } from '../../../domain/enums';
import { PantryController } from './pantry.controller';

describe('PantryController', () => {
  let controller: PantryController;
  let getPantryOverviewUseCase: jest.Mocked<GetPantryOverviewUseCase>;
  let getArchivedPantryItemsUseCase: jest.Mocked<GetArchivedPantryItemsUseCase>;
  let getUserProfileUseCase: jest.Mocked<GetUserProfileUseCase>;
  let closeShoppingPurchaseUseCase: jest.Mocked<CloseShoppingPurchaseUseCase>;
  let createShoppingShareUseCase: jest.Mocked<CreateShoppingShareUseCase>;
  let revokeShoppingShareUseCase: jest.Mocked<RevokeShoppingShareUseCase>;
  let authCookieService: jest.Mocked<AuthCookieService>;

  beforeEach(() => {
    getPantryOverviewUseCase = {
      execute: jest.fn().mockResolvedValue(makeOverview()),
    } as unknown as jest.Mocked<GetPantryOverviewUseCase>;
    getArchivedPantryItemsUseCase = {
      execute: jest.fn().mockResolvedValue(makeArchivedItems()),
    } as unknown as jest.Mocked<GetArchivedPantryItemsUseCase>;
    getUserProfileUseCase = {
      execute: jest.fn().mockResolvedValue(makeProfile()),
    } as unknown as jest.Mocked<GetUserProfileUseCase>;
    closeShoppingPurchaseUseCase = {
      execute: jest.fn().mockResolvedValue([makeInventoryLot()]),
    } as unknown as jest.Mocked<CloseShoppingPurchaseUseCase>;
    createShoppingShareUseCase = {
      execute: jest.fn().mockResolvedValue({
        share: makeShoppingShare(),
        token: 'opaque-token',
      }),
    } as unknown as jest.Mocked<CreateShoppingShareUseCase>;
    revokeShoppingShareUseCase = {
      execute: jest.fn().mockResolvedValue(
        makeShoppingShare({
          revokedAt: new Date('2026-05-20T00:00:00.000Z'),
          updatedAt: new Date('2026-05-20T00:00:00.000Z'),
        }),
      ),
    } as unknown as jest.Mocked<RevokeShoppingShareUseCase>;
    authCookieService = {
      ensureXsrfForRequest: jest.fn(),
    } as unknown as jest.Mocked<AuthCookieService>;

    controller = new PantryController(
      getPantryOverviewUseCase,
      getArchivedPantryItemsUseCase,
      getUserProfileUseCase,
      closeShoppingPurchaseUseCase,
      createShoppingShareUseCase,
      revokeShoppingShareUseCase,
      authCookieService,
    );
  });

  it('exports profile, overview, and archived pantry data', async () => {
    const exported = await controller.exportData({ userId: 'user-1' }, {
      method: 'GET',
      headers: {
        'x-request-id': 'req-export-1',
      },
    } as unknown as FastifyRequest);

    expect(exported.formatVersion).toBe(1);
    expect(exported.profile.email).toBe('chef@example.com');
    expect(exported.overview.userId).toBe('user-1');
    expect(exported.archived.productTypes[0].baseName).toBe('Detergente');
    expect(exported.archived.inventoryLots[0].variantName).toBe('Botella');
    expect(getUserProfileUseCase.execute).toHaveBeenCalledWith('user-1');
    expect(getPantryOverviewUseCase.execute).toHaveBeenCalledWith('user-1');
    expect(getArchivedPantryItemsUseCase.execute).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('exports query limit metadata for the current data set boundaries', async () => {
    const exported = await controller.exportData({ userId: 'user-1' }, {
      method: 'GET',
      headers: {},
    } as unknown as FastifyRequest);

    expect(exported.limits).toEqual({
      activeProductTypesPerUser: 500,
      archivedProductTypesPerUser: 250,
      productTypeSearchResults: 25,
      activeInventoryLotsPerUser: 1000,
      archivedInventoryLotsPerUser: 250,
      inventoryLotsPerProductType: 500,
      shoppingCheckoutItems: 50,
    });
  });

  it('logs request ids for overview and export reads', async () => {
    const logSpy = jest
      .spyOn(
        (controller as unknown as { logger: { log: jest.Mock } }).logger,
        'log',
      )
      .mockImplementation();

    await controller.overview({ userId: 'user-1' }, {
      method: 'GET',
      headers: {
        'x-request-id': 'req-overview-1',
      },
    } as unknown as FastifyRequest);
    await controller.exportData({ userId: 'user-1' }, {
      method: 'GET',
      headers: {
        'x-request-id': 'req-export-2',
      },
    } as unknown as FastifyRequest);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'pantry_overview_requested requestId=req-overview-1',
      ),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'pantry_overview_completed requestId=req-overview-1',
      ),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('pantry_export_requested requestId=req-export-2'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('pantry_export_completed requestId=req-export-2'),
    );
  });

  it('requires XSRF and closes a shopping purchase for the current user', async () => {
    const request = {
      method: 'POST',
      headers: {
        'x-request-id': 'req-checkout-1',
      },
    } as unknown as FastifyRequest;
    const logSpy = jest
      .spyOn(
        (controller as unknown as { logger: { log: jest.Mock } }).logger,
        'log',
      )
      .mockImplementation();

    const response = await controller.checkout(
      { userId: 'user-1' },
      {
        items: [
          {
            productTypeId: 'type-1',
            quantity: 2,
            unit: QuantityUnit.KILOGRAM,
            paidUnitPrice: 35.5,
            shoppingLocation: 'Mercado',
          },
        ],
      },
      request,
    );

    expect(authCookieService.ensureXsrfForRequest).toHaveBeenCalledWith(
      request,
    );
    expect(closeShoppingPurchaseUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      items: [
        {
          productTypeId: 'type-1',
          variantName: undefined,
          quantity: 2,
          unit: QuantityUnit.KILOGRAM,
          paidUnitPrice: 35.5,
          shoppingLocation: 'Mercado',
          expiresAt: undefined,
        },
      ],
    });
    expect(response[0].productTypeId).toBe('type-1');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('requestId=req-checkout-1'),
    );
  });

  it('creates a server-backed temporary shopping share for the current user', async () => {
    const request = {
      method: 'POST',
      headers: {
        'x-request-id': 'req-share-1',
      },
    } as unknown as FastifyRequest;

    const response = await controller.createShoppingShare(
      { userId: 'user-1' },
      { text: 'Lista de compras\n- Arroz' },
      request,
    );

    expect(authCookieService.ensureXsrfForRequest).toHaveBeenCalledWith(
      request,
    );
    expect(createShoppingShareUseCase.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      text: 'Lista de compras\n- Arroz',
    });
    expect(response.token).toBe('opaque-token');
    expect(response.expiresAt).toEqual(new Date('2026-05-26T00:00:00.000Z'));
  });

  it('revokes a temporary shopping share for the current user', async () => {
    const request = {
      method: 'DELETE',
      headers: {
        'x-request-id': 'req-share-2',
      },
    } as unknown as FastifyRequest;

    const response = await controller.revokeShoppingShare(
      { userId: 'user-1' },
      'opaque-token',
      request,
    );

    expect(authCookieService.ensureXsrfForRequest).toHaveBeenCalledWith(
      request,
    );
    expect(revokeShoppingShareUseCase.execute).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      token: 'opaque-token',
    });
    expect(response.token).toBeUndefined();
    expect(response.revokedAt).toEqual(new Date('2026-05-20T00:00:00.000Z'));
  });
});

function makeProfile() {
  return {
    id: 'user-1',
    email: 'chef@example.com',
    username: 'chef',
    status: 'active' as const,
    connectedIdentityCount: 2,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-02T00:00:00.000Z'),
    preferences: makePreferences(),
  };
}

function makeOverview() {
  return {
    userId: 'user-1',
    generatedAt: new Date('2026-05-17T00:00:00.000Z'),
    preferences: makePreferences(),
    items: [],
    expiringItems: [],
    depletingItems: [],
    shoppingPlanItems: [],
    shoppingPlanEstimatedTotal: 0,
    shoppingRouteGroups: [],
    priceReferenceItems: [],
    stapleItems: [],
    stapleCatalogGroups: [],
    valueInsights: {
      stapleCount: 0,
      stapleAttentionCount: 0,
      estimatedShoppingTotal: 0,
      estimatedExpiringValue: 0,
      estimatedWasteAtRisk: 0,
      estimatedStapleRestockTotal: 0,
      pricedShoppingItemCount: 0,
      unpricedShoppingItemCount: 0,
      promoOnlyShoppingItemCount: 0,
      estimatedPromoOnlyTotal: 0,
    },
  };
}

function makeArchivedItems() {
  const timestamp = new Date('2026-05-10T00:00:00.000Z');

  return {
    productTypes: [
      {
        id: 'type-1',
        userId: 'user-1',
        baseName: 'Detergente',
        category: 'cleaning' as const,
        defaultUnit: 'lt' as const,
        planningSettings: {
          planningEnabled: true,
        },
        shoppingMetadata: {
          householdStaple: false,
          buyOnlyOnPromo: false,
        },
        archivedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    inventoryLots: [
      {
        id: 'lot-1',
        userId: 'user-1',
        productTypeId: 'type-1',
        variantName: 'Botella',
        quantity: 1,
        unit: 'lt' as const,
        archivedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

function makeInventoryLot(): InventoryLot {
  return InventoryLot.fromPrimitives({
    id: 'lot-1',
    userId: 'user-1',
    productTypeId: 'type-1',
    quantity: 2,
    unit: QuantityUnit.KILOGRAM,
    purchaseDate: new Date('2026-05-18T00:00:00.000Z'),
    createdAt: new Date('2026-05-18T00:00:00.000Z'),
    updatedAt: new Date('2026-05-18T00:00:00.000Z'),
  });
}

function makeShoppingShare(
  overrides: Partial<ReturnType<ShoppingShare['toPrimitives']>> = {},
): ShoppingShare {
  return ShoppingShare.fromPrimitives({
    id: 'share-1',
    ownerUserId: 'user-1',
    tokenHash:
      '43d7c60747d45779d55e1dfb8a6f3a88decf9b9830fdd308395650c9b67bb7ea',
    text: 'Lista de compras\n- Arroz',
    createdAt: new Date('2026-05-19T00:00:00.000Z'),
    expiresAt: new Date('2026-05-26T00:00:00.000Z'),
    updatedAt: new Date('2026-05-19T00:00:00.000Z'),
    ...overrides,
  });
}

function makePreferences() {
  return {
    expirationWarningDays: 7,
    showExpiredEntryAlert: true,
    depletionWarningThresholdRatio: 1,
    shoppingPlanLeadDays: 3,
    showGuidanceTips: true,
  };
}
