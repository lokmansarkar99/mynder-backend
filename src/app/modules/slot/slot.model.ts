import { Schema, model } from 'mongoose';
import { ISlotDocument, ISlotModel } from './slot.interface';

const slotSchema = new Schema<ISlotDocument>(
  {
    provider: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // ── Date & Time ──────────────────────────────────────────────
    date: {
      type:     Date,
      required: true,
      // Only future dates allowed — enforced at service layer
    },
    startTime: {
      type:     String,
      required: true,
      // "07:00" format (HH:mm)
    },
    endTime: {
      type: String,
      // Auto-calculated in pre-save from startTime + duration
    },

    // ── Session Info ─────────────────────────────────────────────
    sessionType: {
      type:     Schema.Types.ObjectId,
      ref:      'SessionType',
      required: true,
    },
    sessionName: {
      type: String,
      // Denormalized — copied from SessionType.name on slot creation
    },
    duration: {
      type:     Number,
      required: true,
      // Denormalized — copied from SessionType.duration (e.g. 60)
    },
    price: {
      type:     Number,
      required: true,
      // Denormalized — copied from SessionType.price (e.g. 150.00)
      // Read-only after creation — matches UI: "pricing is fixed based on duration"
    },

    // ── Meeting Info ─────────────────────────────────────────────
    meetingLink: {
      type:    String,
      default: '',
      // e.g. "https://zoom.us/j/827..." or "https://meet.google.com/..."
    },
    meetingId: {
      type:    String,
      default: '',
    },
    meetingPassword: {
      type:    String,
      default: '',
    },

    // ── Booking Status ────────────────────────────────────────────
    isBooked: {
      type:    Boolean,
      default: false,
    },
    bookedBy: {
      type:    Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    appointment: {
      type:    Schema.Types.ObjectId,
      ref:     'Appointment',
      default: null,
    },
  },
  { timestamps: true }
);

// ── Auto-calculate endTime before save ───────────────────────────
slotSchema.pre('save', function () {
  if (this.startTime && this.duration) {
    const [hours, minutes] = this.startTime.split(':').map(Number);
    const totalMinutes     = hours * 60 + minutes + this.duration;
    const endHours         = Math.floor(totalMinutes / 60) % 24;
    const endMins          = totalMinutes % 60;
    this.endTime           = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  }
});

// ── Indexes ──────────────────────────────────────────────────────
// Fast query: GET /slots?providerId=&date= (client booking page)
slotSchema.index({ provider: 1, date: 1, isBooked: 1 });
// Auto-cleanup query: find expired slots
slotSchema.index({ date: 1, isBooked: 1 });

export const Slot = model<ISlotDocument, ISlotModel>('Slot', slotSchema);
