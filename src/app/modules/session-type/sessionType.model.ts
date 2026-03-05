import { Schema, model } from 'mongoose';
import { ISessionTypeDocument, ISessionTypeModel } from './sessionType.interface';

const sessionTypeSchema = new Schema<ISessionTypeDocument>(
  {
    provider: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    name: {
      type:     String,
      required: true,
      trim:     true,
      // e.g. "Standard Consultation", "Initial Consultation", "Full Assessment"
    },
    duration: {
      type:     Number,
      required: true,
      min:      5,
      // User freely inputs any value: 30, 45, 60, 90, etc.
    },
    price: {
      type:     Number,
      required: true,
      min:      0,
      // User freely inputs price in USD: 100, 120, 150, 200, etc.
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// One provider can't have duplicate session names
sessionTypeSchema.index({ provider: 1, name: 1 }, { unique: true });

export const SessionType = model<ISessionTypeDocument, ISessionTypeModel>(
  'SessionType',
  sessionTypeSchema
);
