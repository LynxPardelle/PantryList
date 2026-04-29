import { UserAccountStatus } from '../../domain/enums';
import { UserPreferencesPrimitives } from '../../domain/value-objects/user-preferences.vo';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  status: UserAccountStatus;
  connectedIdentityCount: number;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferencesPrimitives;
}
