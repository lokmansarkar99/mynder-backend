import cron            from 'node-cron';
import { Appointment } from '../app/modules/appointment/appointment.model';
import { ClientProfile }   from '../app/modules/client-profile/clientProfile.model';
import { ProviderProfile } from '../app/modules/provider-profile/providerProfile.model';
import { emailHelper }     from '../helpers/emailHelper';
import { emailTemplate } from '../shared/emailTemplate';
import { APPOINTMENT_STATUS } from '../enums/appointment';

const sendAppointmentReminders = async (): Promise<void> => {
  try {
    const now      = new Date();
    const in29mins = new Date(now.getTime() + 29 * 60 * 1000);
    const in31mins = new Date(now.getTime() + 31 * 60 * 1000);

    const appointments = await Appointment.find({
      status:       APPOINTMENT_STATUS.UPCOMING,
      reminderSent: false,
      scheduledAt:  { $gte: in29mins, $lte: in31mins },
    })
      .populate('client',   '_id email')
      .populate('provider', '_id email')
      .lean();

    if (!appointments.length) return;

    console.log(`[CRON] 🔔 Sending reminders for ${appointments.length} appointment(s)`);

    for (const appt of appointments as any[]) {
      try {
        const [clientProfile, providerProfile] = await Promise.all([
          ClientProfile.findOne({ user: appt.client?._id })
            .select('fullName').lean(),
          ProviderProfile.findOne({ user: appt.provider?._id })
            .select('fullName').lean(),
        ]);

        const shared = {
          appointmentId:   appt.appointmentId,
          clientName:      (clientProfile  as any)?.fullName ?? appt.client?.email,
          clientEmail:     appt.client?.email,
          providerName:    (providerProfile as any)?.fullName ?? appt.provider?.email,
          providerEmail:   appt.provider?.email,
          sessionName:     appt.sessionName     ?? 'Therapy Session',
          durationMinutes: appt.durationMinutes,
          scheduledAt:     appt.scheduledAt,
          timezone:        appt.timezone         ?? 'America/New_York',
          format:          appt.format           ?? 'online',
          sessionFee:      appt.sessionFee,
          meetingLink:     appt.meetingLink      ?? '',
          meetingId:       appt.meetingId        ?? '',
          meetingPassword: appt.meetingPassword  ?? '',
        };

        await Promise.all([
          emailHelper.sendEmail(emailTemplate.appointmentReminderClient(shared)),
          emailHelper.sendEmail(emailTemplate.appointmentReminderProvider(shared)),
        ]);

        await Appointment.findByIdAndUpdate(appt._id, {
          $set: { reminderSent: true },
        });

        console.log(`[CRON] ✅ #${appt.appointmentId} — reminders sent`);
      } catch (err) {
        console.error(`[CRON] ❌ Failed for ${appt.appointmentId}:`, err);
      }
    }
  } catch (err) {
    console.error('[CRON] Reminder job crashed:', err);
  }
};

export const registerAppointmentReminderCron = (): void => {
  // Runs every minute
  cron.schedule('* * * * *', sendAppointmentReminders, { timezone: 'UTC' });
  console.log('[CRON] ✅ Appointment reminder job registered');
};
