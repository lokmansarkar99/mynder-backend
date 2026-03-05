import { Document, Model, Types } from 'mongoose';

export type IClinicalNote = {
  client:      Types.ObjectId;
  provider:    Types.ObjectId;
  appointment: Types.ObjectId;
  noteType:    'soap' | 'progress' | 'intake' | 'quick';
  // SOAP fields
  subjective:  string;
  objective:   string;
  assessment:  string;
  plan:        string;
  // Quick note (dashboard widget)
  quickNote:   string;
  // Status
  isFinalized: boolean;
  finalizedAt: Date | null;
  isSigned:    boolean;
  signedAt:    Date | null;
};

export type IClinicalNoteDocument = IClinicalNote & Document;
export type IClinicalNoteModel    = Model<IClinicalNoteDocument>;
