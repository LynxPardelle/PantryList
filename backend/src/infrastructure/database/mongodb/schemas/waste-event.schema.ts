import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { QuantityUnit } from '../../../../domain/enums';
import {
  WASTE_REASONS,
  WasteReason,
} from '../../../../domain/entities/waste-event.entity';

export type WasteEventDocumentModel = HydratedDocument<WasteEventDocument>;

@Schema({
  collection: 'waste_events',
  timestamps: false,
  versionKey: false,
})
export class WasteEventDocument {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  productTypeId: string;

  @Prop({ required: false, index: true })
  inventoryLotId?: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  productName: string;

  @Prop({ required: true, min: 0.01 })
  quantity: number;

  @Prop({ required: true, enum: Object.values(QuantityUnit) })
  unit: QuantityUnit;

  @Prop({ required: true, enum: WASTE_REASONS })
  reason: WasteReason;

  @Prop({ required: false, trim: true, maxlength: 160 })
  note?: string;

  @Prop({ required: false, min: 0 })
  estimatedLoss?: number;

  @Prop({ required: true, index: true })
  occurredAt: Date;

  @Prop({ required: true })
  createdAt: Date;
}

export const WasteEventSchema =
  SchemaFactory.createForClass(WasteEventDocument);

WasteEventSchema.index({ userId: 1, occurredAt: -1 });
WasteEventSchema.index({ productTypeId: 1, occurredAt: -1 });
