import {
  ICreateAccountTemplate,
  IResetPasswordTemplate,
  IBookingConfirmationTemplate,
  IAppointmentCancelledTemplate,
  IAppointmentReminderTemplate,
  ISendEmail,
} from '../types/emailTemplate';

// ── Shared Helpers ────────────────────────────────────────────────
const formatDate = (date: Date, timezone: string) =>
  new Date(date).toLocaleString('en-US', {
    timeZone:  timezone || 'America/New_York',
    dateStyle: 'full',
    timeStyle: 'short',
  });

const header = (title: string, subtitle = '') => `
  <div style="background:linear-gradient(135deg,#3b9daa,#2d7d8a);
              padding:28px 24px;border-radius:10px 10px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:26px;letter-spacing:1px;font-weight:700;">
      Mynder
    </h1>
    <p style="color:#c8edf2;margin:6px 0 0;font-size:14px;">${title}</p>
    ${subtitle ? `<p style="color:#a8dde5;margin:4px 0 0;font-size:13px;">${subtitle}</p>` : ''}
  </div>`;

const footer = () => `
  <div style="background:#f5f5f5;padding:18px;text-align:center;
              font-size:12px;color:#999;border-radius:0 0 10px 10px;">
    <p style="margin:0;">© ${new Date().getFullYear()} Mynder. All rights reserved.</p>
    <p style="margin:6px 0 0;">Mental Health Platform — Connecting clients and providers.</p>
  </div>`;

const wrapper = (content: string) => `
  <body style="font-family:Arial,sans-serif;background:#f0f4f7;
               margin:0;padding:30px 16px;">
    <div style="max-width:600px;margin:0 auto;border-radius:10px;
                box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
      ${content}
    </div>
  </body>`;

const infoRow = (label: string, value: string) => `
  <tr>
    <td style="padding:9px 0;color:#888;font-size:12px;
               text-transform:uppercase;letter-spacing:.5px;width:42%;">${label}</td>
    <td style="padding:9px 0;font-weight:600;color:#333;font-size:14px;">${value}</td>
  </tr>`;

const infoBox = (color: string, rows: string) => `
  <div style="background:#f7fbfc;border-left:4px solid ${color};
              padding:16px 20px;border-radius:6px;margin:20px 0;">
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>`;

const meetingBox = (link: string, id: string, pass: string, btnColor: string, btnText: string) =>
  link ? `
  <div style="background:#eefaf4;border-left:4px solid #34c78a;
              padding:16px 20px;border-radius:6px;margin:20px 0;">
    <p style="margin:0 0 12px;font-weight:700;color:#333;font-size:14px;">
      🎥 Session Access
    </p>
    <table style="width:100%;border-collapse:collapse;">
      ${infoRow('Meeting Link', `<a href="${link}" style="color:#3b9daa;">${link}</a>`)}
      ${id   ? infoRow('Meeting ID', id)   : ''}
      ${pass ? infoRow('Password',   pass) : ''}
    </table>
    <a href="${link}"
       style="display:inline-block;margin-top:16px;padding:12px 28px;
              background:${btnColor};color:white;text-decoration:none;
              border-radius:6px;font-weight:700;font-size:14px;">
      ${btnText} →
    </a>
  </div>` : `
  <div style="background:#fff8ec;border-left:4px solid #f5a623;
              padding:16px 20px;border-radius:6px;margin:20px 0;">
    <p style="margin:0;color:#555;font-size:14px;">
      📍 <strong>In-Person Session</strong> — Please arrive 5 minutes early.
    </p>
  </div>`;

