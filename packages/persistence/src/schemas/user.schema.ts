import { LIMITS } from '@lead/shared-contracts';
import { Schema } from 'mongoose';

import { attachIndexes, USER_INDEXES } from '../indexes';

export const USER_ROLES = ['SALESPERSON', 'ADMIN'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const UserSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: LIMITS.FULL_NAME_MAX
    },
    role: { type: String, enum: USER_ROLES, default: 'SALESPERSON' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, versionKey: false }
);

attachIndexes(UserSchema, USER_INDEXES);
