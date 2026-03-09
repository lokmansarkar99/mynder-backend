import { Document, Model, Types } from 'mongoose';
import {
  APPOINTMENT_STATUS,
  SESSION_FORMAT,
  SESSION_TYPE,
  CANCELLED_BY,
} from '../../../enums/appointment';

export type IAppointment = {
  appointmentId:      string;
  client:             Types.ObjectId;
  provider:           Types.ObjectId;
  slot:               Types.ObjectId;
  sessionType:        SESSION_TYPE;       
  sessionTypeRef:     Types.ObjectId | null; 
  sessionName:        string;             
  scheduledAt:        Date;
  durationMinutes:    number;
  endAt:              Date;
  timezone:           string;
  format:             SESSION_FORMAT;
  sessionFee:         number;
  meetingLink:        string;
  meetingId:          string;
  meetingPassword:    string;
  paymentIntentId:    string;
  status:             APPOINTMENT_STATUS;
  cancelledBy:        CANCELLED_BY | null;
  cancellationReason: string;
  sessionSummary:     string;
  invoice:            Types.ObjectId | null;
  reminderSent:       boolean;
};

export type IAppointmentDocument = IAppointment & Document;
export type IAppointmentModel    = Model<IAppointmentDocument>;
