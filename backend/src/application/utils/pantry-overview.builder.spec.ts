import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { ProductType } from '../../domain/entities/product-type.entity';
import { ProductCategory, QuantityUnit } from '../../domain/enums';
import { buildPantryOverview } from './pantry-overview.builder';

describe('buildPantryOverview depletion forecasts', () => {
  const userId = 'depletion-user';
  const referenceDate = new Date('2026-04-24T12:00:00.000Z');
  const anchorDate = new Date('2026-01-24T00:00:00.000Z');

  it('uses persisted lot quantity before calculating dynamic depletion estimates', () => {
    const soap = makeProductType({
      id: 'type-soap',
      baseName: 'Jabon liquido',
      defaultDepletionRule: {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'month',
        anchorDate,
      },
    });
    const soapLot = makeInventoryLot({
      id: 'lot-soap',
      productTypeId: 'type-soap',
      quantity: 4,
      unit: QuantityUnit.LITER,
    });

    const overview = buildPantryOverview(
      userId,
      [soap],
      [soapLot],
      referenceDate,
    );

    expect(overview.items[0]).toMatchObject({
      productTypeId: 'type-soap',
      totalQuantity: 4,
      hasDepletionRule: true,
      estimatedConsumedQuantity: 3,
      estimatedCurrentQuantity: 1,
    });
    expect(overview.depletingItems).toHaveLength(1);
    expect(overview.depletingItems[0]).toMatchObject({
      productTypeId: 'type-soap',
      estimatedCurrentQuantity: 1,
      estimatedConsumedQuantity: 3,
    });
  });

  it('excludes product types without an active depletion rule from depletion alerts', () => {
    const tuna = makeProductType({
      id: 'type-tuna',
      baseName: 'Atun',
      defaultDepletionRule: undefined,
    });
    const tunaLot = makeInventoryLot({
      id: 'lot-tuna',
      productTypeId: 'type-tuna',
      quantity: 1,
      unit: QuantityUnit.PIECE,
    });

    const overview = buildPantryOverview(
      userId,
      [tuna],
      [tunaLot],
      referenceDate,
    );

    expect(overview.items[0]).toMatchObject({
      productTypeId: 'type-tuna',
      totalQuantity: 1,
      hasDepletionRule: false,
      estimatedConsumedQuantity: undefined,
      estimatedCurrentQuantity: undefined,
    });
    expect(overview.depletingItems).toEqual([]);
  });

  it('builds a sorted shopping plan from active depletion forecasts', () => {
    const depletedSoap = makeProductType({
      id: 'type-depleted-soap',
      baseName: 'Jabon de manos',
      defaultDepletionRule: {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'day',
        anchorDate: new Date('2026-04-20T00:00:00.000Z'),
      },
    });
    const upcomingDetergent = makeProductType({
      id: 'type-detergent',
      baseName: 'Detergente',
      defaultDepletionRule: {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'week',
        anchorDate: new Date('2026-04-17T00:00:00.000Z'),
      },
    });
    const noRuleTuna = makeProductType({
      id: 'type-tuna',
      baseName: 'Atun',
      defaultDepletionRule: undefined,
    });

    const overview = buildPantryOverview(
      userId,
      [upcomingDetergent, noRuleTuna, depletedSoap],
      [
        makeInventoryLot({
          id: 'lot-detergent',
          productTypeId: 'type-detergent',
          quantity: 2,
          unit: QuantityUnit.LITER,
        }),
        makeInventoryLot({
          id: 'lot-tuna',
          productTypeId: 'type-tuna',
          quantity: 12,
          unit: QuantityUnit.PIECE,
        }),
        makeInventoryLot({
          id: 'lot-soap',
          productTypeId: 'type-depleted-soap',
          quantity: 2,
          unit: QuantityUnit.LITER,
        }),
      ],
      referenceDate,
    );

    expect(overview.shoppingPlanItems).toEqual([
      expect.objectContaining({
        productTypeId: 'type-depleted-soap',
        baseName: 'Jabon de manos',
        urgency: 'depleted',
        suggestedPurchaseQuantity: 1,
        recommendedPurchaseAt: referenceDate,
      }),
      expect.objectContaining({
        productTypeId: 'type-detergent',
        baseName: 'Detergente',
        urgency: 'critical',
        suggestedPurchaseQuantity: 1,
        recommendedPurchaseAt: new Date('2026-04-28T00:00:00.000Z'),
        estimatedDepletionAt: new Date('2026-05-01T00:00:00.000Z'),
      }),
    ]);
  });

  it('separates expired lots from today-critical lots and includes them in priority groups', () => {
    const tuna = makeProductType({
      id: 'type-tuna',
      baseName: 'Atun',
    });

    const overview = buildPantryOverview(
      userId,
      [tuna],
      [
        makeInventoryLot({
          id: 'lot-expired',
          productTypeId: 'type-tuna',
          quantity: 2,
          unit: QuantityUnit.PIECE,
          expiresAt: new Date('2026-04-23T00:00:00.000Z'),
        }),
        makeInventoryLot({
          id: 'lot-critical',
          productTypeId: 'type-tuna',
          quantity: 1,
          unit: QuantityUnit.PIECE,
          expiresAt: new Date('2026-04-24T23:59:00.000Z'),
        }),
      ],
      referenceDate,
    );

    expect(overview.items[0].lots.map((lot) => lot.expirationStatus)).toEqual([
      'expired',
      'critical',
    ]);
    expect(overview.expiringItems[0]).toMatchObject({
      productTypeId: 'type-tuna',
      totalExpiringQuantity: 3,
      lotCount: 2,
    });
  });

  it('uses configured expiration warning days instead of the hardcoded seven-day window', () => {
    const apples = makeProductType({
      id: 'type-apples',
      baseName: 'Manzanas',
    });
    const applesLot = makeInventoryLot({
      id: 'lot-apples',
      productTypeId: 'type-apples',
      quantity: 10,
      unit: QuantityUnit.PIECE,
      expiresAt: new Date('2026-04-29T00:00:00.000Z'),
    });

    const overview = buildPantryOverview(
      userId,
      [apples],
      [applesLot],
      referenceDate,
      {
        expirationWarningDays: 3,
        showExpiredEntryAlert: true,
        depletionWarningThresholdRatio: 1,
        shoppingPlanLeadDays: 3,
      },
    );

    expect(overview.items[0].lots[0].expirationStatus).toBe('stable');
    expect(overview.expiringItems).toEqual([]);
  });

  it('uses configured depletion threshold ratio for low-durability alerts', () => {
    const detergent = makeProductType({
      id: 'type-detergent-threshold',
      baseName: 'Detergente',
      defaultDepletionRule: {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'month',
        anchorDate,
      },
    });
    const detergentLot = makeInventoryLot({
      id: 'lot-detergent-threshold',
      productTypeId: 'type-detergent-threshold',
      quantity: 5,
      unit: QuantityUnit.LITER,
    });

    const overview = buildPantryOverview(
      userId,
      [detergent],
      [detergentLot],
      referenceDate,
      {
        expirationWarningDays: 7,
        showExpiredEntryAlert: true,
        depletionWarningThresholdRatio: 2,
        shoppingPlanLeadDays: 3,
      },
    );

    expect(overview.items[0].estimatedCurrentQuantity).toBe(2);
    expect(overview.depletingItems).toHaveLength(1);
  });

  it('uses configured shopping plan lead days for recommended purchase dates', () => {
    const detergent = makeProductType({
      id: 'type-detergent-lead',
      baseName: 'Detergente',
      defaultDepletionRule: {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'week',
        anchorDate: new Date('2026-04-17T00:00:00.000Z'),
      },
    });

    const overview = buildPantryOverview(
      userId,
      [detergent],
      [
        makeInventoryLot({
          id: 'lot-detergent-lead',
          productTypeId: 'type-detergent-lead',
          quantity: 2,
          unit: QuantityUnit.LITER,
        }),
      ],
      referenceDate,
      {
        expirationWarningDays: 7,
        showExpiredEntryAlert: true,
        depletionWarningThresholdRatio: 1,
        shoppingPlanLeadDays: 7,
      },
    );

    expect(overview.shoppingPlanItems[0]).toMatchObject({
      productTypeId: 'type-detergent-lead',
      recommendedPurchaseAt: referenceDate,
      estimatedDepletionAt: new Date('2026-05-01T00:00:00.000Z'),
    });
  });

  it('ages depletion estimates from each lot purchase date when available', () => {
    const detergent = makeProductType({
      id: 'type-detergent-purchase-date',
      baseName: 'Detergente',
      defaultDepletionRule: {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'month',
        anchorDate: referenceDate,
      },
    });
    const olderLot = makeInventoryLot({
      id: 'lot-detergent-purchase-date',
      productTypeId: 'type-detergent-purchase-date',
      quantity: 3,
      unit: QuantityUnit.LITER,
      purchaseDate: new Date('2026-03-24T00:00:00.000Z'),
    });

    const overview = buildPantryOverview(
      userId,
      [detergent],
      [olderLot],
      referenceDate,
    );

    expect(overview.items[0]).toMatchObject({
      totalQuantity: 3,
      estimatedConsumedQuantity: 1,
      estimatedCurrentQuantity: 2,
      estimatedDepletionAt: new Date('2026-06-24T00:00:00.000Z'),
    });
  });

  it('keeps active planned product types in the overview and shopping plan after stock reaches zero', () => {
    const soap = makeProductType({
      id: 'type-empty-soap',
      baseName: 'Jabon liquido',
      defaultDepletionRule: {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'month',
        anchorDate,
      },
    });

    const overview = buildPantryOverview(userId, [soap], [], referenceDate);

    expect(overview.items).toEqual([
      expect.objectContaining({
        productTypeId: 'type-empty-soap',
        totalQuantity: 0,
        lotCount: 0,
        hasDepletionRule: true,
        estimatedCurrentQuantity: 0,
      }),
    ]);
    expect(overview.shoppingPlanItems).toEqual([
      expect.objectContaining({
        productTypeId: 'type-empty-soap',
        urgency: 'depleted',
        recommendedPurchaseAt: referenceDate,
      }),
    ]);
  });

  it('includes purchase dates in lot summaries', () => {
    const apples = makeProductType({
      id: 'type-apples-purchase-date',
      baseName: 'Manzanas',
    });
    const purchaseDate = new Date('2026-04-10T00:00:00.000Z');

    const overview = buildPantryOverview(
      userId,
      [apples],
      [
        makeInventoryLot({
          id: 'lot-apples-purchase-date',
          productTypeId: 'type-apples-purchase-date',
          quantity: 6,
          unit: QuantityUnit.PIECE,
          purchaseDate,
        }),
      ],
      referenceDate,
    );

    expect(overview.items[0].lots[0]).toMatchObject({
      lotId: 'lot-apples-purchase-date',
      purchaseDate,
    });
  });

  it('marks shopping items as critical when estimated depletion is within seven days', () => {
    const shampoo = makeProductType({
      id: 'type-critical-shampoo',
      baseName: 'Shampoo',
      defaultDepletionRule: {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'week',
        anchorDate: new Date('2026-04-17T00:00:00.000Z'),
      },
    });

    const overview = buildPantryOverview(
      userId,
      [shampoo],
      [
        makeInventoryLot({
          id: 'lot-critical-shampoo',
          productTypeId: 'type-critical-shampoo',
          quantity: 2,
          unit: QuantityUnit.LITER,
        }),
      ],
      referenceDate,
      {
        expirationWarningDays: 7,
        showExpiredEntryAlert: true,
        depletionWarningThresholdRatio: 1,
        shoppingPlanLeadDays: 1,
      },
    );

    expect(overview.shoppingPlanItems[0]).toMatchObject({
      productTypeId: 'type-critical-shampoo',
      estimatedDepletionAt: new Date('2026-05-01T00:00:00.000Z'),
      recommendedPurchaseAt: new Date('2026-04-30T00:00:00.000Z'),
      urgency: 'critical',
    });
  });

  it('uses product-type planning overrides instead of profile defaults', () => {
    const apples = makeProductType({
      id: 'type-apples-overrides',
      baseName: 'Manzanas',
      planningSettings: {
        planningEnabled: true,
        expirationWarningDaysOverride: 3,
        depletionWarningThresholdRatioOverride: 2,
        shoppingPlanLeadDaysOverride: 7,
      },
    });

    const overview = buildPantryOverview(
      userId,
      [apples],
      [
        makeInventoryLot({
          id: 'lot-apples-overrides',
          productTypeId: 'type-apples-overrides',
          quantity: 10,
          unit: QuantityUnit.PIECE,
          expiresAt: new Date('2026-04-29T00:00:00.000Z'),
        }),
      ],
      referenceDate,
      {
        expirationWarningDays: 7,
        showExpiredEntryAlert: true,
        depletionWarningThresholdRatio: 1,
        shoppingPlanLeadDays: 3,
        showGuidanceTips: true,
      },
    );

    expect(overview.items[0].effectivePlanningSettings).toEqual({
      planningEnabled: true,
      expirationWarningDays: 3,
      depletionWarningThresholdRatio: 2,
      shoppingPlanLeadDays: 7,
      expirationWarningDaysSource: 'productType',
      depletionWarningThresholdRatioSource: 'productType',
      shoppingPlanLeadDaysSource: 'productType',
    });
    expect(overview.items[0].lots[0].expirationStatus).toBe('stable');
    expect(overview.expiringItems).toEqual([]);
  });

  it('keeps a depletion rule visible but removes paused product types from planning panels', () => {
    const detergent = makeProductType({
      id: 'type-detergent-paused',
      baseName: 'Detergente',
      defaultDepletionRule: {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'month',
        anchorDate,
      },
      planningSettings: {
        planningEnabled: false,
      },
    });

    const overview = buildPantryOverview(
      userId,
      [detergent],
      [
        makeInventoryLot({
          id: 'lot-detergent-paused',
          productTypeId: 'type-detergent-paused',
          quantity: 1,
          unit: QuantityUnit.LITER,
        }),
      ],
      referenceDate,
    );

    expect(overview.items[0]).toMatchObject({
      hasDepletionRule: true,
      effectivePlanningSettings: expect.objectContaining({
        planningEnabled: false,
      }),
    });
    expect(overview.depletingItems).toEqual([]);
    expect(overview.shoppingPlanItems).toEqual([]);
  });

  it('excludes archived product types and archived lots from active overview', () => {
    const archivedType = makeProductType({
      id: 'type-archived',
      baseName: 'Jamon archivado',
      archivedAt: new Date('2026-04-20T00:00:00.000Z'),
    });
    const activeType = makeProductType({
      id: 'type-active',
      baseName: 'Jamon activo',
    });

    const overview = buildPantryOverview(
      userId,
      [archivedType, activeType],
      [
        makeInventoryLot({
          id: 'lot-archived-type',
          productTypeId: 'type-archived',
          quantity: 1,
          unit: QuantityUnit.PIECE,
        }),
        makeInventoryLot({
          id: 'lot-archived-lot',
          productTypeId: 'type-active',
          quantity: 2,
          unit: QuantityUnit.PIECE,
          archivedAt: new Date('2026-04-21T00:00:00.000Z'),
        }),
        makeInventoryLot({
          id: 'lot-active',
          productTypeId: 'type-active',
          quantity: 3,
          unit: QuantityUnit.PIECE,
        }),
      ],
      referenceDate,
    );

    expect(overview.items).toEqual([
      expect.objectContaining({
        productTypeId: 'type-active',
        totalQuantity: 3,
        lotCount: 1,
        lots: [
          expect.objectContaining({
            lotId: 'lot-active',
          }),
        ],
      }),
    ]);
  });

  function makeProductType(input: {
    id: string;
    baseName: string;
    category?: ProductCategory;
    planningSettings?: {
      planningEnabled: boolean;
      expirationWarningDaysOverride?: number;
      depletionWarningThresholdRatioOverride?: number;
      shoppingPlanLeadDaysOverride?: number;
    };
    archivedAt?: Date;
    defaultDepletionRule?: {
      enabled: boolean;
      consumeAmount: number;
      unit: QuantityUnit;
      everyAmount: number;
      everyPeriod: 'day' | 'week' | 'month';
      anchorDate: Date;
    };
  }): ProductType {
    return ProductType.fromPrimitives({
      id: input.id,
      userId,
      baseName: input.baseName,
      category: input.category ?? ProductCategory.CLEANING,
      defaultUnit: input.defaultDepletionRule?.unit ?? QuantityUnit.PIECE,
      defaultDepletionRule: input.defaultDepletionRule,
      planningSettings: input.planningSettings,
      archivedAt: input.archivedAt,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }

  function makeInventoryLot(input: {
    id: string;
    productTypeId: string;
    quantity: number;
    unit: QuantityUnit;
    expiresAt?: Date;
    purchaseDate?: Date;
    archivedAt?: Date;
  }): InventoryLot {
    return InventoryLot.fromPrimitives({
      id: input.id,
      userId,
      productTypeId: input.productTypeId,
      quantity: input.quantity,
      unit: input.unit,
      expiresAt: input.expiresAt,
      purchaseDate: input.purchaseDate,
      archivedAt: input.archivedAt,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }
});
