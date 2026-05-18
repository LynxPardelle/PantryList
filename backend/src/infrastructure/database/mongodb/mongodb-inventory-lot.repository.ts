import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  InventoryLot,
  InventoryLotPrimitives,
} from '../../../domain/entities/inventory-lot.entity';
import {
  MAX_ACTIVE_INVENTORY_LOTS_PER_USER,
  MAX_ARCHIVED_INVENTORY_LOTS_PER_USER,
  MAX_INVENTORY_LOTS_PER_PRODUCT_TYPE,
} from '../../../application/constants/query-limits';
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
    const unsetFields: Record<string, 1> = {};

    if (!primitives.archivedAt) {
      unsetFields.archivedAt = 1;
    }

    if (!primitives.archivedReason) {
      unsetFields.archivedReason = 1;
    }

    const archiveSet = {
      ...(primitives.archivedAt ? { archivedAt: primitives.archivedAt } : {}),
      ...(primitives.archivedReason
        ? { archivedReason: primitives.archivedReason }
        : {}),
    };
    const setPrimitives = { ...primitives };
    delete setPrimitives.archivedAt;
    delete setPrimitives.archivedReason;

    const savedLot = await this.inventoryLotModel
      .findOneAndUpdate(
        { id: primitives.id },
        {
          $set: {
            ...setPrimitives,
            ...archiveSet,
          },
          ...(Object.keys(unsetFields).length > 0
            ? { $unset: unsetFields }
            : {}),
        },
        {
          new: true,
          upsert: true,
        },
      )
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
      .find({ userId: userId.toString(), archivedAt: { $exists: false } })
      .sort({ updatedAt: -1 })
      .limit(MAX_ACTIVE_INVENTORY_LOTS_PER_USER)
      .lean()
      .exec();

    return lots.map((lot) => this.toDomain(lot as PersistedInventoryLot));
  }

  async findArchivedByUserId(userId: UserId): Promise<InventoryLot[]> {
    const lots = await this.inventoryLotModel
      .find({ userId: userId.toString(), archivedAt: { $exists: true } })
      .sort({ archivedAt: -1 })
      .limit(MAX_ARCHIVED_INVENTORY_LOTS_PER_USER)
      .lean()
      .exec();

    return lots.map((lot) => this.toDomain(lot as PersistedInventoryLot));
  }

  async findByProductTypeId(
    productTypeId: ProductTypeId,
  ): Promise<InventoryLot[]> {
    const lots = await this.inventoryLotModel
      .find({
        productTypeId: productTypeId.toString(),
        archivedAt: { $exists: false },
      })
      .sort({ updatedAt: -1 })
      .limit(MAX_INVENTORY_LOTS_PER_PRODUCT_TYPE)
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

  async deleteByProductTypeId(productTypeId: ProductTypeId): Promise<void> {
    await this.inventoryLotModel
      .deleteMany({ productTypeId: productTypeId.toString() })
      .exec();
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
      archivedAt: lot.archivedAt ?? undefined,
      archivedReason: lot.archivedReason,
      createdAt: new Date(lot.createdAt),
      updatedAt: new Date(lot.updatedAt),
    });
  }
}
