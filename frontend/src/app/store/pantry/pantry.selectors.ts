import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PantryOverviewItem } from '../../shared/models/pantry.model';
import { PantryState } from './pantry.state';

export interface PantrySummary {
  totalTypes: number;
  totalLots: number;
  expiringTypes: number;
  depletingTypes: number;
  shoppingPlanTypes: number;
  criticalLots: number;
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

export const selectPantrySummary = createSelector(
  selectPantryGroups,
  selectExpiringGroups,
  selectDepletingGroups,
  selectShoppingPlanItems,
  (groups, expiringGroups, depletingGroups, shoppingPlanItems): PantrySummary => ({
    totalTypes: groups.length,
    totalLots: groups.reduce((sum, group) => sum + group.lotCount, 0),
    expiringTypes: expiringGroups.length,
    depletingTypes: depletingGroups.length,
    shoppingPlanTypes: shoppingPlanItems.length,
    criticalLots: groups.reduce(
      (sum, group) =>
        sum +
        group.lots.filter((lot) => lot.expirationStatus === 'critical').length,
      0,
    ),
  }),
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
