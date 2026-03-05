import { Schema, model, Document, Model, Types } from 'mongoose';

type IFAQ = {
  question:    string;
  answer:      string;
  category:    'general' | 'insurance' | 'privacy' | 'scheduling' | 'technical';
  order:       number;
  isPublished: boolean;
  createdBy:   Types.ObjectId;
};

type IFAQDocument = IFAQ & Document;
type IFAQModel    = Model<IFAQDocument>;

const faqSchema = new Schema<IFAQDocument>(
  {
    question: { type: String, required: true },
    answer:   { type: String, required: true },
    category: {
      type: String,
      enum: ['general','insurance','privacy','scheduling','technical'],
      required: true,
    },
    order:       { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

faqSchema.index({ isPublished: 1, order: 1 });

export const FAQ = model<IFAQDocument, IFAQModel>('FAQ', faqSchema);
