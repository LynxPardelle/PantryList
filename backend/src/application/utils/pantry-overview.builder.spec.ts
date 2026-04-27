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
  }): InventoryLot {
    return InventoryLot.fromPrimitives({
      id: input.id,
      userId,
      productTypeId: input.productTypeId,
      quantity: input.quantity,
      unit: input.unit,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }
});
