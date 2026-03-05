import { Document, Model, Types } from 'mongoose';

export type ISessionType = {
  provider:  Types.ObjectId;
  name:      string;      // "Standard Consultation", "Extended Review", etc.
  duration:  number;      // user input — 30, 45, 60, 90 (NOT static enum)
  price:     number;      // user input — 100.00, 150.00, 200.00
  isActive:  boolean;     // shown in dropdown & "Active Session" list
};

export type ISessionTypeDocument = ISessionType & Document;
export type ISessionTypeModel    = Model<ISessionTypeDocument>;
