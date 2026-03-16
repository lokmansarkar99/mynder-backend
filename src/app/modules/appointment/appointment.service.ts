import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { Appointment } from './appointment.model';
import { Slot } from '../slot/slot.model';
import { Invoice } from '../invoice/invoice.model';
import { ProviderPayout } from '../provider-payout/providerPayout.model';
import { SessionType as SessionTypeModel } from '../session-type/sessionType.model';
import stripeClient from '../../../config/stripe.config';
import { StripeService } from '../stripe/stripe.service';
import { QueryBuilder } from '../../buillder/queryBuilder';
import { APPOINTMENT_STATUS, CANCELLED_BY, SESSION_TYPE } from '../../../enums/appointment';
import { PAYMENT_STATUS, PAYMENT_METHOD } from '../../../enums/payment';
import { IAppointmentDocument } from './appointment.interface';
import { TCancelAppointmentPayload, TSessionSummaryPayload } from './appointment.validation';
import { TCreateCheckoutSessionPayload, TCreateBookingRecordsParams } from '../../../types/appointment.types';


import config from '../../../config';

import sendNotification from '../../../shared/sendNotification';
import { NOTIFICATION_TYPE , REFERENCE_MODEL} from '../../../enums/notification';
import { ProviderProfile } from './../provider-profile/providerProfile.model';
import { ClientProfile } from '../client-profile/clientProfile.model';

// ─── Private Helper — called by stripe webhook after payment ──────────────────
// Exported so stripe.service.ts can call it from webhook handler
export const createBookingFromWebhook = async (
  params: TCreateBookingRecordsParams,
): Promise<void> => {
  const {
    clientId,
    clientObjectId,
    slot,
    stripeSessionId,
    sessionType,
    sessionFee,
    processingFee,
    timezone,
  } = params;

  const freshSlot = await Slot.findById(slot._id);
  if (freshSlot?.isBooked) return;

  const sessionTypeDoc = await SessionTypeModel.findById(slot.sessionType);

  const [startHour, startMin] = slot.startTime.split(':').map(Number);
  const scheduledAt = new Date(slot.date);
  scheduledAt.setUTCHours(startHour, startMin, 0, 0);

  // ── Create Appointment ────────────────────────────────────────────────────
  const appointment = await Appointment.create({
    client:          clientObjectId,
    provider:        slot.provider,
    slot:            slot._id,
    sessionType,
    sessionTypeRef:  slot.sessionType,
    sessionName:     slot.sessionName,
    scheduledAt,
    durationMinutes: slot.duration,
    timezone,
    sessionFee,
    meetingLink:     slot.meetingLink     ?? '',
    meetingId:       slot.meetingId       ?? '',
    meetingPassword: slot.meetingPassword ?? '',
    paymentIntentId: stripeSessionId,
    status:          APPOINTMENT_STATUS.UPCOMING,
  }) as IAppointmentDocument;

  // ── Lock Slot ─────────────────────────────────────────────────────────────
  await Slot.findByIdAndUpdate(slot._id, {
    $set: { isBooked: true, bookedBy: clientObjectId, appointment: appointment._id },
  });

  // ── Create Invoice ────────────────────────────────────────────────────────
  const invoice = await Invoice.create({
    client:      clientObjectId,
    provider:    slot.provider,
    appointment: appointment._id,
    description: sessionTypeDoc
      ? `${sessionTypeDoc.name} — ${slot.duration} min session`
      : `${slot.sessionName} — ${slot.duration} min session`,
    sessionFee,
    processingFee,
    paymentMethod:         PAYMENT_METHOD.CREDIT_CARD,
    paymentStatus:         PAYMENT_STATUS.COMPLETED,
    paidAt:                new Date(),
    stripePaymentIntentId: stripeSessionId,
  });

  // ── Create ProviderPayout ─────────────────────────────────────────────────
  await ProviderPayout.create({
    provider:           slot.provider,
    appointment:        appointment._id,
    grossAmount:        sessionFee,
    platformFeePercent: Number(config.fees.platform_fee_percent),
    status:             'pending',
  });

  // ── Link Invoice → Appointment ────────────────────────────────────────────
  await Appointment.findByIdAndUpdate(appointment._id, {
    $set: { invoice: (invoice as any)._id },
  });

  // ── F-1: Notify CLIENT + PROVIDER — BOOKING_CONFIRMED ────────────────────
  // Promise.allSettled → if one notification fails, the other still fires
  // and neither failure crashes the webhook handler
  await Promise.allSettled([
    sendNotification({
      recipientId:    clientId,
      type:           NOTIFICATION_TYPE.BOOKING_CONFIRMED,
      title:          'Booking Confirmed! ',
      body:           `Your ${slot.duration}-min session "${slot.sessionName}" on ${new Date(slot.date).toDateString()} at ${slot.startTime} is confirmed.`,
      referenceId:    appointment._id,
      referenceModel: REFERENCE_MODEL.APPOINTMENT,
    }),
    sendNotification({
      recipientId:    slot.provider,
      type:           NOTIFICATION_TYPE.BOOKING_CONFIRMED,
      title:          'New Booking Received! ',
      body:           `A client has booked your "${slot.sessionName}" session on ${new Date(slot.date).toDateString()} at ${slot.startTime}.`,
      referenceId:    appointment._id,
      referenceModel: REFERENCE_MODEL.APPOINTMENT,
    }),
  ]);
};


