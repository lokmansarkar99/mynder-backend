import { Document, Model, Types } from 'mongoose';

export type IFAQ = {
  question:    string;
  answer:      string;
  order:       number;
  isPublished: boolean;
  createdBy:   Types.ObjectId;
};


export type IFAQDocument = IFAQ & Document;
export type IFAQModel    = Model<IFAQDocument>;