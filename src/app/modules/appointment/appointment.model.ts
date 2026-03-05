import { Schema, model } from 'mongoose';
import { IAppointmentDocument, IAppointmentModel } from './appointment.interface';
import { APPOINTMENT_STATUS, SESSION_FORMAT, SESSION_TYPE, CANCELLED_BY } from '../../../enums/appointment';

const appointmentSchema = new Schema<IAppointmentDocument>(
  {
    appointmentId: {
      type:   String,
      unique: true,
    },

    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    provider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    sessionType: {
      type:     String,
      enum:     Object.values(SESSION_TYPE),
      required: true,
    },

    scheduledAt: { type: Date, required: true },

    durationMinutes: {
      type: Number,
      enum: [15, 30, 60, 90],
      required: true,
    },

    endAt:    { type: Date },   // set in pre-save
    timezone: { type: String, default: 'America/New_York' },

    format: {
      type: String,
      enum: Object.values(SESSION_FORMAT),
      default: SESSION_FORMAT.ONLINE,
    },

    videoLink: { type: String, default: '' }, // Agora channel name

    status: {
      type:    String,
      enum:    Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.UPCOMING,
    },

    cancelledBy: {
      type:    String,
      enum:    [...Object.values(CANCELLED_BY), null],
      default: null,
    },

    cancellationReason: { type: String, default: '' },
    sessionSummary:     { type: String, default: '' },

    invoice: {
      type:    Schema.Types.ObjectId,
      ref:     'Invoice',
      default: null,
    },

    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate appointmentId + endAt before save
appointmentSchema.pre('save', function () {
  if (this.isNew) {
    const randomNum    = Math.floor(10000 + Math.random() * 90000);
    this.appointmentId = `APT-${randomNum}`;
  }

  if (this.scheduledAt && this.durationMinutes) {
    this.endAt = new Date(
      this.scheduledAt.getTime() + this.durationMinutes * 60 * 1000
    );
  }
});

export const Appointment = model<IAppointmentDocument, IAppointmentModel>(
  'Appointment',
  appointmentSchema
);