// ─── 1. Create Checkout Session─────
// Returns Stripe hosted checkout URL → frontend redirects to it
const createCheckoutSession = async (
  clientId: string,
  payload:  TCreateCheckoutSessionPayload,
) => {
  const {
    slotId,
    sessionType = SESSION_TYPE.INDIVIDUAL_THERAPY,
    timezone    = 'America/New_York',
  } = payload;

  // ── Validate Slot
  const slot = await Slot.findById(new Types.ObjectId(slotId));
  if (!slot)          throw new ApiError(StatusCodes.NOT_FOUND,  'Slot not found');
  if (slot.isBooked)  throw new ApiError(StatusCodes.CONFLICT,   'This slot is already booked');
  if (slot.isExpired) throw new ApiError(StatusCodes.GONE,       'This slot has expired');
  if (slot.provider.toString() === clientId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot book your own slot');
  }

  const { processingFee } = StripeService.calculateFees(slot.price);

  // ── Create Stripe Hosted Checkout Session
  const session = await stripeClient.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency:     'usd',
          unit_amount:  Math.round(slot.price * 100),
          product_data: {
            name:        `${slot.sessionName} — ${slot.duration} min`,
            description: `Session on ${new Date(slot.date).toDateString()} at ${slot.startTime}`,
          },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency:     'usd',
          unit_amount:  Math.round(processingFee * 100),
          product_data: { name: 'Processing Fee' },
        },
        quantity: 1,
      },
    ],
    //  Stripe redirects here after payment
    success_url: `${config.stripe.success_url}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${config.stripe.cancel_url as string}`,
    //  All info stored here — webhook reads this
    metadata: {
      clientId,
      slotId,
      sessionFee:  String(slot.price),
      sessionType,
      timezone,
    },
  });

  return {
    checkoutUrl: session.url,   // → frontend: window.location.href = checkoutUrl
    sessionId:   session.id,
  };
};

// ─── 2. Get My Appointments ──
const getMyAppointments = async (
  userId: string,
  role:   'CLIENT' | 'PROVIDER',
  query:  Record<string, unknown>,
) => {
  const filter: Record<string, unknown> = {
    [role === 'CLIENT' ? 'client' : 'provider']: new Types.ObjectId(userId),
  };
  if (query.status) filter.status = query.status;

  const appointmentQuery = new QueryBuilder(
    Appointment.find(filter, {status: 1, meetingLink: 1, meetingId: 1, meetingPassword: 1,sessionType: 1, scheduledAt: 1, cancelledBy: 1, cancellationReason: 1})
      .populate('client',   'email name')
      .populate('provider', 'email name')
      .populate('slot',     'startTime endTime date')
      .populate('invoice', 'paymentStatus'),
    query,
  )
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    appointmentQuery.modelQuery,
    appointmentQuery.countTotal(),
  ]);

  return { data, meta };
};

