import { PantryOverview } from '../../shared/models/pantry.model';

export interface PantryState {
  overview: PantryOverview | null;
  loading: boolean;
  error: string | null;
}

export const initialPantryState: PantryState = {
  overview: null,
  loading: false,
  error: null,
};
