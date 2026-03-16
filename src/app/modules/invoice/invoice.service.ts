import { Types }       from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { Invoice }     from './invoice.model';
import { Appointment } from '../appointment/appointment.model';
import { ProviderProfile } from '../provider-profile/providerProfile.model';
import { QueryBuilder } from '../../buillder/queryBuilder';
import { PAYMENT_STATUS }     from '../../../enums/payment';
import { APPOINTMENT_STATUS } from '../../../enums/appointment';

const getMyBillingHistory = async (
  clientUserId: string,
  query: Record<string, unknown>,
) => {
  const now       = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1); // Jan 1 this year

  // ── 1. All 3 in parallel ──────────────────────────────────────
  const [pastDueAgg, nextAppointment] = await Promise.all([

    // Past Due This Year — unpaid invoices created this year
    Invoice.aggregate([
      {
        $match: {
          client:        new Types.ObjectId(clientUserId),
          paymentStatus: { $ne: PAYMENT_STATUS.COMPLETED },
          createdAt:     { $gte: yearStart },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),

    // Upcoming Payments — next single upcoming appointment
    Appointment.findOne({
      client:      new Types.ObjectId(clientUserId),
      status:      APPOINTMENT_STATUS.UPCOMING,
      scheduledAt: { $gt: now },
    })
      .sort({ scheduledAt: 1 })
      .select('scheduledAt sessionFee')
      .lean(),
  ]);

  // ── 2. Paginated invoice list with provider name ──────────────
  const invoiceBaseQuery = Invoice.find({
    client: new Types.ObjectId(clientUserId),
  })
    .populate('provider', '_id')   // User._id → look up ProviderProfile
    .populate('appointment', 'sessionName format durationMinutes')
    .select(
      'invoiceNumber description sessionFee processingFee totalAmount ' +
      'paymentMethod paymentStatus paidAt createdAt provider appointment',
    );

  const invoiceQuery = new QueryBuilder(invoiceBaseQuery, query)
    .filter()
    .sort()
    .paginate();

  const [invoices, meta] = await Promise.all([
    invoiceQuery.modelQuery,
    invoiceQuery.countTotal(),
  ]);

  // ── 3. Enrich invoices with provider fullName ─────────────────
  const providerUserIds = [
    ...new Set(
      invoices.map((inv: any) => inv.provider?._id?.toString()).filter(Boolean),
    ),
  ];

  const providerProfiles = providerUserIds.length
    ? await ProviderProfile.find({ user: { $in: providerUserIds } })
        .select('user fullName')
        .lean()
    : [];

  const providerMap = Object.fromEntries(
    providerProfiles.map((p: any) => [p.user.toString(), p.fullName]),
  );

  // ── 4. Shape invoice rows ─────────────────────────────────────
  const transactions = invoices.map((inv: any) => ({
    invoiceId:      inv._id,
    invoiceNumber:  inv.invoiceNumber,
    date:           inv.createdAt,
    paidAt:         inv.paidAt,
    description:    inv.description || (inv.appointment as any)?.sessionName || 'Session',
    providerName:   providerMap[inv.provider?._id?.toString()] ?? 'Provider',
    paymentMethod:  inv.paymentMethod,   // "credit_card"
    amount:         inv.totalAmount,
    sessionFee:     inv.sessionFee,
    processingFee:  inv.processingFee,
    paymentStatus:  inv.paymentStatus,   // "completed" | "pending" | "refunded"
  }));

  // ── 5. Final response ─────────────────────────────────────────
  return {
    // Summary cards
    summary: {
      pastDueThisYear: pastDueAgg[0]?.total ?? 0,

      upcomingPayment: nextAppointment
        ? {
            amount:      nextAppointment.sessionFee,
            scheduledAt: nextAppointment.scheduledAt,
          }
        : null,
    },

    // Paginated table
    transactions,
    meta,
  };
};

export const InvoiceService = {
  getMyBillingHistory,
  // ...other existing exports
};
