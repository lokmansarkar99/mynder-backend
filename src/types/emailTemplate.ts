// ── Base ──────────────────────────────────────────────────────────
export type ISendEmail = {
  to:      string;
  subject: string;
  html:    string;
};

// ── Auth ──────────────────────────────────────────────────────────
export type ICreateAccountTemplate = {
  name:  string;
  email: string;
  otp:   number;
};

export type IResetPasswordTemplate = {
  email: string;
  otp:   number;
};

// ── Appointment Shared ────────────────────────────────────────────
export type IAppointmentEmailData = {
  appointmentId:   string;
  clientName:      string;
  clientEmail:     string;
  providerName:    string;
  providerEmail:   string;
  sessionName:     string;
  durationMinutes: number;
  scheduledAt:     Date;
  timezone:        string;
  format:          string;        // "online" | "in_person"
  sessionFee:      number;
  meetingLink:     string;
  meetingId:       string;
  meetingPassword: string;
};

// ── Booking Confirmation ──────────────────────────────────────────
export type IBookingConfirmationTemplate = IAppointmentEmailData;

// ── Cancellation ──────────────────────────────────────────────────
export type IAppointmentCancelledTemplate = IAppointmentEmailData & {
  cancelledBy:        'client' | 'provider' | 'admin';
  cancellationReason: string;
};

// ── Reminder ──────────────────────────────────────────────────────
export type IAppointmentReminderTemplate = IAppointmentEmailData;
