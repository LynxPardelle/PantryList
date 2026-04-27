import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { LegacyAccountClaimStatus } from '../../../../domain/enums';

export type LegacyAccountClaimDocumentModel =
  HydratedDocument<LegacyAccountClaimDocument>;

@Schema({
  collection: 'legacy_account_claims',
  timestamps: false,
  versionKey: false,
})
export class LegacyAccountClaimDocument {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, unique: true })
  legacyUsername: string;

  @Prop({ required: true })
  normalizedLegacyUsername: string;

  @Prop({
    required: true,
    enum: Object.values(LegacyAccountClaimStatus),
    index: true,
  })
  status: LegacyAccountClaimStatus;

  @Prop({ type: String, default: null })
  claimedUserId?: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;

  @Prop({ type: Date, default: null })
  claimedAt?: Date;
}

export const LegacyAccountClaimSchema = SchemaFactory.createForClass(
  LegacyAccountClaimDocument,
);

LegacyAccountClaimSchema.index(
  { normalizedLegacyUsername: 1 },
  { unique: true },
);
