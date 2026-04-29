import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { QuantityUnit } from '../../../../domain/enums';

export type InventoryLotDocumentModel = HydratedDocument<InventoryLotDocument>;

@Schema({
  collection: 'inventory_lots',
  timestamps: false,
  versionKey: false,
})
export class InventoryLotDocument {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  productTypeId: string;

  @Prop({ index: true, sparse: true })
  legacyProductId?: string;

  @Prop({ trim: true })
  variantName?: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, enum: Object.values(QuantityUnit) })
  unit: QuantityUnit;

  @Prop()
  expiresAt?: Date;

  @Prop()
  purchaseDate?: Date;

  @Prop({ required: false, index: true })
  archivedAt?: Date;

  @Prop({ required: false, trim: true })
  archivedReason?: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const InventoryLotSchema =
  SchemaFactory.createForClass(InventoryLotDocument);

InventoryLotSchema.index({ userId: 1, productTypeId: 1 });
InventoryLotSchema.index({ userId: 1, expiresAt: 1 });
InventoryLotSchema.index({ userId: 1, archivedAt: 1 });
