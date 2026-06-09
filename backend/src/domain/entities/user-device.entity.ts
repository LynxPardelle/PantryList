import { UserId } from '../value-objects/user-id.vo';

export interface UserDevicePrimitives {
  id: string;
  userId: string;
  label: string;
  userAgentSummary: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  seenCount: number;
}

export class UserDevice {
  private constructor(
    private readonly _id: string,
    private readonly _userId: UserId,
    private _label: string,
    private _userAgentSummary: string,
    private readonly _firstSeenAt: Date,
    private _lastSeenAt: Date,
    private _seenCount: number,
  ) {}

  static create(input: {
    id: string;
    userId: UserId;
    label: string;
    userAgentSummary: string;
    now?: Date;
  }): UserDevice {
    const now = input.now ?? new Date();

    return new UserDevice(
      normalizeDeviceId(input.id),
      input.userId,
      normalizeLimitedText(input.label, 80, 'Device label is required'),
      normalizeLimitedText(
        input.userAgentSummary,
        120,
        'Device summary is required',
      ),
      now,
      now,
      1,
    );
  }

  static fromPrimitives(primitives: UserDevicePrimitives): UserDevice {
    return new UserDevice(
      normalizeDeviceId(primitives.id),
      UserId.fromString(primitives.userId),
      normalizeLimitedText(primitives.label, 80, 'Device label is required'),
      normalizeLimitedText(
        primitives.userAgentSummary,
        120,
        'Device summary is required',
      ),
      new Date(primitives.firstSeenAt),
      new Date(primitives.lastSeenAt),
      Math.max(1, Math.trunc(primitives.seenCount)),
    );
  }

  get id(): string {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get lastSeenAt(): Date {
    return new Date(this._lastSeenAt);
  }

  recordSeen(input: {
    label: string;
    userAgentSummary: string;
    now?: Date;
  }): void {
    this._label = normalizeLimitedText(
      input.label,
      80,
      'Device label is required',
    );
    this._userAgentSummary = normalizeLimitedText(
      input.userAgentSummary,
      120,
      'Device summary is required',
    );
    this._lastSeenAt = input.now ?? new Date();
    this._seenCount += 1;
  }

  toPrimitives(): UserDevicePrimitives {
    return {
      id: this._id,
      userId: this._userId.toString(),
      label: this._label,
      userAgentSummary: this._userAgentSummary,
      firstSeenAt: new Date(this._firstSeenAt),
      lastSeenAt: new Date(this._lastSeenAt),
      seenCount: this._seenCount,
    };
  }
}

function normalizeDeviceId(id: string): string {
  const normalized = id.trim();

  if (!normalized) {
    throw new Error('Device id is required');
  }

  return normalized;
}

function normalizeLimitedText(
  value: string,
  maxLength: number,
  message: string,
): string {
  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) {
    throw new Error(message);
  }

  return normalized;
}
