import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WasteEvent,
  WasteEventPrimitives,
} from '../../../domain/entities/waste-event.entity';
import { WasteEventRepository } from '../../../domain/repositories/waste-event.repository';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { WasteEventDocument } from './schemas/waste-event.schema';

@Injectable()
export class MongoWasteEventRepository implements WasteEventRepository {
  constructor(
    @InjectModel(WasteEventDocument.name)
    private readonly wasteEventModel: Model<WasteEventDocument>,
  ) {}

  async save(event: WasteEvent): Promise<WasteEvent> {
    const primitives = event.toPrimitives();
    const savedEvent = await this.wasteEventModel
      .findOneAndUpdate(
        { id: primitives.id },
        { $set: primitives },
        { new: true, upsert: true },
      )
      .lean()
      .exec();

    return this.toDomain(savedEvent);
  }

  async findRecentByUserId(userId: UserId, limit = 10): Promise<WasteEvent[]> {
    const events = await this.wasteEventModel
      .find({ userId: userId.toString() })
      .sort({ occurredAt: -1 })
      .limit(Math.min(Math.max(1, Math.trunc(limit)), 50))
      .lean()
      .exec();

    return events.map((event) => this.toDomain(event));
  }

  async findSinceByUserId(userId: UserId, since: Date): Promise<WasteEvent[]> {
    const events = await this.wasteEventModel
      .find({
        userId: userId.toString(),
        occurredAt: { $gte: since },
      })
      .sort({ occurredAt: -1 })
      .limit(1000)
      .lean()
      .exec();

    return events.map((event) => this.toDomain(event));
  }

  async deleteByUserId(userId: UserId): Promise<number> {
    const result = await this.wasteEventModel
      .deleteMany({ userId: userId.toString() })
      .exec();

    return result.deletedCount;
  }

  private toDomain(event: WasteEventPrimitives): WasteEvent {
    return WasteEvent.fromPrimitives({
      id: event.id,
      userId: event.userId,
      productTypeId: event.productTypeId,
      inventoryLotId: event.inventoryLotId,
      productName: event.productName,
      quantity: event.quantity,
      unit: event.unit,
      reason: event.reason,
      note: event.note,
      estimatedLoss: event.estimatedLoss,
      occurredAt: new Date(event.occurredAt),
      createdAt: new Date(event.createdAt),
    });
  }
}
