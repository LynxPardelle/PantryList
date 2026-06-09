import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Household,
  HouseholdActivity,
  HouseholdActivityPrimitives,
  HouseholdInvite,
  HouseholdInvitePrimitives,
  HouseholdMembership,
  HouseholdMembershipPrimitives,
  HouseholdPrimitives,
} from '../../../domain/entities/household.entity';
import { HouseholdRepository } from '../../../domain/repositories/household.repository';
import { HouseholdDocument } from './schemas/household.schema';

type HouseholdRecord = HouseholdPrimitives & {
  pk: string;
  entityType: 'HOUSEHOLD';
};

type MembershipRecord = HouseholdMembershipPrimitives & {
  pk: string;
  entityType: 'HOUSEHOLD_MEMBERSHIP';
  createdAt: Date;
};

type InviteRecord = HouseholdInvitePrimitives & {
  pk: string;
  entityType: 'HOUSEHOLD_INVITE';
};

type ActivityRecord = HouseholdActivityPrimitives & {
  pk: string;
  entityType: 'HOUSEHOLD_ACTIVITY';
};

@Injectable()
export class MongoHouseholdRepository implements HouseholdRepository {
  constructor(
    @InjectModel(HouseholdDocument.name)
    private readonly householdModel: Model<HouseholdDocument>,
  ) {}

