import { User }             from '../user/user.model';
import { Appointment }      from '../appointment/appointment.model';
import { USER_ROLES }       from '../../../enums/user';
import { APPOINTMENT_STATUS } from '../../../enums/appointment';

// ── Day-label helper 
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const buildWeekMap = (): Record<string, number> => {
  const map: Record<string, number> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map[DAY_LABELS[d.getDay()]] = 0;
  }
  return map;
};

type LeanUser = {
  _id:          unknown;
  name:         string;
  email:        string;
  role:         string;
  profileImage: string;
  status:       string;
  createdAt:    Date;
};

type LeanAppointment = {
  _id:         unknown;
  sessionName: string;
  createdAt:   Date;
  client:      { name: string; profileImage: string } | null;
  provider:    { name: string } | null;
};


//  getAdminOverview  — single service powering the whole dashboard

const getAdminOverview = async () => {

  const now = new Date();

  // Month-to-date: 1st of current month → now
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Last 7 days window
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  // ── All 9 queries in parallel 
  const [
    totalUsers,
    activeClients,
    activeProviders,
    appointmentsMTD,
    revenueAgg,
    userGrowthAgg,
    appointmentsTrendAgg,
    recentUsersRaw,
    recentAppointmentsAgg,
  ] = await Promise.all([

    // 1 — Total users (not deleted)
    User.countDocuments({ isDeleted: false }),

    // 2 — Active clients
    User.countDocuments({
      role:      USER_ROLES.CLIENT,
      isDeleted: false,
      isBlocked: false,
      status:    'active',
    }),

    // 3 — Active providers
    User.countDocuments({
      role:      USER_ROLES.PROVIDER,
      isDeleted: false,
      isBlocked: false,
      status:    'active',
    }),

    // 4 — Appointments this month (MTD), excluding cancelled
    Appointment.countDocuments({
      createdAt: { $gte: mtdStart, $lte: now },
      status:    { $ne: APPOINTMENT_STATUS.CANCELLED },
    }),

    // 5 — Total revenue: sum sessionFee of all completed appointments
    Appointment.aggregate([
      { $match: { status: APPOINTMENT_STATUS.COMPLETED } },
      { $group: { _id: null, totalRevenue: { $sum: '$sessionFee' } } },
    ]),

    // 6 — User signups per day — last 7 days
    User.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: weekStart, $lte: now },
        },
      },
      {
        $group: {
          _id:   { $dayOfWeek: '$createdAt' }, // 1=Sun … 7=Sat
          count: { $sum: 1 },
        },
      },
    ]),

    // 7 — Appointments per day — last 7 days (excluding cancelled)
    Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: weekStart, $lte: now },
          status:    { $ne: APPOINTMENT_STATUS.CANCELLED },
        },
      },
      {
        $group: {
          _id:   { $dayOfWeek: '$createdAt' }, // 1=Sun … 7=Sat
          count: { $sum: 1 },
        },
      },
    ]),

    // 8 — Recent users via .lean<LeanUser[]>()
    //     .lean() returns plain JS objects → createdAt is accessible
    //     without the "Property does not exist on Document" TS error
    User.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email role profileImage status createdAt')
      .lean<LeanUser[]>(),

    // 9 — Recent appointments with populated refs
    Appointment.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('client',   'name profileImage')
      .populate('provider', 'name')
      .lean<LeanAppointment[]>()
  ]);

  // ── User growth chart ─────────────────────────────────────────
  const userGrowthMap = buildWeekMap();
  for (const row of userGrowthAgg) {
    const label = DAY_LABELS[row._id - 1]; // $dayOfWeek: 1=Sun … 7=Sat
    if (label) userGrowthMap[label] = row.count;
  }
  const userGrowthData = Object.entries(userGrowthMap).map(([day, count]) => ({
    day,
    count,
  }));
  // "12.8k" total shown above the chart on the dashboard
  const userGrowthTotal = userGrowthData.reduce((sum, d) => sum + d.count, 0);

  // ── Appointments trend chart ──────────────────────────────────
  const appointmentsTrendMap = buildWeekMap();
  for (const row of appointmentsTrendAgg) {
    const label = DAY_LABELS[row._id - 1];
    if (label) appointmentsTrendMap[label] = row.count;
  }
  const appointmentsTrendData = Object.entries(appointmentsTrendMap).map(
    ([day, count]) => ({ day, count }),
  );
  // "12.8k" total shown above the chart on the dashboard
  const appointmentsTrendTotal = appointmentsTrendData.reduce(
    (sum, d) => sum + d.count,
    0,
  );

  // ── Recent activity feed ──────────────────────────────────────
  type ActivityItem = {
    type:        string;
    title:       string;
    description: string;
    createdAt:   Date;
  };

  const recentActivity: ActivityItem[] = [];

  // recentUsersRaw is LeanUser[] — createdAt: Date is fully typed 
  for (const u of recentUsersRaw) {
    if (u.role === USER_ROLES.CLIENT) {
      recentActivity.push({
        type:        'NEW_CLIENT',
        title:       'New Patient Signup',
        description: `${u.name} registered as a new client.`,
        createdAt:   u.createdAt,
      });
    }
    if (u.role === USER_ROLES.PROVIDER) {
      recentActivity.push({
        type:        'PROVIDER_SIGNUP',
        title:       'Provider Pending Approval',
        description: `${u.name} submitted their credentials for review.`,
        createdAt:   u.createdAt,
      });
    }
  }

  for (const appt of recentAppointmentsAgg) {
    const client   = (appt.client   as any)?.name ?? 'Client';
    const provider = (appt.provider as any)?.name ?? 'Provider';
    recentActivity.push({
      type:        'APPOINTMENT',
      title:       `Appointment — ${appt.sessionName || 'Session'}`,
      description: `${client} booked a session with ${provider}.`,
      createdAt:   appt.createdAt,
    });
  }

  // Merge all activity newest-first, keep top 10
  recentActivity.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // ── Final response ────────────────────────────────────────────
  return {
    stats: {
      totalUsers,
      activeClients,
      activeProviders,
      appointmentsMTD,
      totalRevenue: revenueAgg[0]?.totalRevenue ?? 0,
    },
    userGrowth: {
      total: userGrowthTotal,      
      data:  userGrowthData,      
    },
    appointmentsTrend: {
      total: appointmentsTrendTotal, 
      data:  appointmentsTrendData,  
    },
    recentActivity: recentActivity.slice(0, 10),
  };
};

export const DashboardService = { getAdminOverview };
