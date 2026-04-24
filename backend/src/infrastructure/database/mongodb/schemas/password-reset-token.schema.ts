import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PasswordResetTokenDocumentModel =
  HydratedDocument<PasswordResetTokenDocument>;

@Schema({
  collection: 'password_reset_tokens',
  timestamps: false,
  versionKey: false,
})
export class PasswordResetTokenDocument {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  usedAt?: Date;

  @Prop({ required: true })
  createdAt: Date;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(
  PasswordResetTokenDocument,
);
