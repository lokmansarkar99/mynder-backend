import { Schema, model } from 'mongoose';
import { IProviderPayoutDocument, IProviderPayoutModel } from './providerPayout.interface';
import { PAYOUT_STATUS } from '../../../enums/payment';
import config from '../../../config';

const providerPayoutSchema = new Schema<IProviderPayoutDocument>(
  {
    payoutId:    { type: String, unique: true },
    provider:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },

    grossAmount:        { type: Number, required: true },
    platformFeePercent: { type: Number, default: Number(config.fees.platform_fee_percent) },
    platformFee:        { type: Number },
    netAmount:          { type: Number },

    status:        { type: String, enum: Object.values(PAYOUT_STATUS), default: PAYOUT_STATUS.PENDING },
    payoutDate:    { type: Date, default: null },
    failureReason: { type: String, default: '' },
  },
  { timestamps: true }
);

providerPayoutSchema.pre('save', function () {
  if (this.isNew) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.payoutId   = `CLM-${randomNum}`;

    this.platformFee = (this.grossAmount * this.platformFeePercent) / 100;
    this.netAmount   = this.grossAmount - this.platformFee;
  }
});

export const ProviderPayout = model<IProviderPayoutDocument, IProviderPayoutModel>(
  'ProviderPayout',
  providerPayoutSchema
);
