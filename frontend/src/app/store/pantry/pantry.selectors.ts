import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PantryOverviewItem } from '../../shared/models/pantry.model';
import { PantryState } from './pantry.state';

export interface PantrySummary {
  totalTypes: number;
  totalLots: number;
  expiredLots: number;
  expiringTypes: number;
  depletingTypes: number;
  shoppingPlanTypes: number;
  criticalLots: number;
  stapleTypes: number;
  stapleAttentionTypes: number;
}

export interface ExpiredEntryAlert {
  expiredLotCount: number;
  expiredQuantity: number;
}

export const selectPantryState =
  createFeatureSelector<PantryState>('pantry');

export const selectPantryOverview = createSelector(
  selectPantryState,
  (state) => state.overview,
);

export const selectPantryLoading = createSelector(
  selectPantryState,
  (state) => state.loading,
);

export const selectPantryError = createSelector(
  selectPantryState,
  (state) => state.error,
);

export const selectPantryInitialLoading = createSelector(
  selectPantryState,
  (state) => state.loading && !state.loaded && state.overview === null,
);

export const selectPantryGroups = createSelector(
  selectPantryOverview,
  (overview) => overview?.items ?? [],
);

export const selectExpiringGroups = createSelector(
  selectPantryOverview,
  (overview) => overview?.expiringItems ?? [],
);

export const selectDepletingGroups = createSelector(
  selectPantryOverview,
  (overview) => overview?.depletingItems ?? [],
);

export const selectShoppingPlanItems = createSelector(
  selectPantryOverview,
  (overview) => overview?.shoppingPlanItems ?? [],
);

export const selectShoppingRouteGroups = createSelector(
  selectPantryOverview,
  (overview) => overview?.shoppingRouteGroups ?? [],
);

export const selectPriceReferenceItems = createSelector(
  selectPantryOverview,
  (overview) => overview?.priceReferenceItems ?? [],
);

export const selectStapleItems = createSelector(
  selectPantryOverview,
  (overview) => overview?.stapleItems ?? [],
);

export const selectPantryValueInsights = createSelector(
  selectPantryOverview,
  (overview) =>
    overview?.valueInsights ?? {
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
);

export const selectShowGuidanceTips = createSelector(
  selectPantryOverview,
  (overview) => overview?.preferences.showGuidanceTips ?? true,
);

export const selectPantrySummary = createSelector(
  selectPantryGroups,
  selectExpiringGroups,
  selectDepletingGroups,
  selectShoppingPlanItems,
  selectStapleItems,
  (
    groups,
    expiringGroups,
    depletingGroups,
    shoppingPlanItems,
    stapleItems,
  ): PantrySummary => ({
    totalTypes: groups.length,
    totalLots: groups.reduce((sum, group) => sum + group.lotCount, 0),
    expiredLots: groups.reduce(
      (sum, group) =>
        sum +
        group.lots.filter((lot) => lot.expirationStatus === 'expired').length,
      0,
    ),
    expiringTypes: expiringGroups.length,
    depletingTypes: depletingGroups.length,
    shoppingPlanTypes: shoppingPlanItems.length,
    stapleTypes: stapleItems.length,
    stapleAttentionTypes: stapleItems.filter(
      (item) => item.status !== 'available',
    ).length,
    criticalLots: groups.reduce(
      (sum, group) =>
        sum +
        group.lots.filter((lot) => lot.expirationStatus === 'critical').length,
      0,
    ),
  }),
);

export const selectExpiredEntryAlert = createSelector(
  selectPantryOverview,
  (overview): ExpiredEntryAlert | null => {
    if (!overview?.preferences.showExpiredEntryAlert) {
      return null;
    }

    const expiredLots = overview.items.flatMap((group) =>
      group.lots.filter((lot) => lot.expirationStatus === 'expired'),
    );

    if (expiredLots.length === 0) {
      return null;
    }

    return {
      expiredLotCount: expiredLots.length,
      expiredQuantity: Number(
        expiredLots
          .reduce((sum, lot) => sum + lot.quantity, 0)
          .toFixed(2),
      ),
    };
  },
);

export const selectPantryGroupsSorted = createSelector(
  selectPantryGroups,
  (groups) => [...groups].sort(comparePantryGroup),
);

function comparePantryGroup(
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

  return left.baseName.localeCompare(right.baseName, 'es', {
    sensitivity: 'base',
  });
}
