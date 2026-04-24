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
