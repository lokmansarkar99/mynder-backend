import { z } from 'zod';
import { checkValidID }     from '../../../shared/chackValid';
import { BLOG_CATEGORIES, BLOG_STATUSES } from './blog.interface';


const categoryEnum  = z.enum(BLOG_CATEGORIES);
const statusEnum    = z.enum(BLOG_STATUSES);
const blogIdParam   = z.object({ id: checkValidID('Invalid blog ID') });


const createBlogSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title cannot exceed 200 characters'),

    // Slug is optional — auto-generated from title if omitted
    slug: z
      .string()
      .min(3)
      .max(220)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens only')
      .optional(),

    authorName:  z.string().max(100).optional(),
    authorTitle: z.string().max(100).optional(),

    category: categoryEnum,

    excerpt: z
      .string()
      .max(500, 'Excerpt cannot exceed 500 characters')
      .optional()
      .default(''),

    content: z
      .string()
      .min(10, 'Content must be at least 10 characters'),

    tags: z
      .array(z.string().max(50))
      .max(10, 'Maximum 10 tags allowed')
      .optional()
      .default([]),

    status: statusEnum.optional().default('published'),

   
    scheduledAt: z.coerce.date().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.status === 'scheduled' && !data.scheduledAt) return false;
      return true;
    },
    { message: 'scheduledAt is required when status is "scheduled"', path: ['scheduledAt'] },
  ),
});

// ── 2. Update Blog ────────────────────────────────────────────────
const updateBlogSchema = z.object({
  params: blogIdParam,
  body: z.object({
    title:       z.string().min(3).max(200).optional(),
    authorName:  z.string().max(100).optional(),
    authorTitle: z.string().max(100).optional(),
    category:    categoryEnum.optional(),
    excerpt:     z.string().max(500).optional(),
    content:     z.string().min(10).optional(),
    tags:        z.array(z.string().max(50)).max(10).optional(),
  }),
});

// ── 3. Change Status ──────────────────────────────────────────────
const changeStatusSchema = z.object({
  params: blogIdParam,
  body: z.object({
    status:      statusEnum,
    scheduledAt: z.coerce.date().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.status === 'scheduled' && !data.scheduledAt) return false;
      return true;
    },
    { message: 'scheduledAt is required when status is "scheduled"', path: ['scheduledAt'] },
  ),
});

// ── 4. Delete / Single param ──────────────────────────────────────
const blogParamSchema = z.object({ params: blogIdParam });

// ── 5. Slug param (public GET by slug) ───────────────────────────
const slugParamSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Slug is required'),
  }),
});

// ── Exports ───────────────────────────────────────────────────────
export const BlogValidation = {
  createBlogSchema,
  updateBlogSchema,
  changeStatusSchema,
  blogParamSchema,
  slugParamSchema,
};

export type TCreateBlogPayload    = z.infer<typeof createBlogSchema>['body'];
export type TUpdateBlogPayload    = z.infer<typeof updateBlogSchema>['body'];
export type TChangeStatusPayload  = z.infer<typeof changeStatusSchema>['body'];
export type TDeleteBlogPayload    = z.infer<typeof blogParamSchema>;