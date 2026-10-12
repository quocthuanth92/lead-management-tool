import {
  ASSIGNMENT_STATUSES,
  DEFAULT_LEAD_LABEL,
  LEAD_LABELS,
  LEAD_SOURCES,
  LIMITS
} from '@lead/shared-contracts';
import { Schema } from 'mongoose';

import { attachIndexes, LEAD_INDEXES } from '../indexes';

const PHONE_PATTERN = new RegExp(
  `^\\+?\\d{${LIMITS.PHONE_MIN_DIGITS},${LIMITS.PHONE_MAX_DIGITS}}$`
);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LeadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignmentStatus: { type: String, enum: ASSIGNMENT_STATUSES, required: true },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: LIMITS.FULL_NAME_MAX
    },
    phone: { type: String, required: true, match: PHONE_PATTERN },
    email: { type: String, maxlength: LIMITS.EMAIL_MAX, match: EMAIL_PATTERN },
    message: { type: String, required: true, minlength: 1, maxlength: LIMITS.MESSAGE_MAX },
    source: { type: String, enum: LEAD_SOURCES, required: true },
    label: { type: String, enum: LEAD_LABELS, default: DEFAULT_LEAD_LABEL },
    hasView: { type: Boolean, default: false },
    fullNameSearch: { type: String, required: true },
    emailLower: { type: String },
    phoneDigits: { type: String, required: true },
    externalEventId: { type: String },
    schemaVersion: { type: Number, default: 1 },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
  },
  { timestamps: false, versionKey: false }
);

attachIndexes(LeadSchema, LEAD_INDEXES);
