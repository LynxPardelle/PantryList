import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ShoppingShare,
  ShoppingSharePrimitives,
} from '../../../domain/entities/shopping-share.entity';
import { ShoppingShareRepository } from '../../../domain/repositories/shopping-share.repository';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { ShoppingShareDocument } from './schemas/shopping-share.schema';

@Injectable()
export class MongoShoppingShareRepository implements ShoppingShareRepository {
  constructor(
    @InjectModel(ShoppingShareDocument.name)
    private readonly shoppingShareModel: Model<ShoppingShareDocument>,
  ) {}

  async save(share: ShoppingShare): Promise<ShoppingShare> {
    const primitives = share.toPrimitives();
    const savedShare = await this.shoppingShareModel
      .findOneAndUpdate({ id: primitives.id }, primitives, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toDomain(savedShare);
  }

  async findByTokenHash(tokenHash: string): Promise<ShoppingShare | null> {
    const share = await this.shoppingShareModel
      .findOne({ tokenHash })
      .lean()
      .exec();

    return share ? this.toDomain(share) : null;
  }

  async deleteByOwnerUserId(userId: UserId): Promise<number> {
    const result = await this.shoppingShareModel
      .deleteMany({ ownerUserId: userId.toString() })
      .exec();

    return result.deletedCount ?? 0;
  }

  private toDomain(primitives: ShoppingSharePrimitives): ShoppingShare {
    return ShoppingShare.fromPrimitives(primitives);
  }
}
