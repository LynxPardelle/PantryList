import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { PasswordCredentialDao } from '../../../application/ports/daos';
import {
  PasswordCredential,
  PasswordCredentialPrimitives,
} from '../../../domain/entities/password-credential.entity';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { PasswordCredentialDocument } from './schemas/password-credential.schema';

@Injectable()
export class MongoPasswordCredentialDao implements PasswordCredentialDao {
  constructor(
    @InjectModel(PasswordCredentialDocument.name)
    private readonly credentialModel: Model<PasswordCredentialDocument>,
  ) {}

  async save(credential: PasswordCredential): Promise<PasswordCredential> {
    const primitives = credential.toPrimitives();
    const savedCredential = await this.credentialModel
      .findOneAndUpdate({ userId: primitives.userId }, primitives, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toDomain(savedCredential);
  }

  async findByUserId(userId: UserId): Promise<PasswordCredential | null> {
    const credential = await this.credentialModel
      .findOne({ userId: userId.toString() })
      .lean()
      .exec();

    return credential ? this.toDomain(credential) : null;
  }

  async deleteByUserId(userId: UserId): Promise<void> {
    await this.credentialModel.deleteOne({ userId: userId.toString() }).exec();
  }

  private toDomain(
    credential: PasswordCredentialPrimitives,
  ): PasswordCredential {
    return PasswordCredential.fromPrimitives({
      userId: credential.userId,
      passwordHash: credential.passwordHash,
      passwordVersion: credential.passwordVersion,
      lastPasswordChangeAt: new Date(credential.lastPasswordChangeAt),
      createdAt: new Date(credential.createdAt),
      updatedAt: new Date(credential.updatedAt),
    });
  }
}
