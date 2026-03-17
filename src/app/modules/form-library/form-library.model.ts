import { Schema, model } from 'mongoose';
import { IFormLibraryDocument, IFormLibraryModel } from './form-library.interface';

const CATEGORIES = ['consent', 'policy', 'privacy', 'telehealth', 'payment', 'other'];

const formLibrarySchema = new Schema<IFormLibraryDocument>(
  {
    // Provider who owns this document
    provider: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // Document title — "Informed Consent", "Practice Policies" etc.
    title: {
      type:     String,
      required: true,
      trim:     true,
    },

    // Rich text HTML content from editor
    content: {
      type:    String,
      default: '',
    },

    // Category for grouping/filtering
    category: {
      type:    String,
      enum:    CATEGORIES,
      default: 'other',
    },

    // Show/hide in list
    isActive: {
      type:    Boolean,
      default: true,
    },

    // Display order
    order: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true },
);


formLibrarySchema.index({ provider: 1, order: 1 });

export const FormLibrary = model<IFormLibraryDocument, IFormLibraryModel>(
  'FormLibrary',
  formLibrarySchema,
);
