import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { RefreshSessionDao } from '../../../application/ports/daos';
import {
  RefreshSession,
  RefreshSessionPrimitives,
} from '../../../domain/entities/refresh-session.entity';
import { RefreshSessionId } from '../../../domain/value-objects/refresh-session-id.vo';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { RefreshSessionDocument } from './schemas/refresh-session.schema';

@Injectable()
export class MongoRefreshSessionDao implements RefreshSessionDao {
  constructor(
    @InjectModel(RefreshSessionDocument.name)
    private readonly refreshSessionModel: Model<RefreshSessionDocument>,
  ) {}

  async save(session: RefreshSession): Promise<RefreshSession> {
    const primitives = session.toPrimitives();
    const savedSession = await this.refreshSessionModel
      .findOneAndUpdate({ id: primitives.id }, primitives, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toDomain(savedSession);
  }

  async findById(id: RefreshSessionId): Promise<RefreshSession | null> {
    const session = await this.refreshSessionModel
      .findOne({ id: id.toString() })
      .lean()
      .exec();

    return session ? this.toDomain(session) : null;
  }

  async findByUserId(userId: UserId): Promise<RefreshSession[]> {
    const sessions = await this.refreshSessionModel
      .find({ userId: userId.toString() })
      .lean()
      .exec();

    return sessions.map((session) =>
      this.toDomain(session as RefreshSessionPrimitives),
    );
  }

  async revokeByUserId(userId: UserId): Promise<number> {
    const now = new Date();
    const result = await this.refreshSessionModel
      .updateMany(
        { userId: userId.toString(), revokedAt: null },
        { $set: { revokedAt: now, updatedAt: now } },
      )
      .exec();

    return result.modifiedCount;
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.refreshSessionModel
      .deleteMany({ expiresAt: { $lte: before } })
      .exec();

    return result.deletedCount ?? 0;
  }

  private toDomain(session: RefreshSessionPrimitives): RefreshSession {
    return RefreshSession.fromPrimitives({
      id: session.id,
      userId: session.userId,
      refreshTokenHash: session.refreshTokenHash,
      expiresAt: new Date(session.expiresAt),
      revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      userAgent: session.userAgent ?? null,
      ipAddress: session.ipAddress ?? null,
    });
  }
}
