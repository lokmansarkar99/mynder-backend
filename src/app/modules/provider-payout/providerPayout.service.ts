import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import stripeClient from '../../../config/stripe.config';
import ApiError from '../../../errors/ApiErrors';
import { ProviderPayout } from './providerPayout.model';
import { Appointment } from '../appointment/appointment.model';
import { APPOINTMENT_STATUS } from '../../../enums/appointment';
import { QueryBuilder } from '../../buillder/queryBuilder';

// ─── 1. Get All Payouts (Admin) ───────────────────────────────────────────────
const getAllPayouts = async (query: Record<string, unknown>) => {
  const payoutQuery = new QueryBuilder(
    ProviderPayout.find()
      .populate('provider',    'email name')
      .populate('appointment', 'appointmentId scheduledAt sessionFee status'),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    payoutQuery.modelQuery,
    payoutQuery.countTotal(),
  ]);

  return { data, meta };
};

// ─── 2. Get Provider's Own Payouts ────────────────────────────────────────────
const getMyPayouts = async (
  providerId: string,
  query:      Record<string, unknown>,
) => {
  const payoutQuery = new QueryBuilder(
    ProviderPayout.find({ provider: new Types.ObjectId(providerId) })
      .populate('appointment', 'appointmentId scheduledAt sessionFee status'),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    payoutQuery.modelQuery,
    payoutQuery.countTotal(),
  ]);

  return { data, meta };
};

// ─── 3. Get Payout By ID ──────────────────────────────────────────────────────
const getPayoutById = async (payoutId: string, userId: string, role: string) => {
  const payout = await ProviderPayout.findById(new Types.ObjectId(payoutId))
    .populate('provider',    'email name')
    .populate('appointment', 'appointmentId scheduledAt sessionFee status');

  if (!payout) throw new ApiError(StatusCodes.NOT_FOUND, 'Payout not found');

  const isProvider = (payout as any).provider._id.toString() === userId;
  const isAdmin    = role === 'ADMIN';

  if (!isProvider && !isAdmin) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not authorized');
  }

  return payout;
};

// ─── 4. Process Payout — Admin triggers manually ──────────────────────────────
// Requires provider to have a Stripe Connect account
const processPayout = async (payoutId: string) => {
  const payout = await ProviderPayout.findById(new Types.ObjectId(payoutId))
    .populate('provider', 'email name stripeAccountId');

  if (!payout) throw new ApiError(StatusCodes.NOT_FOUND, 'Payout not found');
  if ((payout as any).status === 'paid') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Already paid out');
  }
  if ((payout as any).status === 'processing') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Already processing');
  }

  // ── Verify appointment is COMPLETED ───────────────────────────────────────
  const appointment = await Appointment.findById((payout as any).appointment);
  if (!appointment) throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot payout — appointment status: ${appointment.status}`,
    );
  }

  const provider        = (payout as any).provider;
  const stripeAccountId = provider.stripeAccountId; // provider Stripe Connect ID

  // ── If provider has Stripe Connect — transfer directly ────────────────────
  if (stripeAccountId) {
    const transfer = await stripeClient.transfers.create({
      amount:      Math.round((payout as any).netAmount * 100), // cents
      currency:    'usd',
      destination: stripeAccountId,
      metadata: {
        payoutId:      (payout as any).payoutId,
        appointmentId: appointment.appointmentId,
        providerId:    provider._id.toString(),
      },
    });

    const updated = await ProviderPayout.findByIdAndUpdate(
      payoutId,
      {
        $set: {
          status:          'paid',
          payoutDate:      new Date(),
          stripeTransferId: transfer.id,
        },
      },
      { returnDocument: 'after' },
    );

    return updated;
  }

  // ── If no Stripe Connect — mark as processing (manual bank transfer) ───────
  const updated = await ProviderPayout.findByIdAndUpdate(
    payoutId,
    { $set: { status: 'processing' } },
    { returnDocument: 'after' },
  );

  return updated;
};

// ─── 5. Mark Payout as Paid — Admin (manual bank transfer case) ───────────────
const markPayoutAsPaid = async (payoutId: string) => {
  const payout = await ProviderPayout.findById(new Types.ObjectId(payoutId));
  if (!payout) throw new ApiError(StatusCodes.NOT_FOUND, 'Payout not found');
  if ((payout as any).status === 'paid') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Already paid');
  }

  return ProviderPayout.findByIdAndUpdate(
    payoutId,
    {
      $set: {
        status:     'paid',
        payoutDate: new Date(),
      },
    },
    { returnDocument: 'after' },
  );
};

// ─── 6. Mark Payout as Failed — Admin ─────────────────────────────────────────
const markPayoutAsFailed = async (payoutId: string, reason: string) => {
  const payout = await ProviderPayout.findById(new Types.ObjectId(payoutId));
  if (!payout) throw new ApiError(StatusCodes.NOT_FOUND, 'Payout not found');
  if ((payout as any).status === 'paid') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot fail an already paid payout');
  }

  return ProviderPayout.findByIdAndUpdate(
    payoutId,
    {
      $set: {
        status:        'failed',
        failureReason: reason,
      },
    },
    { returnDocument: 'after' },
  );
};

// ─── 7. Payout Summary — Admin Dashboard ──────────────────────────────────────
const getPayoutSummary = async () => {
  const summary = await ProviderPayout.aggregate([
    {
      $group: {
        _id:              '$status',
        count:            { $sum: 1 },
        totalGross:       { $sum: '$grossAmount' },
        totalNet:         { $sum: '$netAmount' },
        totalPlatformFee: { $sum: '$platformFee' },
      },
    },
  ]);

  return summary;
};

export const ProviderPayoutService = {
  getAllPayouts,
  getMyPayouts,
  getPayoutById,
  processPayout,
  markPayoutAsPaid,
  markPayoutAsFailed,
  getPayoutSummary,
};
