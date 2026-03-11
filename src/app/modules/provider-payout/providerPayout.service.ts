import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import stripeClient from '../../../config/stripe.config';
import ApiError from '../../../errors/ApiErrors';
import { ProviderPayout } from './providerPayout.model';
import { Appointment } from '../appointment/appointment.model';
import { APPOINTMENT_STATUS } from '../../../enums/appointment';
import { QueryBuilder } from '../../buillder/queryBuilder';
import sendNotification from '../../../shared/sendNotification';  
import { NOTIFICATION_TYPE, REFERENCE_MODEL } from '../../../enums/notification'; 


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
  const stripeAccountId = provider.stripeAccountId;

  // ── PATH A: Provider has Stripe Connect — direct transfer ─────────────────
  if (stripeAccountId) {
    const transfer = await stripeClient.transfers.create({
      amount:      Math.round((payout as any).netAmount * 100),
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
          status:           'paid',
          payoutDate:       new Date(),
          stripeTransferId: transfer.id,
        },
      },
      { returnDocument: 'after' },
    );

    // ── F-3: Notify provider — Stripe transfer paid ────────────────────────
    await sendNotification({
      recipientId:    provider._id,
      type:           NOTIFICATION_TYPE.PAYOUT_PROCESSED,
      title:          'Payout Successful! ',
      body:           `Your payout of $${(payout as any).netAmount} has been transferred to your Stripe account successfully.`,
      referenceId:    payout._id,
      referenceModel: REFERENCE_MODEL.PROVIDER_PAYOUT,
    });

    return updated;
  }

  // ── PATH B: No Stripe Connect — mark as processing (manual bank transfer) ──
  const updated = await ProviderPayout.findByIdAndUpdate(
    payoutId,
    { $set: { status: 'processing' } },
    { returnDocument: 'after' },
  );

  // ── Notify provider — payout is being processed manually ──────────────────
  // Use PAYOUT_PROCESSED with a "processing" message so provider knows it's in progress
  await sendNotification({
    recipientId:    provider._id,
    type:           NOTIFICATION_TYPE.PAYOUT_PROCESSED,
    title:          'Payout In Progress ',
    body:           `Your payout of $${(payout as any).netAmount} is being processed via bank transfer. You will be notified once completed.`,
    referenceId:    payout._id,
    referenceModel: REFERENCE_MODEL.PROVIDER_PAYOUT,
  });

  return updated;
};


// ─── 5. Mark Payout as Paid — Admin (manual bank transfer case) ───────────────
const markPayoutAsPaid = async (payoutId: string) => {
  const payout = await ProviderPayout.findById(new Types.ObjectId(payoutId));
  if (!payout) throw new ApiError(StatusCodes.NOT_FOUND, 'Payout not found');
  if ((payout as any).status === 'paid') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Already paid');
  }

  const updated = await ProviderPayout.findByIdAndUpdate(
    payoutId,
    {
      $set: {
        status:     'paid',
        payoutDate: new Date(),
      },
    },
    { returnDocument: 'after' },
  );

  // ── F-3: Notify provider — manual bank transfer completed ─────────────────
  await sendNotification({
    recipientId:    (payout as any).provider,
    type:           NOTIFICATION_TYPE.PAYOUT_PROCESSED,
    title:          'Payout Successful! ',
    body:           `Your payout of $${(payout as any).netAmount} has been completed via bank transfer.`,
    referenceId:    payout._id,
    referenceModel: REFERENCE_MODEL.PROVIDER_PAYOUT,
  });

  return updated;
};


// ─── 6. Mark Payout as Failed — Admin ─────────────────────────────────────────
const markPayoutAsFailed = async (payoutId: string, reason: string) => {
  const payout = await ProviderPayout.findById(new Types.ObjectId(payoutId));
  if (!payout) throw new ApiError(StatusCodes.NOT_FOUND, 'Payout not found');
  if ((payout as any).status === 'paid') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot fail an already paid payout');
  }

  const updated = await ProviderPayout.findByIdAndUpdate(
    payoutId,
    {
      $set: {
        status:        'failed',
        failureReason: reason,
      },
    },
    { returnDocument: 'after' },
  );

  // ── F-4: Notify provider — payout failed ──────────────────────────────────
  await sendNotification({
    recipientId:    (payout as any).provider,
    type:           NOTIFICATION_TYPE.PAYOUT_FAILED,
    title:          'Payout Failed ',
    body:           reason
      ? `Your payout of $${(payout as any).netAmount} failed. Reason: ${reason}. Please contact support.`
      : `Your payout of $${(payout as any).netAmount} could not be processed. Please contact support.`,
    referenceId:    payout._id,
    referenceModel: REFERENCE_MODEL.PROVIDER_PAYOUT,
  });

  return updated;
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
