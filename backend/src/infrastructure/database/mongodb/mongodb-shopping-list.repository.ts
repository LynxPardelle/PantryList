import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ShoppingList,
  ShoppingListPrimitives,
} from '../../../domain/entities/shopping-list.entity';
import { ShoppingListRepository } from '../../../domain/repositories/shopping-list.repository';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { ShoppingListDocument } from './schemas/shopping-list.schema';

@Injectable()
export class MongoShoppingListRepository implements ShoppingListRepository {
  constructor(
    @InjectModel(ShoppingListDocument.name)
    private readonly shoppingListModel: Model<ShoppingListDocument>,
  ) {}

  async save(list: ShoppingList): Promise<ShoppingList> {
    const primitives = list.toPrimitives();
    const savedList = await this.shoppingListModel
      .findOneAndUpdate({ id: primitives.id }, primitives, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toDomain(savedList);
  }

  async findById(id: string): Promise<ShoppingList | null> {
    const list = await this.shoppingListModel.findOne({ id }).lean().exec();

    return list ? this.toDomain(list) : null;
  }

  async listByOwnerUserId(ownerUserId: string): Promise<ShoppingList[]> {
    const lists = await this.shoppingListModel
      .find({ ownerUserId })
      .sort({ updatedAt: -1 })
      .limit(25)
      .lean()
      .exec();

    return lists.map((list) => this.toDomain(list));
  }

  async delete(id: string): Promise<void> {
    await this.shoppingListModel.deleteOne({ id }).exec();
  }

  async deleteByOwnerUserId(userId: UserId): Promise<number> {
    const result = await this.shoppingListModel
      .deleteMany({ ownerUserId: userId.toString() })
      .exec();

    return result.deletedCount ?? 0;
  }

  private toDomain(primitives: ShoppingListPrimitives): ShoppingList {
    return ShoppingList.fromPrimitives(primitives);
  }
}
