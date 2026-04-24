import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { ProductType } from '../../domain/entities/product-type.entity';
import { ExpirationStatus } from '../../domain/enums';
import { calculateDepletionForecast } from '../services/depletion-forecast.service';
import {
  DepletingProductGroup,
  ExpiringProductGroup,
  PantryLotSummary,
  PantryOverview,
  PantryOverviewItem,
} from '../read-models/pantry-overview.read-model';

export function buildPantryOverview(
  userId: string,
  productTypes: ProductType[],
  inventoryLots: InventoryLot[],
  referenceDate: Date = new Date(),
): PantryOverview {
  const productTypeMap = new Map(
    productTypes.map((productType) => [productType.id.toString(), productType]),
  );

  const groupedItems = new Map<
    string,
    PantryOverviewItem & { variantSet: Set<string> }
  >();

  for (const inventoryLot of inventoryLots) {
    const productType = productTypeMap.get(
      inventoryLot.productTypeId.toString(),
    );

    if (!productType) {
      continue;
    }

    const groupKey = productType.id.toString();
    const existingGroup = groupedItems.get(groupKey) ?? {
      productTypeId: groupKey,
      baseName: productType.baseName,
      category: productType.category,
      defaultUnit: productType.defaultUnit,
      totalQuantity: 0,
      lotCount: 0,
      nextExpirationAt: undefined,
      expiringSoonQuantity: 0,
      hasDepletionRule: false,
      variants: [],
      lots: [],
      variantSet: new Set<string>(),
    };

    const lotSummary = toLotSummary(inventoryLot, referenceDate);

    existingGroup.totalQuantity = Number(
      (existingGroup.totalQuantity + inventoryLot.quantity).toFixed(2),
    );
    existingGroup.lotCount += 1;
    existingGroup.lots.push(lotSummary);

    if (inventoryLot.variantName) {
      existingGroup.variantSet.add(inventoryLot.variantName);
    }

    if (
      inventoryLot.expiresAt &&
      (!existingGroup.nextExpirationAt ||
        inventoryLot.expiresAt < existingGroup.nextExpirationAt)
    ) {
      existingGroup.nextExpirationAt = inventoryLot.expiresAt;
    }

    if (inventoryLot.isExpiringWithinDays(7, referenceDate)) {
      existingGroup.expiringSoonQuantity = Number(
        (existingGroup.expiringSoonQuantity + inventoryLot.quantity).toFixed(2),
      );
    }

    groupedItems.set(groupKey, existingGroup);
  }

  const items = Array.from(groupedItems.values())
    .map(({ variantSet, ...group }) => {
      const productType = productTypeMap.get(group.productTypeId);
      const depletionForecast = calculateDepletionForecast(
        productType?.defaultDepletionRule,
        group.totalQuantity,
        referenceDate,
      );

      return {
        ...group,
        hasDepletionRule: Boolean(depletionForecast),
        depletionRule: depletionForecast?.depletionRule,
        estimatedCurrentQuantity: depletionForecast?.estimatedCurrentQuantity,
        estimatedConsumedQuantity: depletionForecast?.estimatedConsumedQuantity,
        estimatedDepletionAt: depletionForecast?.estimatedDepletionAt,
        variants: Array.from(variantSet).sort(compareText),
        lots: [...group.lots].sort(compareLotSummary),
      };
    })
    .sort(compareGroupSummary);

  const expiringItems = items
    .filter((item) => item.expiringSoonQuantity > 0)
    .map<ExpiringProductGroup>((item) => ({
      productTypeId: item.productTypeId,
      baseName: item.baseName,
      category: item.category,
      totalExpiringQuantity: item.expiringSoonQuantity,
      nextExpirationAt: item.nextExpirationAt,
      lotCount: item.lots.filter(
        (lot) =>
          lot.expirationStatus === ExpirationStatus.CRITICAL ||
          lot.expirationStatus === ExpirationStatus.SOON,
      ).length,
      lots: item.lots.filter(
        (lot) =>
          lot.expirationStatus === ExpirationStatus.CRITICAL ||
          lot.expirationStatus === ExpirationStatus.SOON,
      ),
    }))
    .sort(compareExpiringGroup);

  const depletingItems = items
    .filter(
      (item) =>
        item.hasDepletionRule &&
        item.depletionRule &&
        item.estimatedCurrentQuantity !== undefined &&
        item.estimatedCurrentQuantity <= item.depletionRule.consumeAmount,
    )
    .map<DepletingProductGroup>((item) => ({
      productTypeId: item.productTypeId,
      baseName: item.baseName,
      category: item.category,
      defaultUnit: item.defaultUnit,
      totalQuantity: item.totalQuantity,
      estimatedCurrentQuantity: item.estimatedCurrentQuantity ?? 0,
      estimatedConsumedQuantity: item.estimatedConsumedQuantity ?? 0,
      estimatedDepletionAt: item.estimatedDepletionAt ?? referenceDate,
      depletionRule: item.depletionRule!,
    }))
    .sort(compareDepletingGroup);

  return {
    userId,
    generatedAt: referenceDate,
    items,
    expiringItems,
    depletingItems,
  };
}

function toLotSummary(
  inventoryLot: InventoryLot,
  referenceDate: Date,
): PantryLotSummary {
  return {
    lotId: inventoryLot.id.toString(),
    variantName: inventoryLot.variantName,
    quantity: inventoryLot.quantity,
    unit: inventoryLot.unit,
    expiresAt: inventoryLot.expiresAt,
    expirationStatus: inventoryLot.getExpirationStatus(referenceDate),
    updatedAt: inventoryLot.updatedAt,
  };
}

function compareGroupSummary(
  left: PantryOverviewItem,
  right: PantryOverviewItem,
): number {
  if (left.nextExpirationAt && right.nextExpirationAt) {
    const dateDifference =
      left.nextExpirationAt.getTime() - right.nextExpirationAt.getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }
  }

  if (left.nextExpirationAt) {
    return -1;
  }

  if (right.nextExpirationAt) {
    return 1;
  }

  return compareText(left.baseName, right.baseName);
}

function compareExpiringGroup(
  left: ExpiringProductGroup,
  right: ExpiringProductGroup,
): number {
  if (left.nextExpirationAt && right.nextExpirationAt) {
    return left.nextExpirationAt.getTime() - right.nextExpirationAt.getTime();
  }

  if (left.nextExpirationAt) {
    return -1;
  }

  if (right.nextExpirationAt) {
    return 1;
  }

  return compareText(left.baseName, right.baseName);
}

function compareDepletingGroup(
  left: DepletingProductGroup,
  right: DepletingProductGroup,
): number {
  const dateDifference =
    left.estimatedDepletionAt.getTime() - right.estimatedDepletionAt.getTime();

  if (dateDifference !== 0) {
    return dateDifference;
  }

  return compareText(left.baseName, right.baseName);
}

function compareLotSummary(
  left: PantryLotSummary,
  right: PantryLotSummary,
): number {
  if (left.expiresAt && right.expiresAt) {
    const dateDifference = left.expiresAt.getTime() - right.expiresAt.getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }
  }

  if (left.expiresAt) {
    return -1;
  }

  if (right.expiresAt) {
    return 1;
  }

  return right.updatedAt.getTime() - left.updatedAt.getTime();
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'es', { sensitivity: 'base' });
}
