import { z } from 'zod';

const CATEGORIES = ['consent', 'policy', 'privacy', 'telehealth', 'payment', 'other'] as const;

// ── Create ────────────────────────────────────────────────────────
export const createFormSchema = z.object({
  body: z.object({
    title:    z.string().min(1, 'Title is required').max(200),
    content:  z.string().default(''),
    category: z.enum(CATEGORIES).default('other'),
    order:    z.number().optional(),
  }),
});

// ── Update ────────────────────────────────────────────────────────
export const updateFormSchema = z.object({
  body: z.object({
    title:    z.string().min(1).max(200).optional(),
    content:  z.string().optional(),
    category: z.enum(CATEGORIES).optional(),
    isActive: z.boolean().optional(),
    order:    z.number().optional(),
  }),
});

export type TCreateFormPayload = z.infer<typeof createFormSchema>['body'];
export type TUpdateFormPayload = z.infer<typeof updateFormSchema>['body'];
