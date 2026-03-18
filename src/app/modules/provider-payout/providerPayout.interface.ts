import { Document, Model, Types } from 'mongoose';
import { PAYOUT_STATUS } from '../../../enums/payment';

export type IProviderPayout = {
  payoutId:           string;     // "CLM-9021" auto-generated
  provider:           Types.ObjectId;
  appointment:        Types.ObjectId;
  grossAmount:        number;     // full session fee
  platformFeePercent: number;     
  platformFee:        number;     
  netAmount:          number;     
  status:             PAYOUT_STATUS;
  payoutDate:         Date | null;
  failureReason:      string;
  customFields: [ { fieldKey: string, fieldLabel:string, value: string } ]
};

export type IProviderPayoutDocument = IProviderPayout & Document;
export type IProviderPayoutModel    = Model<IProviderPayoutDocument>;
