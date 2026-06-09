import {
  HouseholdActivityPrimitives,
  HouseholdInvitePrimitives,
  HouseholdMembershipPrimitives,
  HouseholdPrimitives,
} from '../../domain/entities/household.entity';

export interface HouseholdWorkspace {
  household: HouseholdPrimitives;
  currentMember: HouseholdMembershipPrimitives;
  members: HouseholdMembershipPrimitives[];
  invites: HouseholdInvitePrimitives[];
  activities: HouseholdActivityPrimitives[];
}
