import { Schema, model, Document, Model, Types } from 'mongoose';

type IIntakeFormField = {
  formType:    'client' | 'provider';
  fieldLabel:  string;
  fieldKey:    string;  // camelCase: "legalFullName"
  fieldType:   'short_text' | 'long_text' | 'select' | 'multiselect' | 'date' | 'file' | 'phone' | 'email' | 'checkbox' | 'radio';
  options:     string[];  // for select/radio/checkbox
  isRequired:  boolean;
  isActive:    boolean;
  order:       number;   // display sequence
  step:        number;   // 1-5 client, 1-3 provider
  createdBy:   Types.ObjectId;
};

type IIntakeFormFieldDocument = IIntakeFormField & Document;
type IIntakeFormFieldModel    = Model<IIntakeFormFieldDocument>;

const intakeFormFieldSchema = new Schema<IIntakeFormFieldDocument>(
  {
    formType:  { type: String, enum: ['client','provider'], required: true },
    fieldLabel: { type: String, required: true },
    fieldKey:  { type: String, required: true },
    fieldType: {
      type: String,
      enum: ['short_text','long_text','select','multiselect','date','file','phone','email','checkbox','radio'],
      required: true,
    },
    options:    { type: [String], default: [] },
    isRequired: { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true },
    order:      { type: Number, default: 0 },
    step:       { type: Number, required: true },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

intakeFormFieldSchema.index({ formType: 1, step: 1, order: 1 });

export const IntakeFormField = model<IIntakeFormFieldDocument, IIntakeFormFieldModel>(
  'IntakeFormField',
  intakeFormFieldSchema
);