// ─── 3. Get Appointment By ID 
const getAppointmentById = async (appointmentId: string, userId: string, role: string) => {
  const appointment = await Appointment.findById(new Types.ObjectId(appointmentId))
    .populate('client',   'email name')
    .populate('provider', 'email name')
    .populate('slot',     'startTime endTime date')
    .populate('invoice');

  if (!appointment) throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');

  return appointment;
};

// ─── 4. Cancel Appointment ───
const cancelAppointment = async (
  appointmentId: string,
  userId:        string,
  role:          string,
  payload:       TCancelAppointmentPayload,
) => {
  const appointment = await Appointment.findById(new Types.ObjectId(appointmentId));
  if (!appointment) throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');

  const isClient   = appointment.client.toString()   === userId;
  const isProvider = appointment.provider.toString() === userId;
  const isAdmin    = role === 'ADMIN';

  if (!isClient && !isProvider && !isAdmin) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not authorized to cancel');
  }
  if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot cancel a completed appointment');
  }
  if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Already cancelled');
  }

  let cancelledBy: CANCELLED_BY;
  if (isAdmin)       cancelledBy = CANCELLED_BY.ADMIN;
  else if (isClient) cancelledBy = CANCELLED_BY.CLIENT;
  else               cancelledBy = CANCELLED_BY.PROVIDER;

  const updated = await Appointment.findByIdAndUpdate(
    appointmentId,
    {
      $set: {
        status:             APPOINTMENT_STATUS.CANCELLED,
        cancelledBy,
        cancellationReason: payload.cancellationReason,
      },
    },
    { returnDocument: 'after' },
  );

  // ── Unlock Slot 
  await Slot.findByIdAndUpdate(appointment.slot, {
    $set: { isBooked: false, bookedBy: null, appointment: null },
  });

  // ── Auto-refund via Stripe
  try {
    await StripeService.refundPayment(appointmentId, 'requested_by_customer');
  } catch (err) {
    console.error('[REFUND ERROR on cancel]', err);
  }

  // ── F-2: Notify CLIENT + PROVIDER — BOOKING_CANCELLED 
  // Who cancelled determines the message wording
  const cancelledByLabel = isAdmin ? 'Admin' : isClient ? 'the client' : 'the provider';

  await Promise.allSettled([
    sendNotification({
      recipientId:    appointment.client,
      type:           NOTIFICATION_TYPE.BOOKING_CANCELLED,
      title:          'Appointment Cancelled',
      body:           `Your appointment scheduled for ${appointment.scheduledAt.toDateString()} has been cancelled by ${cancelledByLabel}.${payload.cancellationReason ? ` Reason: ${payload.cancellationReason}` : ''}`,
      referenceId:    appointment._id,
      referenceModel: REFERENCE_MODEL.APPOINTMENT,
    }),
    sendNotification({
      recipientId:    appointment.provider,
      type:           NOTIFICATION_TYPE.BOOKING_CANCELLED,
      title:          'Appointment Cancelled',
      body:           `An appointment scheduled for ${appointment.scheduledAt.toDateString()} has been cancelled by ${cancelledByLabel}.${payload.cancellationReason ? ` Reason: ${payload.cancellationReason}` : ''}`,
      referenceId:    appointment._id,
      referenceModel: REFERENCE_MODEL.APPOINTMENT,
    }),
  ]);

  return updated;
};


// ─── 5. Get All Appointments (Admin)
const getAllAppointments = async (query: Record<string, unknown>) => {
  const appointmentQuery = new QueryBuilder(
    Appointment.find({}, {appointmentId:1, scheduledAt:1, status:1})
      .populate('client',   ' name')
      .populate('provider', ' name'),
      // .populate('invoice'),
    query,
  )
    .search(['appointmentId'])
    .filter()
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    appointmentQuery.modelQuery,
    appointmentQuery.countTotal(),
  ]);

  return { data, meta };
};

