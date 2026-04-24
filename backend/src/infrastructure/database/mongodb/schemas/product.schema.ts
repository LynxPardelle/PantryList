import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  ProductCategory,
  ProductStatus,
  QuantityUnit,
} from '../../../../domain/enums';
import { Period } from '../../../../domain/enums/period.enum';

export type ProductDocumentModel = HydratedDocument<ProductDocument>;

class UsageRateDocument {
  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, enum: Object.values(Period) })
  period: Period;
}

@Schema({
  collection: 'products',
  timestamps: false,
  versionKey: false,
})
export class ProductDocument {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, min: 0 })
  currentQuantity: number;

  @Prop({ required: true, enum: Object.values(QuantityUnit) })
  unit: QuantityUnit;

  @Prop({
    required: true,
    type: {
      amount: { type: Number, required: true, min: 0 },
      period: { type: String, required: true, enum: Object.values(Period) },
    },
  })
  usageRate: UsageRateDocument;

  @Prop({ required: true, enum: Object.values(ProductCategory), index: true })
  category: ProductCategory;

  @Prop({ required: true, enum: Object.values(ProductStatus), index: true })
  status: ProductStatus;

  @Prop()
  nextPurchaseDate?: Date;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(ProductDocument);

ProductSchema.index({ userId: 1, updatedAt: -1 });
