import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RefreshSessionDocumentModel =
  HydratedDocument<RefreshSessionDocument>;

@Schema({
  collection: 'refresh_sessions',
  timestamps: false,
  versionKey: false,
})
export class RefreshSessionDocument {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  refreshTokenHash: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt?: Date;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;

  @Prop({ type: String, default: null })
  userAgent?: string;

  @Prop({ type: String, default: null })
  ipAddress?: string;
}

export const RefreshSessionSchema = SchemaFactory.createForClass(
  RefreshSessionDocument,
);

RefreshSessionSchema.index({ userId: 1, revokedAt: 1 });
