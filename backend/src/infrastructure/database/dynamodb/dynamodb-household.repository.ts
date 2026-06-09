import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
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
import { DynamoDbDocumentClientService } from './dynamodb-document-client.service';

type HouseholdItem = Omit<HouseholdPrimitives, 'createdAt' | 'updatedAt'> & {
  pk: string;
  entityType: 'HOUSEHOLD';
  gsi2pk: string;
  gsi2sk: string;
  createdAt: string;
  updatedAt: string;
};

type MembershipItem = Omit<
  HouseholdMembershipPrimitives,
  'joinedAt' | 'updatedAt'
> & {
  pk: string;
  entityType: 'HOUSEHOLD_MEMBERSHIP';
  gsi1pk: string;
  gsi1sk: string;
  gsi2pk: string;
  gsi2sk: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
};

type InviteItem = Omit<
  HouseholdInvitePrimitives,
  'createdAt' | 'expiresAt' | 'acceptedAt' | 'revokedAt' | 'updatedAt'
> & {
  pk: string;
  entityType: 'HOUSEHOLD_INVITE';
  gsi1pk: string;
  gsi1sk: string;
  gsi2pk: string;
  gsi2sk: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  updatedAt: string;
  expiresAtEpochSeconds: number;
};

type ActivityItem = Omit<HouseholdActivityPrimitives, 'createdAt'> & {
  pk: string;
  entityType: 'HOUSEHOLD_ACTIVITY';
  gsi2pk: string;
  gsi2sk: string;
  createdAt: string;
};

@Injectable()
export class DynamoDbHouseholdRepository implements HouseholdRepository {
  private readonly tableName: string;

  constructor(
    private readonly dynamoDb: DynamoDbDocumentClientService,
    configService: ConfigService,
  ) {
    this.tableName = configService.getOrThrow<string>('DYNAMODB_USERS_TABLE');
  }

  async saveHousehold(household: Household): Promise<Household> {
    const item = this.toHouseholdItem(household);

    await this.put(item);

    return this.toHousehold(item);
  }

  async saveMembership(
    membership: HouseholdMembership,
  ): Promise<HouseholdMembership> {
    const item = this.toMembershipItem(membership);

    await this.put(item);

    return this.toMembership(item);
  }

  async saveInvite(invite: HouseholdInvite): Promise<HouseholdInvite> {
    const item = this.toInviteItem(invite);

    await this.put(item);

    return this.toInvite(item);
  }

  async saveActivity(activity: HouseholdActivity): Promise<HouseholdActivity> {
    const item = this.toActivityItem(activity);

    await this.put(item);

    return this.toActivity(item);
  }

