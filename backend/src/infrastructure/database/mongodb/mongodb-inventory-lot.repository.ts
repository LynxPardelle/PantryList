import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  InventoryLot,
  InventoryLotPrimitives,
} from '../../../domain/entities/inventory-lot.entity';
import { InventoryLotRepository } from '../../../domain/repositories/inventory-lot.repository';
import { InventoryLotId } from '../../../domain/value-objects/inventory-lot-id.vo';
import { ProductTypeId } from '../../../domain/value-objects/product-type-id.vo';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { InventoryLotDocument } from './schemas/inventory-lot.schema';

type PersistedInventoryLot = Omit<
  InventoryLotPrimitives,
  'expiresAt' | 'purchaseDate'
> & {
  expiresAt?: Date | null;
  purchaseDate?: Date | null;
};

@Injectable()
export class MongoInventoryLotRepository implements InventoryLotRepository {
  constructor(
    @InjectModel(InventoryLotDocument.name)
    private readonly inventoryLotModel: Model<InventoryLotDocument>,
  ) {}

  async save(lot: InventoryLot): Promise<InventoryLot> {
    const primitives = lot.toPrimitives();
    const savedLot = await this.inventoryLotModel
      .findOneAndUpdate({ id: primitives.id }, primitives, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec();

    return this.toDomain(savedLot);
  }

  async findById(id: InventoryLotId): Promise<InventoryLot | null> {
    const lot = await this.inventoryLotModel
      .findOne({ id: id.toString() })
      .lean()
      .exec();

    return lot ? this.toDomain(lot) : null;
  }

  async findByUserId(userId: UserId): Promise<InventoryLot[]> {
    const lots = await this.inventoryLotModel
      .find({ userId: userId.toString() })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    return lots.map((lot) => this.toDomain(lot as PersistedInventoryLot));
  }

  async findByProductTypeId(
    productTypeId: ProductTypeId,
  ): Promise<InventoryLot[]> {
    const lots = await this.inventoryLotModel
      .find({ productTypeId: productTypeId.toString() })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    return lots.map((lot) => this.toDomain(lot as PersistedInventoryLot));
  }

  async reassignUserOwnership(
    fromUserId: UserId,
    toUserId: UserId,
  ): Promise<number> {
    const result = await this.inventoryLotModel
      .updateMany(
        { userId: fromUserId.toString() },
        { $set: { userId: toUserId.toString(), updatedAt: new Date() } },
      )
      .exec();

    return result.modifiedCount;
  }

  async delete(id: InventoryLotId): Promise<void> {
    await this.inventoryLotModel.deleteOne({ id: id.toString() }).exec();
  }

  private toDomain(lot: PersistedInventoryLot): InventoryLot {
    return InventoryLot.fromPrimitives({
      id: lot.id,
      userId: lot.userId,
      productTypeId: lot.productTypeId,
      variantName: lot.variantName,
      quantity: lot.quantity,
      unit: lot.unit,
      expiresAt: lot.expiresAt ?? undefined,
      purchaseDate: lot.purchaseDate ?? undefined,
      createdAt: new Date(lot.createdAt),
      updatedAt: new Date(lot.updatedAt),
    });
  }
}
