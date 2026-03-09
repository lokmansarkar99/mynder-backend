import { Types } from 'mongoose';
import { SESSION_TYPE } from '../enums/appointment';

// ── Checkout Session ───────────────────────────────────────────────────────────
export type TCreateCheckoutSessionPayload = {
  slotId:      string;
  sessionType: SESSION_TYPE;
  timezone:    string;
};

// ── Internal helper — called from stripe webhook ───────────────────────────────
export type TCreateBookingRecordsParams = {
  clientId:        string;
  clientObjectId:  Types.ObjectId;
  slot:            any;
  stripeSessionId: string;       // Stripe checkout session ID
  sessionType:     SESSION_TYPE;
  sessionFee:      number;
  processingFee:   number;
  timezone:        string;
};