  async findHouseholdById(id: string): Promise<Household | null> {
    const result = await this.dynamoDb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: householdKey(id) },
      }),
    );

    return result.Item ? this.toHousehold(result.Item as HouseholdItem) : null;
  }

  async findMembershipByUserId(
    userId: string,
  ): Promise<HouseholdMembership | null> {
    const [item] = await this.query<MembershipItem>({
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': membershipByUserKey(userId),
      },
      Limit: 1,
    });

    if (item) {
      return this.toMembership(item);
    }

    const [legacyItem] = await this.scan<MembershipItem>({
      FilterExpression: '#entityType = :entityType AND userId = :userId',
      ExpressionAttributeNames: {
        '#entityType': 'entityType',
      },
      ExpressionAttributeValues: {
        ':entityType': 'HOUSEHOLD_MEMBERSHIP',
        ':userId': userId,
      },
    });

    return legacyItem ? this.toMembership(legacyItem) : null;
  }

  async findMembershipByHouseholdAndUserId(
    householdId: string,
    userId: string,
  ): Promise<HouseholdMembership | null> {
    const result = await this.dynamoDb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: membershipKey(householdId, userId) },
      }),
    );

    return result.Item
      ? this.toMembership(result.Item as MembershipItem)
      : null;
  }

  async findMembersByHouseholdId(
    householdId: string,
  ): Promise<HouseholdMembership[]> {
    const items = await this.query<MembershipItem>({
      IndexName: 'gsi2',
      KeyConditionExpression:
        'gsi2pk = :gsi2pk AND begins_with(gsi2sk, :memberPrefix)',
      ExpressionAttributeValues: {
        ':gsi2pk': householdRecordsKey(householdId),
        ':memberPrefix': 'MEMBER#',
      },
    });

    if (items.length > 0) {
      return items.map((item) => this.toMembership(item));
    }

    const legacyItems = await this.scan<MembershipItem>({
      FilterExpression:
        '#entityType = :entityType AND householdId = :householdId',
      ExpressionAttributeNames: {
        '#entityType': 'entityType',
      },
      ExpressionAttributeValues: {
        ':entityType': 'HOUSEHOLD_MEMBERSHIP',
        ':householdId': householdId,
      },
    });

    return legacyItems
      .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))
      .map((item) => this.toMembership(item));
  }

  async deleteMembership(householdId: string, userId: string): Promise<void> {
    await this.dynamoDb.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { pk: membershipKey(householdId, userId) },
      }),
    );
  }

  async findActiveInvitesByHouseholdId(
    householdId: string,
    now: Date,
  ): Promise<HouseholdInvite[]> {
    const items = await this.query<InviteItem>({
      IndexName: 'gsi2',
      KeyConditionExpression:
        'gsi2pk = :gsi2pk AND begins_with(gsi2sk, :invitePrefix)',
      ScanIndexForward: false,
      ExpressionAttributeValues: {
        ':gsi2pk': householdRecordsKey(householdId),
        ':invitePrefix': 'INVITE#',
      },
    });

    const indexedInvites = items
      .map((item) => this.toInvite(item))
      .filter((invite) => invite.isActive(now))
      .slice(0, 25);

    if (indexedInvites.length > 0) {
      return indexedInvites;
    }

    const legacyItems = await this.scan<InviteItem>({
      FilterExpression:
        '#entityType = :entityType AND householdId = :householdId AND expiresAt > :now AND attribute_not_exists(acceptedAt) AND attribute_not_exists(revokedAt)',
      ExpressionAttributeNames: {
        '#entityType': 'entityType',
      },
      ExpressionAttributeValues: {
        ':entityType': 'HOUSEHOLD_INVITE',
        ':householdId': householdId,
        ':now': now.toISOString(),
      },
    });

    return legacyItems
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 25)
      .map((item) => this.toInvite(item));
  }

  async findInviteById(id: string): Promise<HouseholdInvite | null> {
    const result = await this.dynamoDb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: inviteKey(id) },
      }),
    );

    return result.Item ? this.toInvite(result.Item as InviteItem) : null;
  }

  async findInviteByTokenHash(
    tokenHash: string,
  ): Promise<HouseholdInvite | null> {
    const [item] = await this.query<InviteItem>({
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': inviteByTokenKey(tokenHash),
      },
      Limit: 1,
    });

    if (item) {
      return this.toInvite(item);
    }

    const [legacyItem] = await this.scan<InviteItem>({
      FilterExpression: '#entityType = :entityType AND tokenHash = :tokenHash',
      ExpressionAttributeNames: {
        '#entityType': 'entityType',
      },
      ExpressionAttributeValues: {
        ':entityType': 'HOUSEHOLD_INVITE',
        ':tokenHash': tokenHash,
      },
    });

    return legacyItem ? this.toInvite(legacyItem) : null;
  }

  async findActivitiesByHouseholdId(
    householdId: string,
    limit: number,
  ): Promise<HouseholdActivity[]> {
    const items = await this.query<ActivityItem>({
      IndexName: 'gsi2',
      KeyConditionExpression:
        'gsi2pk = :gsi2pk AND begins_with(gsi2sk, :activityPrefix)',
      ScanIndexForward: false,
      Limit: limit,
      ExpressionAttributeValues: {
        ':gsi2pk': householdRecordsKey(householdId),
        ':activityPrefix': 'ACTIVITY#',
      },
    });

    if (items.length > 0) {
      return items.map((item) => this.toActivity(item));
    }

    const legacyItems = await this.scan<ActivityItem>({
      FilterExpression:
        '#entityType = :entityType AND householdId = :householdId',
      ExpressionAttributeNames: {
        '#entityType': 'entityType',
      },
      ExpressionAttributeValues: {
        ':entityType': 'HOUSEHOLD_ACTIVITY',
        ':householdId': householdId,
      },
    });

    return legacyItems
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit)
      .map((item) => this.toActivity(item));
  }

  async deleteHouseholdCascade(householdId: string): Promise<void> {
    const indexedItems = await this.query<
      HouseholdItem | MembershipItem | InviteItem | ActivityItem
    >({
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :gsi2pk',
      ExpressionAttributeValues: {
        ':gsi2pk': householdRecordsKey(householdId),
      },
    });
    const legacyItems = await this.scan<
      HouseholdItem | MembershipItem | InviteItem | ActivityItem
    >({
      FilterExpression: 'pk = :householdPk OR householdId = :householdId',
      ExpressionAttributeValues: {
        ':householdPk': householdKey(householdId),
        ':householdId': householdId,
      },
    });
    const items = deduplicateByPk([...indexedItems, ...legacyItems]);

    await Promise.all(
      items.map((item) =>
        this.dynamoDb.send(
          new DeleteCommand({
            TableName: this.tableName,
            Key: { pk: item.pk },
          }),
        ),
      ),
    );
  }

  private async put(
    item: HouseholdItem | MembershipItem | InviteItem | ActivityItem,
  ): Promise<void> {
    await this.dynamoDb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
  }

  private async scan<T>(
    input: Omit<ConstructorParameters<typeof ScanCommand>[0], 'TableName'>,
  ): Promise<T[]> {
    const items: T[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const result = await this.dynamoDb.send(
        new ScanCommand({
          TableName: this.tableName,
          ...input,
          ...(exclusiveStartKey
            ? { ExclusiveStartKey: exclusiveStartKey }
            : {}),
        }),
      );

      items.push(...((result.Items ?? []) as T[]));
      exclusiveStartKey = result.LastEvaluatedKey as
        | Record<string, unknown>
        | undefined;
    } while (exclusiveStartKey);

    return items;
  }

  private async query<T>(
    input: Omit<ConstructorParameters<typeof QueryCommand>[0], 'TableName'>,
  ): Promise<T[]> {
    const items: T[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const result = await this.dynamoDb.send(
        new QueryCommand({
          TableName: this.tableName,
          ...input,
          ...(exclusiveStartKey
            ? { ExclusiveStartKey: exclusiveStartKey }
            : {}),
        }),
      );

      items.push(...((result.Items ?? []) as T[]));
      exclusiveStartKey = result.LastEvaluatedKey as
        | Record<string, unknown>
        | undefined;
    } while (exclusiveStartKey && !input.Limit);

    return items;
  }

  private toHouseholdItem(household: Household): HouseholdItem {
    const primitives = household.toPrimitives();

    return {
      pk: householdKey(primitives.id),
      entityType: 'HOUSEHOLD',
      gsi2pk: householdRecordsKey(primitives.id),
      gsi2sk: 'HOUSEHOLD',
      id: primitives.id,
      name: primitives.name,
      ownerUserId: primitives.ownerUserId,
      createdAt: primitives.createdAt.toISOString(),
      updatedAt: primitives.updatedAt.toISOString(),
    };
  }

  private toMembershipItem(membership: HouseholdMembership): MembershipItem {
    const primitives = membership.toPrimitives();

    return {
      pk: membershipKey(primitives.householdId, primitives.userId),
      entityType: 'HOUSEHOLD_MEMBERSHIP',
      gsi1pk: membershipByUserKey(primitives.userId),
      gsi1sk: primitives.householdId,
      gsi2pk: householdRecordsKey(primitives.householdId),
      gsi2sk: `MEMBER#${primitives.joinedAt.toISOString()}#USER#${primitives.userId}`,
      householdId: primitives.householdId,
      userId: primitives.userId,
      email: primitives.email,
      username: primitives.username,
      role: primitives.role,
      joinedAt: primitives.joinedAt.toISOString(),
      createdAt: primitives.joinedAt.toISOString(),
      updatedAt: primitives.updatedAt.toISOString(),
    };
  }

  private toInviteItem(invite: HouseholdInvite): InviteItem {
    const primitives = invite.toPrimitives();

    return {
      pk: inviteKey(primitives.id),
      entityType: 'HOUSEHOLD_INVITE',
      gsi1pk: inviteByTokenKey(primitives.tokenHash),
      gsi1sk: primitives.id,
      gsi2pk: householdRecordsKey(primitives.householdId),
      gsi2sk: `INVITE#${primitives.createdAt.toISOString()}#${primitives.id}`,
      id: primitives.id,
      householdId: primitives.householdId,
      invitedEmail: primitives.invitedEmail,
      invitedByUserId: primitives.invitedByUserId,
      role: primitives.role,
      tokenHash: primitives.tokenHash,
      createdAt: primitives.createdAt.toISOString(),
      expiresAt: primitives.expiresAt.toISOString(),
      acceptedAt: primitives.acceptedAt?.toISOString(),
      revokedAt: primitives.revokedAt?.toISOString(),
      updatedAt: primitives.updatedAt.toISOString(),
      expiresAtEpochSeconds: Math.floor(primitives.expiresAt.getTime() / 1000),
    };
  }

  private toActivityItem(activity: HouseholdActivity): ActivityItem {
    const primitives = activity.toPrimitives();

    return {
      pk: activityKey(primitives.id),
      entityType: 'HOUSEHOLD_ACTIVITY',
      gsi2pk: householdRecordsKey(primitives.householdId),
      gsi2sk: `ACTIVITY#${primitives.createdAt.toISOString()}#${primitives.id}`,
      id: primitives.id,
      householdId: primitives.householdId,
      type: primitives.type,
      actorUserId: primitives.actorUserId,
      targetUserId: primitives.targetUserId,
      targetLabel: primitives.targetLabel,
      role: primitives.role,
      createdAt: primitives.createdAt.toISOString(),
    };
  }

  private toHousehold(item: HouseholdItem): Household {
    return Household.fromPrimitives({
      id: item.id,
      name: item.name,
      ownerUserId: item.ownerUserId,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    });
  }

  private toMembership(item: MembershipItem): HouseholdMembership {
    return HouseholdMembership.fromPrimitives({
      householdId: item.householdId,
      userId: item.userId,
      email: item.email,
      username: item.username,
      role: item.role,
      joinedAt: new Date(item.joinedAt),
      updatedAt: new Date(item.updatedAt),
    });
  }

  private toInvite(item: InviteItem): HouseholdInvite {
    return HouseholdInvite.fromPrimitives({
      id: item.id,
      householdId: item.householdId,
      invitedEmail: item.invitedEmail,
      invitedByUserId: item.invitedByUserId,
      role: item.role,
      tokenHash: item.tokenHash,
      createdAt: new Date(item.createdAt),
      expiresAt: new Date(item.expiresAt),
      acceptedAt: item.acceptedAt ? new Date(item.acceptedAt) : undefined,
      revokedAt: item.revokedAt ? new Date(item.revokedAt) : undefined,
      updatedAt: new Date(item.updatedAt),
    });
  }

  private toActivity(item: ActivityItem): HouseholdActivity {
    return HouseholdActivity.fromPrimitives({
      id: item.id,
      householdId: item.householdId,
      type: item.type,
      actorUserId: item.actorUserId,
      targetUserId: item.targetUserId,
      targetLabel: item.targetLabel,
      role: item.role,
      createdAt: new Date(item.createdAt),
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

function householdRecordsKey(householdId: string): string {
  return `HOUSEHOLD#${householdId}`;
}

function membershipByUserKey(userId: string): string {
  return `HOUSEHOLD_MEMBER_BY_USER#${userId}`;
}

function inviteByTokenKey(tokenHash: string): string {
  return `HOUSEHOLD_INVITE_BY_TOKEN#${tokenHash}`;
}

function deduplicateByPk<T extends { pk: string }>(items: T[]): T[] {
  const uniqueItems = new Map<string, T>();

  items.forEach((item) => uniqueItems.set(item.pk, item));

  return [...uniqueItems.values()];
}
