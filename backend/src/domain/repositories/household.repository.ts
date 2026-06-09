import {
  Household,
  HouseholdActivity,
  HouseholdInvite,
  HouseholdMembership,
} from '../entities/household.entity';

export interface HouseholdRepository {
  saveHousehold(household: Household): Promise<Household>;
  saveMembership(membership: HouseholdMembership): Promise<HouseholdMembership>;
  saveInvite(invite: HouseholdInvite): Promise<HouseholdInvite>;
  saveActivity(activity: HouseholdActivity): Promise<HouseholdActivity>;
  findHouseholdById(id: string): Promise<Household | null>;
  findMembershipByUserId(userId: string): Promise<HouseholdMembership | null>;
  findMembershipByHouseholdAndUserId(
    householdId: string,
    userId: string,
  ): Promise<HouseholdMembership | null>;
  findMembersByHouseholdId(householdId: string): Promise<HouseholdMembership[]>;
  deleteMembership(householdId: string, userId: string): Promise<void>;
  findActiveInvitesByHouseholdId(
    householdId: string,
    now: Date,
  ): Promise<HouseholdInvite[]>;
  findInviteById(id: string): Promise<HouseholdInvite | null>;
  findInviteByTokenHash(tokenHash: string): Promise<HouseholdInvite | null>;
  findActivitiesByHouseholdId(
    householdId: string,
    limit: number,
  ): Promise<HouseholdActivity[]>;
  deleteHouseholdCascade(householdId: string): Promise<void>;
}
