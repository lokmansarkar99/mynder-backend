
import { Document, Model, Types } from 'mongoose';
import { DAY_OF_WEEK } from '../../../enums/appointment';

type IScheduleDay = {
  day:         DAY_OF_WEEK;
  isAvailable: boolean;   // Mon-Fri: true, Sat-Sun: false (default)
};

export type IAvailability = {
  provider:  Types.ObjectId;
  timezone:  string;
  schedule:  IScheduleDay[];  // 7 entries, one per day
};

export type IAvailabilityDocument = IAvailability & Document;
export type IAvailabilityModel    = Model<IAvailabilityDocument>;
