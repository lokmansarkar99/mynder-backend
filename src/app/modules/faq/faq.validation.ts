import { z } from 'zod';
import { checkValidID } from '../../../shared/chackValid';

// ── Reusable param schema ─────────────────────────────────────────
const faqIdParam = z.object({
  id: checkValidID('Invalid FAQ ID'),
});

// ── 1. Create FAQ ─────────────────────────────────────────────────
const createFAQSchema = z.object({
  body: z.object({
    question: z
      .string()
      .min(5, 'Question must be at least 5 characters'),
    answer: z
      .string()
      .min(10, 'Answer must be at least 10 characters'),
    order:       z.number().int().min(0).optional().default(0),
    isPublished: z.boolean().optional().default(true),
  }),
});

// ── 2. Update FAQ ─────────────────────────────────────────────────
const updateFAQSchema = z.object({
  params: faqIdParam,
  body: z.object({
    question: z
      .string()
      .min(5, 'Question must be at least 5 characters')
      .optional(),
    answer: z
      .string()
      .min(10, 'Answer must be at least 10 characters')
      .optional(),
    order:       z.number().int().min(0).optional(),
    isPublished: z.boolean().optional(),
  }),
});

// ── 3. Param-only schemas ─────────────────────────────────────────
const faqParamSchema        = z.object({ params: faqIdParam });
const togglePublishSchema   = z.object({ params: faqIdParam });

// ── Exports ───────────────────────────────────────────────────────
export const FAQValidation = {
  createFAQSchema,
  updateFAQSchema,
  faqParamSchema,
  togglePublishSchema,
};

// ── Payload Types ─────────────────────────────────────────────────
export type TCreateFAQPayload = z.infer<typeof createFAQSchema>['body'];
export type TUpdateFAQPayload = z.infer<typeof updateFAQSchema>['body'];
