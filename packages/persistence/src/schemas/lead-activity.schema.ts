import { ACTIVITY_TYPES, DEFAULT_ACTIVITY_TYPE, LIMITS } from '@lead/shared-contracts';
import { Schema } from 'mongoose';

import { attachIndexes, LEAD_ACTIVITY_INDEXES } from '../indexes';

export const LeadActivitySchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    type: { type: String, enum: ACTIVITY_TYPES, default: DEFAULT_ACTIVITY_TYPE },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: LIMITS.NOTE_MAX
    },
    createdAt: { type: Date, default: Date.now, immutable: true }
  },
  { timestamps: false, versionKey: false, strict: true }
);

attachIndexes(LeadActivitySchema, LEAD_ACTIVITY_INDEXES);
