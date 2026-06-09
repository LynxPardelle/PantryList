import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDeviceDocumentModel = HydratedDocument<UserDeviceDocument>;

@Schema({
  collection: 'user_devices',
  timestamps: false,
  versionKey: false,
})
export class UserDeviceDocument {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true, maxlength: 80 })
  label: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  userAgentSummary: string;

  @Prop({ required: true })
  firstSeenAt: Date;

  @Prop({ required: true, index: true })
  lastSeenAt: Date;

  @Prop({ required: true, min: 1 })
  seenCount: number;
}

export const UserDeviceSchema =
  SchemaFactory.createForClass(UserDeviceDocument);

UserDeviceSchema.index({ userId: 1, lastSeenAt: -1 });
