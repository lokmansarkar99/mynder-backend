import { Document, Model, Types } from 'mongoose';
import { PAYMENT_METHOD, PAYMENT_STATUS, CLAIM_STATUS } from '../../../enums/payment';

type IInsuranceClaim = {
  provider:    string;
  memberId:    string;
  claimStatus: CLAIM_STATUS;
};

export type IInvoice = {
  invoiceNumber:  string;       // "INV-2026-03-001" auto-generated
  client:         Types.ObjectId;
  provider:       Types.ObjectId;
  appointment:    Types.ObjectId;
  description:    string;       // e.g. "Initial Consultation"
  sessionFee:     number;
  processingFee:  number;       // default: 5
  totalAmount:    number;       // sessionFee + processingFee
  paymentMethod:  PAYMENT_METHOD;
  paymentStatus:  PAYMENT_STATUS;
  paidAt:         Date | null;
  cardLast4:      string;       // last 4 digits display
  insuranceClaim: IInsuranceClaim;
  stripePaymentIntentId: string;
};

export type IInvoiceDocument = IInvoice & Document;
export type IInvoiceModel    = Model<IInvoiceDocument>;
