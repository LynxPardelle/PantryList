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
        urgency: 'upcoming',
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

  function makeProductType(input: {
    id: string;
    baseName: string;
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
      category: ProductCategory.CLEANING,
      defaultUnit: input.defaultDepletionRule?.unit ?? QuantityUnit.PIECE,
      defaultDepletionRule: input.defaultDepletionRule,
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
  }): InventoryLot {
    return InventoryLot.fromPrimitives({
      id: input.id,
      userId,
      productTypeId: input.productTypeId,
      quantity: input.quantity,
      unit: input.unit,
      expiresAt: input.expiresAt,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }
});
