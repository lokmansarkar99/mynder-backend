import { Schema, model } from 'mongoose';

// ── Maps existing static fields + any new dynamic ones ────────────
const intakeFormConfigSchema = new Schema(
  {
    // CLIENT or PROVIDER
    formType: {
      type:     String,
      enum:     ['CLIENT', 'PROVIDER'],
      required: true,
    },

    // Which step this field belongs to (matches existing steps)
    step: {
      type:    Number,
      default: 1,
    },

    // Field label shown to user
    label: {
      type:     String,
      required: true,
    },

    fieldKey: {
      type:     String,
      required: true,
    },

    // Input type
    fieldType: {
      type:    String,
      enum:    ['short_text', 'long_text', 'number', 'date', 'dropdown', 'checkbox', 'radio', 'file', 'email', 'phone'],
      default: 'short_text',
    },

    // Options for dropdown/radio
    options: {
      type:    [String],
      default: [],
    },

    isRequired: {
      type:    Boolean,
      default: false,
    },

    // ⚠️ CORE = existing schema field → admin can edit label but NOT delete
    // CUSTOM = new field added by admin → can delete freely
    isCore: {
      type:    Boolean,
      default: false,
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    order: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true },
);

intakeFormConfigSchema.index({ formType: 1, step: 1, order: 1 });

export const IntakeFormConfig = model('IntakeFormConfig', intakeFormConfigSchema);
