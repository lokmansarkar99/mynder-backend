import { Schema, model } from 'mongoose';
import { IAvailabilityDocument, IAvailabilityModel } from './availability.interface';
import { DAY_OF_WEEK } from '../../../enums/appointment';

const scheduleDaySchema = new Schema({
  day:         { type: String, enum: Object.values(DAY_OF_WEEK), required: true },
  isAvailable: { type: Boolean, default: false },
}, { _id: false });

const availabilitySchema = new Schema<IAvailabilityDocument>(
  {
    provider: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true, // one-to-one per provider
    },
    timezone: {
      type:    String,
      default: 'America/New_York',
    },
    // 7 days: MON → SUN  (UI: Mon-Fri checked, Sat-Sun unchecked by default)
    schedule: {
      type:    [scheduleDaySchema],
      default: () => [
        { day: DAY_OF_WEEK.MON, isAvailable: true  },
        { day: DAY_OF_WEEK.TUE, isAvailable: true  },
        { day: DAY_OF_WEEK.WED, isAvailable: true  },
        { day: DAY_OF_WEEK.THU, isAvailable: true  },
        { day: DAY_OF_WEEK.FRI, isAvailable: true  },
        { day: DAY_OF_WEEK.SAT, isAvailable: false },
        { day: DAY_OF_WEEK.SUN, isAvailable: false },
      ],
    },
  },
  { timestamps: true }
);

export const Availability = model<IAvailabilityDocument, IAvailabilityModel>(
  'Availability',
  availabilitySchema
);
