import { Schema, model } from 'mongoose';
import { IInvoiceDocument, IInvoiceModel } from './invoice.interface';
import { PAYMENT_METHOD, PAYMENT_STATUS, CLAIM_STATUS } from '../../../enums/payment';

const insuranceClaimSchema = new Schema({
  provider:    { type: String },
  memberId:    { type: String },
  claimStatus: { type: String, enum: Object.values(CLAIM_STATUS) },
}, { _id: false });

const invoiceSchema = new Schema<IInvoiceDocument>(
  {
    invoiceNumber: { type: String, unique: true },

    client:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },

    description:   { type: String, default: '' },
    sessionFee:    { type: Number, required: true },
    processingFee: { type: Number, default: 0 },
    totalAmount:   { type: Number, default: 0 },

    paymentMethod: { type: String, enum: Object.values(PAYMENT_METHOD), required: true },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },
    paidAt:        { type: Date, default: null },
    cardLast4:     { type: String, default: '' },

    insuranceClaim:         { type: insuranceClaimSchema, default: {} },
    stripePaymentIntentId:  { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-generate invoice number: INV-2026-03-001
invoiceSchema.pre('validate', async function () {
  if (this.isNew) {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const count = await model('Invoice').countDocuments();

    this.invoiceNumber = `INV-${year}-${month}-${String(count + 1).padStart(3, '0')}`;
    this.totalAmount   = this.sessionFee + this.processingFee; 
  }
});

export const Invoice = model<IInvoiceDocument, IInvoiceModel>('Invoice', invoiceSchema);
