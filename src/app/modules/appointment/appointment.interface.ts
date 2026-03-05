import { Document, Model, Types } from 'mongoose';
import { APPOINTMENT_STATUS, SESSION_FORMAT, SESSION_TYPE, CANCELLED_BY } from '../../../enums/appointment';

export type IAppointment = {
  appointmentId:     string;        // "APT-10245" auto-generated
  client:            Types.ObjectId;
  provider:          Types.ObjectId;
  sessionType:       SESSION_TYPE;
  scheduledAt:       Date;
  durationMinutes:   number;        // 15 | 30 | 60 | 90
  endAt:             Date;          // auto-calculated
  timezone:          string;
  format:            SESSION_FORMAT;
  videoLink:         string;        // Agora channel name
  status:            APPOINTMENT_STATUS;
  cancelledBy:       CANCELLED_BY | null;
  cancellationReason: string;
  sessionSummary:    string;
  invoice:           Types.ObjectId | null;
  reminderSent:      boolean;       // cron job flag
};

export type IAppointmentDocument = IAppointment & Document;
export type IAppointmentModel    = Model<IAppointmentDocument>;
