import { Schema, model, Document, Model, Types } from 'mongoose';
import { ProviderProfile } from '../provider-profile/providerProfile.model';

type IReview = {
  client:      Types.ObjectId;
  provider:    Types.ObjectId;
  appointment: Types.ObjectId;
  rating:      number;    // 1-5
  comment:     string;
  isPublished: boolean;
};

type IReviewDocument = IReview & Document;
type IReviewModel    = Model<IReviewDocument>;

const reviewSchema = new Schema<IReviewDocument>(
  {
    client:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    rating:      { type: Number, min: 1, max: 5, required: true },
    comment:     { type: String, default: '' },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One review per appointment
reviewSchema.index({ appointment: 1 }, { unique: true });

// Post-save hook: recalculate provider averageRating + totalReviews
reviewSchema.post('save', async function () {
  const stats = await model('Review').aggregate([
    { $match: { provider: this.provider, isPublished: true } },
    { $group: {
      _id:          '$provider',
      averageRating: { $avg: '$rating' },
      totalReviews:  { $sum: 1 },
    }},
  ]);

  if (stats.length > 0) {
    await ProviderProfile.updateOne(
      { user: this.provider },
      {
        averageRating: Math.round(stats[0].averageRating * 10) / 10,
        totalReviews:  stats[0].totalReviews,
      }
    );
  }
});

export const Review = model<IReviewDocument, IReviewModel>('Review', reviewSchema);
