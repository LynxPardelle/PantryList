import { createReducer, on } from '@ngrx/store';
import * as PantryActions from './pantry.actions';
import { initialPantryState } from './pantry.state';

export const pantryReducer = createReducer(
  initialPantryState,
  on(PantryActions.loadPantryOverview, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(PantryActions.loadPantryOverviewSuccess, (state, { overview }) => ({
    ...state,
    overview,
    loading: false,
    loaded: true,
    error: null,
  })),
  on(PantryActions.loadPantryOverviewFailure, (state, { error }) => ({
    ...state,
    loading: false,
    loaded: true,
    error,
  })),
  on(PantryActions.resetPantry, () => ({
    ...initialPantryState,
  })),
);
