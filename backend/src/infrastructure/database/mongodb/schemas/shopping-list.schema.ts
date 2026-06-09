import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { QuantityUnit } from '../../../../domain/enums';

export type ShoppingListDocumentModel = HydratedDocument<ShoppingListDocument>;

@Schema({ _id: false, versionKey: false })
export class ShoppingListItemDocument {
  @Prop({ required: true })
  productTypeId: string;

  @Prop({ required: true })
  baseName: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true, enum: Object.values(QuantityUnit) })
  unit: QuantityUnit;

  @Prop({ required: false })
  shoppingLocation?: string;

  @Prop({ required: false })
  estimatedUnitPrice?: number;

  @Prop({ required: false })
  estimatedLineTotal?: number;
}

const ShoppingListItemSchema = SchemaFactory.createForClass(
  ShoppingListItemDocument,
);

@Schema({
  collection: 'shoppingLists',
  timestamps: false,
  versionKey: false,
})
export class ShoppingListDocument {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  ownerUserId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  occasion?: string;

  @Prop({ required: false })
  shoppingLocation?: string;

  @Prop({ required: true, type: [ShoppingListItemSchema] })
  items: ShoppingListItemDocument[];

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const ShoppingListSchema =
  SchemaFactory.createForClass(ShoppingListDocument);

ShoppingListSchema.index({ ownerUserId: 1, updatedAt: -1 });
