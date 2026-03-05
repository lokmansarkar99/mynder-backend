import { Document, Model, Types } from 'mongoose';

export type ISlot = {
  provider:        Types.ObjectId;

  // ── Date & Time ──────────────────────────────────
  date:            Date;          // specific date e.g. 2026-03-07
  startTime:       string;        // "07:00"
  endTime:         string;        // auto-calculated: startTime + duration

  // ── Session Info (populated from SessionType) ────
  sessionType:     Types.ObjectId; // ref → SessionType
  sessionName:     string;         // denormalized: "Extended Review"
  duration:        number;         // denormalized: 60 (from SessionType)
  price:           number;         // denormalized: 150.00 (from SessionType, read-only)

  // ── Meeting Info ─────────────────────────────────
  meetingLink:     string;         // "https://zoom.us/j/827..."
  meetingId:       string;         // optional Zoom/Meet ID
  meetingPassword: string;         // optional password

  // ── Booking Status ────────────────────────────────
  isBooked:        boolean;
  bookedBy:        Types.ObjectId | null;   // ref → User (Client)
  appointment:     Types.ObjectId | null;   // ref → Appointment
};

export type ISlotDocument = ISlot & Document;
export type ISlotModel    = Model<ISlotDocument>;