// ─── 6. Provider Today's Appointments ─────────────────────────────────────────
const getProviderTodayAppointments = async (providerId: string) => {
  const todayStart = new Date(); todayStart.setUTCHours(0,  0,  0,   0);
  const todayEnd   = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);

  return Appointment.find({
    provider:    new Types.ObjectId(providerId),
    scheduledAt: { $gte: todayStart, $lte: todayEnd },
    status:      { $in: [APPOINTMENT_STATUS.UPCOMING, APPOINTMENT_STATUS.ONGOING] },
  })
    .sort({ scheduledAt: 1 })
    .populate('client', 'email name')
    .populate('slot',   'startTime endTime');
};

// ─── 7. Start Session ────────
const startSession = async (appointmentId: string, providerId: string) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  if (appointment.provider.toString() !== providerId)
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not your appointment');
  if (appointment.status !== APPOINTMENT_STATUS.UPCOMING)
    throw new ApiError(StatusCodes.BAD_REQUEST, `Cannot start — status: ${appointment.status}`);

  return Appointment.findByIdAndUpdate(
    appointmentId,
    { $set: { status: APPOINTMENT_STATUS.ONGOING } },
    { returnDocument: 'after' },
  );
};

// ─── 8. Complete Session ─────
const completeSession = async (appointmentId: string, providerId: string) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  if (appointment.provider.toString() !== providerId)
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not your appointment');
  if (appointment.status !== APPOINTMENT_STATUS.ONGOING)
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session must be ongoing first');

  return Appointment.findByIdAndUpdate(
    appointmentId,
    { $set: { status: APPOINTMENT_STATUS.COMPLETED } },
    { returnDocument: 'after' },
  );
};

// ─── 9. Mark No-Show ─────────
const markNoShow = async (appointmentId: string, userId: string) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  if (appointment.provider.toString() !== userId)
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only provider can mark no-show');
  if (appointment.status !== APPOINTMENT_STATUS.UPCOMING)
    throw new ApiError(StatusCodes.BAD_REQUEST, `Cannot mark — status: ${appointment.status}`);

  return Appointment.findByIdAndUpdate(
    appointmentId,
    { $set: { status: APPOINTMENT_STATUS.NO_SHOW } },
    { returnDocument: 'after' },
  );
};

// ─── 10. Add Session Summary ─
const addSessionSummary = async (
  appointmentId: string,
  providerId:    string,
  payload:       TSessionSummaryPayload,
) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  if (appointment.provider.toString() !== providerId)
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not your appointment');
  if (appointment.status !== APPOINTMENT_STATUS.COMPLETED)
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Only for completed appointments');

  return Appointment.findByIdAndUpdate(
    appointmentId,
    { $set: { sessionSummary: payload.sessionSummary } },
    { returnDocument: 'after' },
  );
};



// Add this new function to your existing appointment.service.ts
// Keep all existing functions, just add this one

