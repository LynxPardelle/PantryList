import { GetArchivedPantryItemsUseCase } from '../../../application/use-cases/get-archived-pantry-items.use-case';
import { GetPantryOverviewUseCase } from '../../../application/use-cases/get-pantry-overview.use-case';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile.use-case';
import { PantryController } from './pantry.controller';

describe('PantryController', () => {
  let controller: PantryController;
  let getPantryOverviewUseCase: jest.Mocked<GetPantryOverviewUseCase>;
  let getArchivedPantryItemsUseCase: jest.Mocked<GetArchivedPantryItemsUseCase>;
  let getUserProfileUseCase: jest.Mocked<GetUserProfileUseCase>;

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

    controller = new PantryController(
      getPantryOverviewUseCase,
      getArchivedPantryItemsUseCase,
      getUserProfileUseCase,
    );
  });

  it('exports profile, overview, and archived pantry data', async () => {
    const exported = await controller.exportData({ userId: 'user-1' });

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
    stapleItems: [],
    valueInsights: {
      stapleCount: 0,
      stapleAttentionCount: 0,
      estimatedShoppingTotal: 0,
      estimatedExpiringValue: 0,
      estimatedStapleRestockTotal: 0,
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

function makePreferences() {
  return {
    expirationWarningDays: 7,
    showExpiredEntryAlert: true,
    depletionWarningThresholdRatio: 1,
    shoppingPlanLeadDays: 3,
    showGuidanceTips: true,
  };
}
