import { Document, Model, Types } from 'mongoose';
import { NOTIFICATION_TYPE, REFERENCE_MODEL } from '../../../enums/notification';

export type INotification = {
  recipient:      Types.ObjectId;
  type:           NOTIFICATION_TYPE;
  title:          string;
  body:           string;
  referenceId:    Types.ObjectId | null;
  referenceModel: REFERENCE_MODEL | null;
  isRead:         boolean;
  readAt:         Date | null;
  createdAt: Date
  updatetAt: Date
};

export type INotificationDocument = INotification & Document;
export type INotificationModel    = Model<INotificationDocument>;
