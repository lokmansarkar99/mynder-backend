import { Schema, model } from 'mongoose';
import { IClinicalNoteDocument, IClinicalNoteModel } from './clinicalNote.interface';

const clinicalNoteSchema = new Schema<IClinicalNoteDocument>(
  {
    client:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },

    noteType: {
      type: String,
      enum: ['soap', 'progress', 'intake', 'quick'],
      default: 'soap',
    },

    // SOAP
    subjective: { type: String, default: '' },
    objective:  { type: String, default: '' },
    assessment: { type: String, default: '' },
    plan:       { type: String, default: '' },

    // Dashboard quick note
    quickNote: { type: String, default: '' },

    isFinalized: { type: Boolean, default: false },
    finalizedAt: { type: Date, default: null },
    isSigned:    { type: Boolean, default: false },
    signedAt:    { type: Date, default: null },
  },
  { timestamps: true }
);

export const ClinicalNote = model<IClinicalNoteDocument, IClinicalNoteModel>(
  'ClinicalNote',
  clinicalNoteSchema
);