const getAdminAppointmentById = async (appointmentId: string) => {

  // ── 1. Get appointment with base populates ────────────────────
  const appointment = await Appointment.findById(new Types.ObjectId(appointmentId))
    .populate('client',   '_id email')
    .populate('provider', '_id email')
    .populate('slot',     'startTime endTime date meetingLink meetingId meetingPassword')
    .populate('invoice',  'invoiceNumber sessionFee processingFee totalAmount paymentMethod paymentStatus paidAt cardLast4')
    .lean();

  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  const clientUserId   = (appointment.client   as any)?._id;
  const providerUserId = (appointment.provider as any)?._id;

  // ── 2. Fetch ClientProfile + ProviderProfile in parallel ─────
  const [clientProfile, providerProfile] = await Promise.all([

    ClientProfile.findOne({ user: clientUserId })
      .select('fullName phone profilePhoto billingAddress')
      .lean(),

    ProviderProfile.findOne({ user: providerUserId })
      .select('fullName phone providerType licenseNumber licenseState additionalCertifications professionalPhoto')
      .lean(),
  ]);

  // ── 3. Shape invoice / payment info ──────────────────────────
  const invoice  = appointment.invoice as any;
  const slot     = appointment.slot    as any;

  const paymentStatus = invoice
    ? invoice.paymentStatus === 'completed'
      ? `Paid (${invoice.paymentMethod === 'credit_card' ? 'Credit Card' : invoice.paymentMethod}${invoice.cardLast4 ? ` ending in ${invoice.cardLast4}` : ''})`
      : invoice.paymentStatus
    : 'Pending';

  // ── 4. Shape timezone label ───────────────────────────────────
  const timezoneLabels: Record<string, string> = {
    'America/New_York':    'Eastern Standard Time (EST)',
    'America/Chicago':     'Central Standard Time (CST)',
    'America/Denver':      'Mountain Standard Time (MST)',
    'America/Los_Angeles': 'Pacific Standard Time (PST)',
    'Europe/London':       'Greenwich Mean Time (GMT)',
    'Asia/Dhaka':          'Bangladesh Standard Time (BST)',
  };
  const timezoneLabel = timezoneLabels[appointment.timezone] ?? appointment.timezone;

  // ── 5. Shape provider credentials label ──────────────────────
  const providerTypeLabels: Record<string, string> = {
    clinical_psychologist: 'Clinical Psychologist',
    licensed_counselor:    'Licensed Counselor',
    social_worker:         'Social Worker',
    psychiatrist:          'Psychiatrist',
    other:                 'Therapist',
  };
  const credentials = [
    providerProfile?.licenseNumber ? `${providerProfile.licenseNumber}` : null,
    providerProfile?.providerType  ? providerTypeLabels[providerProfile.providerType] : null,
    providerProfile?.additionalCertifications ?? null,
  ]
    .filter(Boolean)
    .join(', ');

  // ── 6. Final shaped response ──────────────────────────────────
  return {
    // ── Header breadcrumb ──────────────────────────────────
    appointmentId:  appointment.appointmentId,
    status:         appointment.status,

    // ── Client Information (top-left card) ────────────────
    clientInfo: {
      fullName:  clientProfile?.fullName ?? (appointment.client as any)?.email ?? 'Client',
      clientId:  `C-${String(clientProfile?._id ?? clientUserId).slice(-5).toUpperCase()}`,
      email:     (appointment.client as any)?.email ?? '',
      phone:     clientProfile?.phone ?? '',
      photo:     clientProfile?.profilePhoto ?? '',
    },

    // ── Provider Information (top-right card) ─────────────
    providerInfo: {
      fullName:    providerProfile?.fullName ?? (appointment.provider as any)?.email ?? 'Provider',
      credentials,                             // "Psy.D, Clinical Psychologist"
      phone:       providerProfile?.phone ?? '',
      photo:       providerProfile?.professionalPhoto ?? '',
      providerType: providerProfile?.providerType ?? '',
    },

    // ── Session Schedule (bottom-left card) ───────────────
    sessionSchedule: {
      scheduledAt:     appointment.scheduledAt,    // Date & Time
      endAt:           appointment.endAt,
      timezone:        appointment.timezone,
      timezoneLabel,                               // "Eastern Standard Time (EST)"
      durationMinutes: appointment.durationMinutes,
      format:          appointment.format,         // "online" | "in_person"
      meetingLink:     slot?.meetingLink    ?? appointment.meetingLink    ?? '',
      meetingId:       slot?.meetingId      ?? appointment.meetingId      ?? '',
      meetingPassword: slot?.meetingPassword ?? appointment.meetingPassword ?? '',
      sessionName:     appointment.sessionName,
    },

    // ── Financial Information (bottom-right card) ─────────
    financialInfo: {
      sessionFee:     appointment.sessionFee,       // 150
      processingFee:  invoice?.processingFee  ?? 0,
      totalAmount:    invoice?.totalAmount    ?? appointment.sessionFee,
      paymentStatus,                                // "Paid (Credit Card ending in 4242)"
      paymentMethod:  invoice?.paymentMethod  ?? '',
      cardLast4:      invoice?.cardLast4      ?? '',
      invoiceNumber:  invoice?.invoiceNumber  ?? '',
      paidAt:         invoice?.paidAt         ?? null,
      sessionType:    `${appointment.sessionName} (${appointment.durationMinutes} min)`,
    },
  };
};




export const AppointmentService = {
  createCheckoutSession,     
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  getAllAppointments,
  getProviderTodayAppointments,
  startSession,
  completeSession,
  markNoShow,
  addSessionSummary,
  getAdminAppointmentById
};
