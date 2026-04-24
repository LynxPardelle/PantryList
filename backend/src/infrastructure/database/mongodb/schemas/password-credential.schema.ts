import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PasswordCredentialDocumentModel =
  HydratedDocument<PasswordCredentialDocument>;

@Schema({
  collection: 'password_credentials',
  timestamps: false,
  versionKey: false,
})
export class PasswordCredentialDocument {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  passwordVersion: number;

  @Prop({ required: true })
  lastPasswordChangeAt: Date;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const PasswordCredentialSchema = SchemaFactory.createForClass(
  PasswordCredentialDocument,
);