// ══════════════════════════════════════════════════════════════════
// 1.  CREATE ACCOUNT
// ══════════════════════════════════════════════════════════════════
const createAccount = (values: ICreateAccountTemplate): ISendEmail => ({
  to:      values.email,
  subject: 'Verify your Mynder account',
  html: wrapper(`
    ${header('Account Verification', 'Welcome to Mynder')}
    <div style="background:white;padding:32px 28px;">
      <h2 style="color:#2d7d8a;font-size:20px;margin:0 0 12px;">
        Hey, ${values.name}! 
      </h2>
      <p style="color:#555;font-size:15px;line-height:1.7;margin-bottom:20px;">
        Thank you for joining <strong>Mynder</strong> — your mental health companion.
        Please verify your email address to activate your account.
      </p>
      <p style="color:#555;font-size:14px;text-align:center;">Your one-time verification code:</p>
      <div style="background:linear-gradient(135deg,#3b9daa,#2d7d8a);
                  width:140px;padding:14px 10px;text-align:center;
                  border-radius:10px;color:white;font-size:30px;
                  font-weight:800;letter-spacing:6px;margin:16px auto 20px;">
        ${values.otp}
      </div>
      <p style="color:#888;font-size:13px;text-align:center;margin-bottom:28px;">
        ⏱ This code expires in <strong>3 minutes</strong>.
      </p>
      <p style="color:#aaa;font-size:12px;text-align:center;">
        If you did not create a Mynder account, please ignore this email.
      </p>
    </div>
    ${footer()}
  `),
});

// ══════════════════════════════════════════════════════════════════
// 2.  RESET PASSWORD
// ══════════════════════════════════════════════════════════════════
const resetPassword = (values: IResetPasswordTemplate): ISendEmail => ({
  to:      values.email,
  subject: 'Mynder — Password Reset Code',
  html: wrapper(`
    ${header('Password Reset')}
    <div style="background:white;padding:32px 28px;text-align:center;">
      <p style="color:#555;font-size:15px;line-height:1.7;margin-bottom:8px;">
        We received a request to reset your password.
        Use the code below to proceed:
      </p>
      <div style="background:#f8fdfd;padding:18px 25px;
                  border:2px solid #3b9daa;border-radius:10px;
                  color:#2d7d8a;font-size:30px;font-weight:800;
                  letter-spacing:6px;width:150px;margin:24px auto;">
        ${values.otp}
      </div>
      <p style="color:#888;font-size:13px;margin-bottom:28px;">
        ⏱ This code expires in <strong>3 minutes</strong>.
      </p>
      <p style="color:#aaa;font-size:12px;">
        If you did not request a password reset, please ignore this email.<br/>
        Your password will remain unchanged.
      </p>
    </div>
    ${footer()}
  `),
});

