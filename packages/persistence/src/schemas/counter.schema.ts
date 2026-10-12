import { Schema } from 'mongoose';

export const LEAD_ASSIGNMENT_COUNTER_ID = 'lead-assignment';

export const CounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 }
  },
  { versionKey: false }
);
