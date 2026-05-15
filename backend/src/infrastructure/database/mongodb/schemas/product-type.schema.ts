import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ProductCategory, QuantityUnit } from '../../../../domain/enums';

export type ProductTypeDocumentModel = HydratedDocument<ProductTypeDocument>;

@Schema({ _id: false, versionKey: false })
export class ProductTypeDepletionRuleDocument {
  @Prop({ required: true })
  enabled: boolean;

  @Prop({ required: true, min: 0 })
  consumeAmount: number;

  @Prop({ required: true, enum: Object.values(QuantityUnit) })
  unit: QuantityUnit;

  @Prop({ required: true, min: 1 })
  everyAmount: number;

  @Prop({ required: true, enum: ['day', 'week', 'month'] })
  everyPeriod: string;

  @Prop({ required: true })
  anchorDate: Date;
}

export const ProductTypeDepletionRuleSchema = SchemaFactory.createForClass(
  ProductTypeDepletionRuleDocument,
);

@Schema({ _id: false, versionKey: false })
export class ProductTypePlanningSettingsDocument {
  @Prop({ required: true })
  planningEnabled: boolean;

  @Prop({ required: false, min: 1, max: 60 })
  expirationWarningDaysOverride?: number;

  @Prop({ required: false, min: 0.25, max: 4 })
  depletionWarningThresholdRatioOverride?: number;

  @Prop({ required: false, min: 0, max: 30 })
  shoppingPlanLeadDaysOverride?: number;
}

export const ProductTypePlanningSettingsSchema = SchemaFactory.createForClass(
  ProductTypePlanningSettingsDocument,
);

@Schema({ _id: false, versionKey: false })
export class ProductTypeShoppingMetadataDocument {
  @Prop({ required: false, trim: true, maxlength: 80 })
  storageLocation?: string;

  @Prop({ required: false, trim: true, maxlength: 80 })
  shoppingLocation?: string;

  @Prop({ required: false, trim: true, maxlength: 80 })
  preferredBrand?: string;

  @Prop({ required: false, trim: true, maxlength: 80 })
  substituteBrand?: string;

  @Prop({ required: false, trim: true, maxlength: 160 })
  shoppingNotes?: string;

  @Prop({ required: false, min: 0.01, max: 1000000 })
  estimatedUnitPrice?: number;

  @Prop({ required: true, default: false })
  buyOnlyOnPromo: boolean;
}

export const ProductTypeShoppingMetadataSchema = SchemaFactory.createForClass(
  ProductTypeShoppingMetadataDocument,
);

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

  @Prop({ type: ProductTypeDepletionRuleSchema, required: false })
  defaultDepletionRule?: ProductTypeDepletionRuleDocument;

  @Prop({ type: ProductTypePlanningSettingsSchema, required: false })
  planningSettings?: ProductTypePlanningSettingsDocument;

  @Prop({ type: ProductTypeShoppingMetadataSchema, required: false })
  shoppingMetadata?: ProductTypeShoppingMetadataDocument;

  @Prop({ required: false, index: true })
  archivedAt?: Date;

  @Prop({ required: false, trim: true })
  archivedReason?: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const ProductTypeSchema =
  SchemaFactory.createForClass(ProductTypeDocument);

ProductTypeSchema.index({ userId: 1, normalizedBaseName: 1 });