  async saveHousehold(household: Household): Promise<Household> {
    const record = this.toHouseholdRecord(household);
    const saved = await this.householdModel
      .findOneAndUpdate({ pk: record.pk }, record, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toHousehold(saved as HouseholdRecord);
  }

  async saveMembership(
    membership: HouseholdMembership,
  ): Promise<HouseholdMembership> {
    const record = this.toMembershipRecord(membership);
    const saved = await this.householdModel
      .findOneAndUpdate({ pk: record.pk }, record, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toMembership(saved as MembershipRecord);
  }

  async saveInvite(invite: HouseholdInvite): Promise<HouseholdInvite> {
    const record = this.toInviteRecord(invite);
    const saved = await this.householdModel
      .findOneAndUpdate({ pk: record.pk }, record, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toInvite(saved as InviteRecord);
  }

  async saveActivity(activity: HouseholdActivity): Promise<HouseholdActivity> {
    const record = this.toActivityRecord(activity);
    const saved = await this.householdModel
      .findOneAndUpdate({ pk: record.pk }, record, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toActivity(saved as ActivityRecord);
  }

  async findHouseholdById(id: string): Promise<Household | null> {
    const record = await this.householdModel
      .findOne({ pk: householdKey(id) })
      .lean()
      .exec();

    return record ? this.toHousehold(record as HouseholdRecord) : null;
  }

  async findMembershipByUserId(
    userId: string,
  ): Promise<HouseholdMembership | null> {
    const record = await this.householdModel
      .findOne({ entityType: 'HOUSEHOLD_MEMBERSHIP', userId })
      .lean()
      .exec();

    return record ? this.toMembership(record as MembershipRecord) : null;
  }

  async findMembershipByHouseholdAndUserId(
    householdId: string,
    userId: string,
  ): Promise<HouseholdMembership | null> {
    const record = await this.householdModel
      .findOne({ pk: membershipKey(householdId, userId) })
      .lean()
      .exec();

    return record ? this.toMembership(record as MembershipRecord) : null;
  }

  async findMembersByHouseholdId(
    householdId: string,
  ): Promise<HouseholdMembership[]> {
    const records = await this.householdModel
      .find({ entityType: 'HOUSEHOLD_MEMBERSHIP', householdId })
      .sort({ joinedAt: 1 })
      .lean()
      .exec();

    return records.map((record) =>
      this.toMembership(record as MembershipRecord),
    );
  }

  async deleteMembership(householdId: string, userId: string): Promise<void> {
    await this.householdModel
      .deleteOne({ pk: membershipKey(householdId, userId) })
      .exec();
  }

  async findActiveInvitesByHouseholdId(
    householdId: string,
    now: Date,
  ): Promise<HouseholdInvite[]> {
    const records = await this.householdModel
      .find({
        entityType: 'HOUSEHOLD_INVITE',
        householdId,
        expiresAt: { $gt: now },
        $and: [
          {
            $or: [{ acceptedAt: { $exists: false } }, { acceptedAt: null }],
          },
          {
            $or: [{ revokedAt: { $exists: false } }, { revokedAt: null }],
          },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()
      .exec();

    return records
      .map((record) => this.toInvite(record as InviteRecord))
      .filter((invite) => invite.isActive(now));
  }

  async findInviteById(id: string): Promise<HouseholdInvite | null> {
    const record = await this.householdModel
      .findOne({ pk: inviteKey(id) })
      .lean()
      .exec();

    return record ? this.toInvite(record as InviteRecord) : null;
  }

  async findInviteByTokenHash(
    tokenHash: string,
  ): Promise<HouseholdInvite | null> {
    const record = await this.householdModel
      .findOne({ entityType: 'HOUSEHOLD_INVITE', tokenHash })
      .lean()
      .exec();

    return record ? this.toInvite(record as InviteRecord) : null;
  }

  async findActivitiesByHouseholdId(
    householdId: string,
    limit: number,
  ): Promise<HouseholdActivity[]> {
    const records = await this.householdModel
      .find({ entityType: 'HOUSEHOLD_ACTIVITY', householdId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return records.map((record) => this.toActivity(record as ActivityRecord));
  }

  async deleteHouseholdCascade(householdId: string): Promise<void> {
    await this.householdModel
      .deleteMany({
        $or: [{ pk: householdKey(householdId) }, { householdId }],
      })
      .exec();
  }

  private toHouseholdRecord(household: Household): HouseholdRecord {
    const primitives = household.toPrimitives();

    return {
      pk: householdKey(primitives.id),
      entityType: 'HOUSEHOLD',
      ...primitives,
    };
  }

  private toMembershipRecord(
    membership: HouseholdMembership,
  ): MembershipRecord {
    const primitives = membership.toPrimitives();

    return {
      pk: membershipKey(primitives.householdId, primitives.userId),
      entityType: 'HOUSEHOLD_MEMBERSHIP',
      ...primitives,
      createdAt: primitives.joinedAt,
    };
  }

  private toInviteRecord(invite: HouseholdInvite): InviteRecord {
    const primitives = invite.toPrimitives();

    return {
      pk: inviteKey(primitives.id),
      entityType: 'HOUSEHOLD_INVITE',
      ...primitives,
    };
  }

  private toActivityRecord(activity: HouseholdActivity): ActivityRecord {
    const primitives = activity.toPrimitives();

    return {
      pk: activityKey(primitives.id),
      entityType: 'HOUSEHOLD_ACTIVITY',
      ...primitives,
    };
  }

  private toHousehold(record: HouseholdRecord): Household {
    return Household.fromPrimitives({
      id: record.id,
      name: record.name,
      ownerUserId: record.ownerUserId,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }

  private toMembership(record: MembershipRecord): HouseholdMembership {
    return HouseholdMembership.fromPrimitives({
      householdId: record.householdId,
      userId: record.userId,
      email: record.email,
      username: record.username,
      role: record.role,
      joinedAt: new Date(record.joinedAt),
      updatedAt: new Date(record.updatedAt),
    });
  }

  private toInvite(record: InviteRecord): HouseholdInvite {
    return HouseholdInvite.fromPrimitives({
      id: record.id,
      householdId: record.householdId,
      invitedEmail: record.invitedEmail,
      invitedByUserId: record.invitedByUserId,
      role: record.role,
      tokenHash: record.tokenHash,
      createdAt: new Date(record.createdAt),
      expiresAt: new Date(record.expiresAt),
      acceptedAt: record.acceptedAt ? new Date(record.acceptedAt) : undefined,
      revokedAt: record.revokedAt ? new Date(record.revokedAt) : undefined,
      updatedAt: new Date(record.updatedAt),
    });
  }

  private toActivity(record: ActivityRecord): HouseholdActivity {
    return HouseholdActivity.fromPrimitives({
      id: record.id,
      householdId: record.householdId,
      type: record.type,
      actorUserId: record.actorUserId,
      targetUserId: record.targetUserId,
      targetLabel: record.targetLabel,
      role: record.role,
      createdAt: new Date(record.createdAt),
    });
  }
}

function householdKey(id: string): string {
  return `HOUSEHOLD#${id}`;
}

function membershipKey(householdId: string, userId: string): string {
  return `HOUSEHOLD#${householdId}#MEMBER#${userId}`;
}

function inviteKey(id: string): string {
  return `HOUSEHOLD_INVITE#${id}`;
}

function activityKey(id: string): string {
  return `HOUSEHOLD_ACTIVITY#${id}`;
}
