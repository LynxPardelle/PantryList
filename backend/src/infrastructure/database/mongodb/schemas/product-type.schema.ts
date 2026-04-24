import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ProductCategory, QuantityUnit } from '../../../../domain/enums';

export type ProductTypeDocumentModel = HydratedDocument<ProductTypeDocument>;

@Schema({
  collection: 'product_types',
  timestamps: false,
  versionKey: false,
})
export class ProductTypeDocument {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  baseName: string;

  @Prop({ required: true, index: true })
  normalizedBaseName: string;

  @Prop({ required: true, enum: Object.values(ProductCategory), index: true })
  category: ProductCategory;

  @Prop({ required: true, enum: Object.values(QuantityUnit) })
  defaultUnit: QuantityUnit;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const ProductTypeSchema =
  SchemaFactory.createForClass(ProductTypeDocument);

ProductTypeSchema.index({ userId: 1, normalizedBaseName: 1 });
