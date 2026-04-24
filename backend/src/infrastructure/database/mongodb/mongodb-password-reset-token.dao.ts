import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { PasswordResetTokenDao } from '../../../application/ports/daos';
import {
  PasswordResetToken,
  PasswordResetTokenPrimitives,
} from '../../../domain/entities/password-reset-token.entity';
import { PasswordResetTokenDocument } from './schemas/password-reset-token.schema';

@Injectable()
export class MongoPasswordResetTokenDao implements PasswordResetTokenDao {
  constructor(
    @InjectModel(PasswordResetTokenDocument.name)
    private readonly passwordResetTokenModel: Model<PasswordResetTokenDocument>,
  ) {}

  async save(token: PasswordResetToken): Promise<PasswordResetToken> {
    const primitives = token.toPrimitives();
    const savedToken = await this.passwordResetTokenModel
      .findOneAndUpdate({ id: primitives.id }, primitives, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toDomain(savedToken);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const token = await this.passwordResetTokenModel
      .findOne({ tokenHash })
      .lean()
      .exec();

    return token ? this.toDomain(token) : null;
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.passwordResetTokenModel
      .deleteMany({ expiresAt: { $lte: before } })
      .exec();

    return result.deletedCount ?? 0;
  }

  private toDomain(token: PasswordResetTokenPrimitives): PasswordResetToken {
    return PasswordResetToken.fromPrimitives({
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: new Date(token.expiresAt),
      usedAt: token.usedAt ? new Date(token.usedAt) : null,
      createdAt: new Date(token.createdAt),
    });
  }
}
