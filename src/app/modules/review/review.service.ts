import { Types }          from 'mongoose';
import { StatusCodes }     from 'http-status-codes';
import ApiError            from '../../../errors/ApiErrors';
import { Review }          from './review.model';
import { Appointment }     from '../appointment/appointment.model';
import { ProviderProfile } from '../provider-profile/providerProfile.model';
import { QueryBuilder }    from '../../buillder/queryBuilder';
import { APPOINTMENT_STATUS } from '../../../enums/appointment';
import { TCreateReviewPayload } from './review.validation';

// ── Private Helper: recalculate provider rating ───────────────────
// Called manually after togglePublish (findByIdAndUpdate bypasses
// the post-save mongoose hook defined in the model)
const recalculateProviderRating = async (
  providerId: Types.ObjectId | string,
): Promise<void> => {
  const stats = await Review.aggregate([
    {
      $match: {
        provider:    new Types.ObjectId(String(providerId)),
        isPublished: true,
      },
    },
    {
      $group: {
        _id:           '$provider',
        averageRating: { $avg: '$rating' },
        totalReviews:  { $sum: 1 },
      },
    },
  ]);

  await ProviderProfile.findOneAndUpdate(
    { user: providerId },
    {
      $set: {
        averageRating: stats.length > 0
          ? Math.round(stats[0].averageRating * 10) / 10
          : 0,
        totalReviews: stats.length > 0 ? stats[0].totalReviews : 0,
      },
    },
  );
};

// ── 1. Create Review (Client) 
const createReview = async (
  clientId: string,
  payload:  TCreateReviewPayload,
) => {
  const { appointmentId, rating, comment } = payload;

  // ── Guard 1: appointment must exist
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
  }

  // ── Guard 2: appointment must belong to this client
  if (appointment.client.toString() !== clientId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only review your own appointments',
    );
  }

  // ── Guard 3: session must be COMPLETED
  if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Only completed sessions can be reviewed. Current status: ${appointment.status}`,
    );
  }

  // ── Guard 4: one review per appointment (DB unique index is the
  //    hard stop, this gives a friendlier error message)
  const existing = await Review.findOne({ appointment: appointmentId });
  if (existing) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'You have already reviewed this appointment',
    );
  }

  // ── Create (post-save hook auto-updates ProviderProfile)
  const review = await Review.create({
    client:      clientId,
    provider:    appointment.provider,
    appointment: appointmentId,
    rating,
    comment:     comment ?? '',
  });

  // ── Return populated document
  const populated = await Review.findById(review._id)
    .populate('client',      'name profileImage')
    .populate('provider',    'name')
    .populate('appointment', 'scheduledAt sessionName');

  return populated;
};

// ── 2. Get Provider Reviews (Public, paginated)
// Returns only isPublished: true reviews for a specific provider
// Supports: ?page=1&limit=10&sortBy=createdAt&sortOrder=desc
const getProviderReviews = async (
  providerId: string,
  query:      Record<string, unknown>,
) => {
  const reviewQuery = new QueryBuilder(
    Review.find({ provider: new Types.ObjectId(providerId), isPublished: true })
      .populate('client',      'name profileImage')
      .populate('appointment', 'scheduledAt sessionName'),
    query as Record<string, string>,
  )
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    reviewQuery.modelQuery,
    reviewQuery.countTotal(),
  ]);

  // ── Also return aggregate stats for the provider
  const stats = await Review.aggregate([
    {
      $match: {
        provider:    new Types.ObjectId(providerId),
        isPublished: true,
      },
    },
    {
      $group: {
        _id:              '$provider',
        averageRating:    { $avg: '$rating' },
        totalReviews:     { $sum: 1 },
        ratingBreakdown:  {
          $push: '$rating',
        },
      },
    },
  ]);

  // Build star-breakdown { "1": 0, "2": 1, "3": 5, "4": 12, "5": 20 }
  const breakdown: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  if (stats.length > 0) {
    for (const r of stats[0].ratingBreakdown) {
      breakdown[String(r)] = (breakdown[String(r)] ?? 0) + 1;
    }
  }

  return {
    data,
    meta,
    stats: {
      averageRating: stats.length > 0
        ? Math.round(stats[0].averageRating * 10) / 10
        : 0,
      totalReviews: stats.length > 0 ? stats[0].totalReviews : 0,
      breakdown,
    },
  };
};

// ── 3. Get My Reviews (Client) 
const getMyReviews = async (
  clientId: string,
  query:    Record<string, unknown>,
) => {
  const reviewQuery = new QueryBuilder(
    Review.find({ client: new Types.ObjectId(clientId) })
      .populate('provider',    'name profileImage')
      .populate('appointment', 'scheduledAt sessionName'),
    query as Record<string, string>,
  )
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    reviewQuery.modelQuery,
    reviewQuery.countTotal(),
  ]);

  return { data, meta };
};

// ── 4. Toggle Publish (Admin)
// Flips isPublished, then manually re-runs the rating calculation
// because findByIdAndUpdate bypasses the post-save hook
const togglePublish = async (reviewId: string) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  const updated = await Review.findByIdAndUpdate(
    reviewId,
    { $set: { isPublished: !review.isPublished } },
    { new: true },
  );

  // Re-calculate because hook does not fire on findByIdAndUpdate
  await recalculateProviderRating(review.provider);

  return updated;
};

// ── 5. Get All Reviews (Admin panel) ─────────────────────────────
const getAllReviews = async (query: Record<string, unknown>) => {
  const reviewQuery = new QueryBuilder(
    Review.find()
      .populate('client',      'name profileImage')
      .populate('provider',    'name')
      .populate('appointment', 'scheduledAt sessionName'),
    query as Record<string, string>,
  )
    .filter()
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    reviewQuery.modelQuery,
    reviewQuery.countTotal(),
  ]);

  return { data, meta };
};

export const ReviewService = {
  createReview,
  getProviderReviews,
  getMyReviews,
  togglePublish,
  getAllReviews,
};