// ══════════════════════════════════════════════════════════════════
// 3.  APPOINTMENT BOOKED — Client
// ══════════════════════════════════════════════════════════════════
const appointmentBookedClient = (v: IBookingConfirmationTemplate): ISendEmail => ({
  to:      v.clientEmail,
  subject: ` Booking Confirmed — ${v.sessionName} with ${v.providerName}`,
  html: wrapper(`
    ${header('Appointment Confirmed', `#${v.appointmentId}`)}
    <div style="background:white;padding:32px 28px;">
      <p style="font-size:15px;color:#333;">Hi <strong>${v.clientName}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.7;">
        Your session has been <strong style="color:#34c78a;">confirmed</strong>!
        Here are your booking details:
      </p>
      ${infoBox('#3b9daa',
        infoRow('Appointment ID', `#${v.appointmentId}`) +
        infoRow('Therapist',      v.providerName) +
        infoRow('Session',        `${v.sessionName} (${v.durationMinutes} min)`) +
        infoRow('Date & Time',    formatDate(v.scheduledAt, v.timezone)) +
        infoRow('Timezone',       v.timezone) +
        infoRow('Format',         v.format.replace('_', ' ')) +
        infoRow('Session Fee',    `$${v.sessionFee.toFixed(2)} USD`)
      )}
      ${meetingBox(v.meetingLink, v.meetingId, v.meetingPassword, '#3b9daa', 'Join Session')}
      <p style="color:#888;font-size:13px;margin-top:24px;line-height:1.6;">
         Please ensure you join on time. If you need to cancel or reschedule,
        do so at least 24 hours before your session through the Mynder app.
      </p>
      <p style="color:#555;margin-top:20px;">Best regards,<br/>
        <strong style="color:#2d7d8a;">The Mynder Team</strong></p>
    </div>
    ${footer()}
  `),
});

// ══════════════════════════════════════════════════════════════════
// 4.  APPOINTMENT BOOKED — Provider
// ══════════════════════════════════════════════════════════════════
const appointmentBookedProvider = (v: IBookingConfirmationTemplate): ISendEmail => ({
  to:      v.providerEmail,
  subject: ` New Booking — ${v.sessionName} with ${v.clientName}`,
  html: wrapper(`
    ${header('New Appointment Booked', `#${v.appointmentId}`)}
    <div style="background:white;padding:32px 28px;">
      <p style="font-size:15px;color:#333;">Hi <strong>${v.providerName}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.7;">
        A new session has been booked with you. Here are the details:
      </p>
      ${infoBox('#2d7d8a',
        infoRow('Appointment ID', `#${v.appointmentId}`) +
        infoRow('Client',         v.clientName) +
        infoRow('Session',        `${v.sessionName} (${v.durationMinutes} min)`) +
        infoRow('Date & Time',    formatDate(v.scheduledAt, v.timezone)) +
        infoRow('Timezone',       v.timezone) +
        infoRow('Format',         v.format.replace('_', ' ')) +
        infoRow('Session Fee',    `$${v.sessionFee.toFixed(2)} USD`)
      )}
      ${meetingBox(v.meetingLink, v.meetingId, v.meetingPassword, '#2d7d8a', 'Start Session')}
      <p style="color:#555;margin-top:24px;">Best regards,<br/>
        <strong style="color:#2d7d8a;">The Mynder Team</strong></p>
    </div>
    ${footer()}
  `),
});

// ══════════════════════════════════════════════════════════════════
// 5.  APPOINTMENT CANCELLED — Client
// ══════════════════════════════════════════════════════════════════
const appointmentCancelledClient = (v: IAppointmentCancelledTemplate): ISendEmail => {
  const cancellerLabel =
    v.cancelledBy === 'admin'    ? 'Mynder Admin'  :
    v.cancelledBy === 'provider' ? v.providerName  : 'You';

  return {
    to:      v.clientEmail,
    subject: ` Appointment Cancelled — ${v.sessionName} on ${new Date(v.scheduledAt).toDateString()}`,
    html: wrapper(`
      ${header('Appointment Cancelled', `#${v.appointmentId}`)}
      <div style="background:white;padding:32px 28px;">
        <p style="font-size:15px;color:#333;">Hi <strong>${v.clientName}</strong>,</p>
        <p style="color:#555;font-size:14px;line-height:1.7;">
          Your appointment has been <strong style="color:#e74c3c;">cancelled</strong>
          by <strong>${cancellerLabel}</strong>.
        </p>
        ${infoBox('#e74c3c',
          infoRow('Appointment ID',  `#${v.appointmentId}`) +
          infoRow('Therapist',       v.providerName) +
          infoRow('Session',         `${v.sessionName} (${v.durationMinutes} min)`) +
          infoRow('Was Scheduled',   formatDate(v.scheduledAt, v.timezone)) +
          infoRow('Cancelled By',    cancellerLabel) +
          (v.cancellationReason
            ? infoRow('Reason', v.cancellationReason)
            : '')
        )}
        <div style="background:#fff8f8;border-left:4px solid #e74c3c;
                    padding:14px 18px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;color:#555;font-size:14px;">
             If a payment was made, a <strong>full refund</strong> will be
            processed to your original payment method within 5–7 business days.
          </p>
        </div>
        <p style="color:#555;font-size:14px;margin-top:16px;">
          You can book a new session anytime through the Mynder app.
        </p>
        <p style="color:#555;margin-top:20px;">Best regards,<br/>
          <strong style="color:#2d7d8a;">The Mynder Team</strong></p>
      </div>
      ${footer()}
    `),
  };
};

// ══════════════════════════════════════════════════════════════════
// 6.  APPOINTMENT CANCELLED — Provider
// ══════════════════════════════════════════════════════════════════
const appointmentCancelledProvider = (v: IAppointmentCancelledTemplate): ISendEmail => {
  const cancellerLabel =
    v.cancelledBy === 'admin'  ? 'Mynder Admin' :
    v.cancelledBy === 'client' ? v.clientName   : 'You';

  return {
    to:      v.providerEmail,
    subject: ` Appointment Cancelled — ${v.sessionName} with ${v.clientName}`,
    html: wrapper(`
      ${header('Appointment Cancelled', `#${v.appointmentId}`)}
      <div style="background:white;padding:32px 28px;">
        <p style="font-size:15px;color:#333;">Hi <strong>${v.providerName}</strong>,</p>
        <p style="color:#555;font-size:14px;line-height:1.7;">
          The following appointment has been <strong style="color:#e74c3c;">cancelled</strong>
          by <strong>${cancellerLabel}</strong>.
        </p>
        ${infoBox('#e74c3c',
          infoRow('Appointment ID',  `#${v.appointmentId}`) +
          infoRow('Client',          v.clientName) +
          infoRow('Session',         `${v.sessionName} (${v.durationMinutes} min)`) +
          infoRow('Was Scheduled',   formatDate(v.scheduledAt, v.timezone)) +
          infoRow('Cancelled By',    cancellerLabel) +
          (v.cancellationReason
            ? infoRow('Reason', v.cancellationReason)
            : '')
        )}
        <p style="color:#555;font-size:14px;margin-top:16px;">
          The slot has been released and is now available for new bookings.
        </p>
        <p style="color:#555;margin-top:20px;">Best regards,<br/>
          <strong style="color:#2d7d8a;">The Mynder Team</strong></p>
      </div>
      ${footer()}
    `),
  };
};

// ══════════════════════════════════════════════════════════════════
// 7.  APPOINTMENT REMINDER — Client
// ══════════════════════════════════════════════════════════════════
const appointmentReminderClient = (v: IAppointmentReminderTemplate): ISendEmail => ({
  to:      v.clientEmail,
  subject: ` Reminder: Your session starts in 30 minutes — ${v.sessionName}`,
  html: wrapper(`
    ${header('Session Reminder', 'Your appointment is in 30 minutes')}
    <div style="background:white;padding:32px 28px;">
      <p style="font-size:15px;color:#333;">Hi <strong>${v.clientName}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.7;">
        ⚡ Your therapy session starts in <strong>30 minutes</strong>. Get ready!
      </p>
      ${infoBox('#3b9daa',
        infoRow('Appointment ID', `#${v.appointmentId}`) +
        infoRow('Therapist',      v.providerName) +
        infoRow('Session',        `${v.sessionName} (${v.durationMinutes} min)`) +
        infoRow('Date & Time',    formatDate(v.scheduledAt, v.timezone)) +
        infoRow('Format',         v.format.replace('_', ' '))
      )}
      ${meetingBox(v.meetingLink, v.meetingId, v.meetingPassword, '#3b9daa', 'Join Now')}
      <p style="color:#888;font-size:13px;margin-top:20px;line-height:1.6;">
        Please ensure a stable internet connection and a quiet environment before joining.
      </p>
      <p style="color:#555;margin-top:20px;">See you soon!<br/>
        <strong style="color:#2d7d8a;">The Mynder Team</strong></p>
    </div>
    ${footer()}
  `),
});

// ══════════════════════════════════════════════════════════════════
// 8.  APPOINTMENT REMINDER — Provider
// ══════════════════════════════════════════════════════════════════
const appointmentReminderProvider = (v: IAppointmentReminderTemplate): ISendEmail => ({
  to:      v.providerEmail,
  subject: ` Reminder: Session with ${v.clientName} starts in 30 minutes`,
  html: wrapper(`
    ${header('Session Reminder', 'Upcoming appointment in 30 minutes')}
    <div style="background:white;padding:32px 28px;">
      <p style="font-size:15px;color:#333;">Hi <strong>${v.providerName}</strong>,</p>
      <p style="color:#555;font-size:14px;line-height:1.7;">
         You have an upcoming session in <strong>30 minutes</strong>.
      </p>
      ${infoBox('#2d7d8a',
        infoRow('Appointment ID', `#${v.appointmentId}`) +
        infoRow('Client',         v.clientName) +
        infoRow('Session',        `${v.sessionName} (${v.durationMinutes} min)`) +
        infoRow('Date & Time',    formatDate(v.scheduledAt, v.timezone)) +
        infoRow('Format',         v.format.replace('_', ' '))
      )}
      ${meetingBox(v.meetingLink, v.meetingId, v.meetingPassword, '#2d7d8a', 'Start Session')}
      <p style="color:#555;margin-top:20px;">Best regards,<br/>
        <strong style="color:#2d7d8a;">The Mynder Team</strong></p>
    </div>
    ${footer()}
  `),
});

// ══════════════════════════════════════════════════════════════════
export const emailTemplate = {
  createAccount,
  resetPassword,
  appointmentBookedClient,
  appointmentBookedProvider,
  appointmentCancelledClient,
  appointmentCancelledProvider,
  appointmentReminderClient,
  appointmentReminderProvider,
};
