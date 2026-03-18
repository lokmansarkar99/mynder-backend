import { Document, Model, Types } from 'mongoose';

export type TFormLibraryCategory =
  | 'consent'
  | 'policy'
  | 'privacy'
  | 'telehealth'
  | 'payment'
  | 'other';

export interface IFormLibraryDocument extends Document {
  provider:    Types.ObjectId;   // which provider owns this doc
  title:       string;           // "Informed Consent"
  content:     string;           // rich text HTML from editor
  category:    TFormLibraryCategory;
  isActive:    boolean;
  order:       number;           // display order in list
  createdAt:   Date;
  updatedAt:   Date;
}

export interface IFormLibraryModel extends Model<IFormLibraryDocument> {}
