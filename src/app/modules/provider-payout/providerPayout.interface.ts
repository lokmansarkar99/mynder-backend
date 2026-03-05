import { Document, Model, Types } from 'mongoose';
import { PAYOUT_STATUS } from '../../../enums/payment';

export type IProviderPayout = {
  payoutId:           string;     // "CLM-9021" auto-generated
  provider:           Types.ObjectId;
  appointment:        Types.ObjectId;
  grossAmount:        number;     // full session fee
  platformFeePercent: number;     // default: 15
  platformFee:        number;     // auto-calculated
  netAmount:          number;     // grossAmount - platformFee
  status:             PAYOUT_STATUS;
  payoutDate:         Date | null;
  failureReason:      string;
};

export type IProviderPayoutDocument = IProviderPayout & Document;
export type IProviderPayoutModel    = Model<IProviderPayoutDocument>;
