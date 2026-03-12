import { Document, Model, Types } from 'mongoose';

export type IReview = {
  client:      Types.ObjectId;
  provider:    Types.ObjectId;
  appointment: Types.ObjectId;
  rating:      number; 
  comment:     string;
  isPublished: boolean;
};

export type IReviewDocument = IReview & Document;
export type IReviewModel    = Model<IReviewDocument>;
