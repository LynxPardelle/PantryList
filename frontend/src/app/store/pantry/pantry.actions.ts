import { createAction, props } from '@ngrx/store';
import { PantryOverview } from '../../shared/models/pantry.model';

export const loadPantryOverview = createAction(
  '[Pantry] Load Overview',
);

export const loadPantryOverviewSuccess = createAction(
  '[Pantry] Load Overview Success',
  props<{ overview: PantryOverview }>(),
);

export const loadPantryOverviewFailure = createAction(
  '[Pantry] Load Overview Failure',
  props<{ error: string }>(),
);

export const resetPantry = createAction('[Pantry] Reset');
