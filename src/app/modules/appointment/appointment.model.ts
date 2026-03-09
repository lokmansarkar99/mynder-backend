import { Schema, model } from 'mongoose';
import { IAppointmentDocument, IAppointmentModel } from './appointment.interface';
import {
  APPOINTMENT_STATUS,
  SESSION_FORMAT,
  SESSION_TYPE,
  CANCELLED_BY,
} from '../../../enums/appointment';

const appointmentSchema = new Schema<IAppointmentDocument>(
  {
    appointmentId: { type: String, unique: true },

    client:   { type: Schema.Types.ObjectId, ref: 'User',     required: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User',     required: true },
    slot:     { type: Schema.Types.ObjectId, ref: 'Slot',     required: true },

    // ── Session Info ──────────────────────────────────────────
    sessionType:    { type: String, enum: Object.values(SESSION_TYPE), required: true },
    sessionTypeRef: { type: Schema.Types.ObjectId, ref: 'SessionType', default: null }, // ✅
    sessionName:    { type: String, default: '' },    // ✅ denormalized

    scheduledAt:     { type: Date,   required: true },
    durationMinutes: { type: Number, enum: [15, 30, 60, 90], required: true },
    endAt:           { type: Date },
    timezone:        { type: String, default: 'America/New_York' },
    format:          { type: String, enum: Object.values(SESSION_FORMAT), default: SESSION_FORMAT.ONLINE },
    sessionFee:      { type: Number, required: true },

    // ── Meeting Info ──────────────────────────────────────────
    meetingLink:     { type: String, default: '' },
    meetingId:       { type: String, default: '' },
    meetingPassword: { type: String, default: '' },

    // ── Payment ───────────────────────────────────────────────
    paymentIntentId: { type: String, default: '' },

    // ── Status ────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.UPCOMING,
    },
    cancelledBy:        { type: String, enum: [...Object.values(CANCELLED_BY), null], default: null },
    cancellationReason: { type: String, default: '' },
    sessionSummary:     { type: String, default: '' },

    // ── References ────────────────────────────────────────────
    invoice:      { type: Schema.Types.ObjectId, ref: 'Invoice', default: null },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

appointmentSchema.pre('save', function () {
  if (this.isNew) {
    const randomNum    = Math.floor(10000 + Math.random() * 90000);
    this.appointmentId = `APT-${randomNum}`;
  }
  if (this.scheduledAt && this.durationMinutes) {
    this.endAt = new Date(
      this.scheduledAt.getTime() + this.durationMinutes * 60 * 1000,
    );
  }
});

export const Appointment = model<IAppointmentDocument, IAppointmentModel>(
  'Appointment',
  appointmentSchema,
);
