import Stripe from 'stripe';
import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import stripeClient from '../../../config/stripe.config';
import ApiError from '../../../errors/ApiErrors';
import { Invoice } from '../invoice/invoice.model';
import { Appointment } from '../appointment/appointment.model';
import { Slot } from '../slot/slot.model';
import { PAYMENT_STATUS } from '../../../enums/payment';
import { SESSION_TYPE } from '../../../enums/appointment';
import { createBookingFromWebhook } from '../appointment/appointment.service';

// ─── Constants ────────────────────────────────────────────────────────────────
const PROCESSING_FEE       = 5;
const PLATFORM_FEE_PERCENT = 15;

// ─── calculateFees — exported, used by AppointmentService ────────────────────
export const calculateFees = (sessionFee: number) => {
  const processingFee = PROCESSING_FEE;
  const totalAmount   = sessionFee + processingFee;
  const platformFee   = +((sessionFee * PLATFORM_FEE_PERCENT) / 100).toFixed(2);
  const netAmount     = +(sessionFee - platformFee).toFixed(2);
  return { processingFee, totalAmount, platformFee, netAmount };
};

// ─── 1. Stripe Webhook ────────────────────────────────────────────────────────
const handleWebhook = async (rawBody: Buffer, signature: string) => {
  let event: Stripe.Event;

  try {
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err: any) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Webhook signature failed: ${err.message}`);
  }

  switch (event.type) {

    // ✅ Main booking event — Stripe Hosted Checkout payment complete
    case 'checkout.session.completed': {
      const session  = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata!;

      const clientId   = metadata.clientId;
      const slotId     = metadata.slotId;
      const sessionFee = Number(metadata.sessionFee);
      const sessionType = (metadata.sessionType as SESSION_TYPE) ?? SESSION_TYPE.INDIVIDUAL_THERAPY;
      const timezone   = metadata.timezone ?? 'America/New_York';

      const { processingFee } = calculateFees(sessionFee);

      const slot = await Slot.findById(new Types.ObjectId(slotId));
      if (!slot || slot.isBooked) break; // safety guard

      // ── Create Appointment + Invoice + Payout + Lock Slot
      await createBookingFromWebhook({
        clientId,
        clientObjectId:  new Types.ObjectId(clientId),
        slot,
        stripeSessionId: session.id,
        sessionType,
        sessionFee,
        processingFee,
        timezone,
      });

      console.log(`[WEBHOOK] Booking created for session: ${session.id}`);
      break;
    }

    // Payment failed
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[WEBHOOK] Checkout expired: ${session.id}`);
      break;
    }

    // Refund processed
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      await Invoice.findOneAndUpdate(
        { stripePaymentIntentId: charge.payment_intent as string },
        { $set: { paymentStatus: PAYMENT_STATUS.REFUNDED } },
      );
      break;
    }

    default:
      console.log(`[WEBHOOK] Unhandled: ${event.type}`);
  }

  return { received: true };
};

// ─── 2. Refund Payment ────────────────────────────────────────────────────────
const refundPayment = async (
  appointmentId: string,
  reason: Stripe.RefundCreateParams.Reason = 'requested_by_customer',
) => {
  const appointment = await Appointment.findById(new Types.ObjectId(appointmentId));
  if (!appointment) throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');

  const invoice = await Invoice.findOne({ appointment: appointment._id });
  if (!invoice || !(invoice as any).stripePaymentIntentId) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Invoice or payment not found');
  }
  if ((invoice as any).paymentStatus === PAYMENT_STATUS.REFUNDED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment already refunded');
  }

  // For Checkout Sessions → retrieve payment intent from session
  const session       = await stripeClient.checkout.sessions.retrieve(
    (invoice as any).stripePaymentIntentId,
  );
  const paymentIntent = session.payment_intent as string;

  const refund = await stripeClient.refunds.create({ payment_intent: paymentIntent, reason });

  await Invoice.findByIdAndUpdate((invoice as any)._id, {
    $set: { paymentStatus: PAYMENT_STATUS.REFUNDED },
  });

  return {
    refundId: refund.id,
    status:   refund.status,
    amount:   refund.amount ? refund.amount / 100 : 0,
  };
};

// ─── 3. Get Payment Status ────────────────────────────────────────────────────
const getPaymentStatus = async (appointmentId: string, userId: string) => {
  const appointment = await Appointment.findById(new Types.ObjectId(appointmentId));
  if (!appointment) throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');

  const isParticipant =
    appointment.client.toString()   === userId ||
    appointment.provider.toString() === userId;
  if (!isParticipant) throw new ApiError(StatusCodes.FORBIDDEN, 'Not authorized');

  const invoice = await Invoice.findOne({ appointment: appointment._id })
    .select('invoiceNumber sessionFee processingFee totalAmount paymentStatus paidAt');

  return { appointment, invoice };
};

export const StripeService = {
  calculateFees,
  handleWebhook,
  refundPayment,
  getPaymentStatus,
};
