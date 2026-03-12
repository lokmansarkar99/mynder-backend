import { z } from 'zod';
import { checkValidID } from '../../../shared/chackValid';

// ── 1. Create Review ──────────────────────────────────────────────
// Client submits after session.  appointmentId in body so we can
// verify ownership + COMPLETED status in the service.
const createReviewSchema = z.object({
  body: z.object({
    appointmentId: checkValidID('Invalid appointment ID'),
    rating: z
      .number()
      .int('Rating must be a whole number')
      .min(1, 'Minimum rating is 1')
      .max(5, 'Maximum rating is 5'),
    comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional().default(''),
  }),
});

// ── 2. Toggle Publish ─────────────────────────────────────────────
const reviewParamSchema = z.object({
  params: z.object({
    id: checkValidID('Invalid review ID'),
  }),
});

// ── 3. Get Provider Reviews (public) ─────────────────────────────
const providerIdParamSchema = z.object({
  params: z.object({
    providerId: checkValidID('Invalid provider ID'),
  }),
});

// ── Exports ───────────────────────────────────────────────────────
export const ReviewValidation = {
  createReviewSchema,
  reviewParamSchema,
  providerIdParamSchema,
};

export type TCreateReviewPayload = z.infer<typeof createReviewSchema>['body'];
