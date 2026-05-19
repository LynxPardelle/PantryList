export interface UserPreferences {
  expirationWarningDays: number;
  showExpiredEntryAlert: boolean;
  depletionWarningThresholdRatio: number;
  shoppingPlanLeadDays: number;
  showGuidanceTips: boolean;
}

export type UserPreferencesUpdate = Partial<UserPreferences>;

export interface DeletePantryDataRequest {
  confirmationText: string;
}

export interface DeletePantryDataResult {
  deletedInventoryLotCount: number;
  deletedProductTypeCount: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  status: 'active' | 'disabled';
  connectedIdentityCount: number;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
}

export interface ApiUserProfile {
  id: string;
  email: string;
  username: string;
  status: 'active' | 'disabled';
  connectedIdentityCount: number;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
}
