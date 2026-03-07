import { z } from 'zod';
import { GENDER_IDENTITY } from '../../../enums/user';
import { SESSION_FORMAT } from '../../../enums/appointment';

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const educationSchema = z.object({
  degreeName:     z.string().min(1, 'Degree name is required'),
  university:     z.string().min(1, 'University is required'),
  graduationYear: z.coerce.number()
    .int()
    .min(1950)
    .max(new Date().getFullYear()),
});

const employmentSchema = z.object({
  employerName:     z.string().min(1),
  jobTitle:         z.string().min(1),
  startDate:        z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Invalid startDate' }),
  endDate:          z.string().nullable().optional(),
  responsibilities: z.string().optional(),
  isCurrent:        z.coerce.boolean().optional().default(false),
});

const PROVIDER_TYPES = [
  'clinical_psychologist',
  'licensed_counselor',
  'social_worker',
  'psychiatrist',
  'other',
] as const;

// ─── Step Schemas ─────────────────────────────────────────────────────────────

export const step1Schema = z.object({
  fullName:      z.string().min(2, 'Full name must be at least 2 characters'),
  phone:         z.string().min(7, 'Enter a valid phone number'),
  dateOfBirth:   z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Invalid date format' }),
  genderIdentity: z.enum(Object.values(GENDER_IDENTITY) as [string, ...string[]]),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseState:  z.string().min(1, 'License state is required'),
  providerType:  z.enum(PROVIDER_TYPES),
  officeAddress: z.string().optional(),
  city:          z.string().optional(),
});

// Step 2 arrays come as JSON strings in multipart form-data
// z.preprocess handles JSON.parse before validation
const jsonArrayPreprocess = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(val => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }, schema);

export const step2Schema = z.object({
  education: jsonArrayPreprocess(
    z.array(educationSchema).optional().default([]),
  ),
  affiliations:             z.string().optional(),
  additionalCertifications: z.string().optional(),
  employment: jsonArrayPreprocess(
    z.array(employmentSchema).optional().default([]),
  ),
});

export const step3Schema = z.object({
  therapeuticApproaches: jsonArrayPreprocess(
    z.array(z.string()).min(1, 'Select at least one therapeutic approach'),
  ),
  clientPopulations: jsonArrayPreprocess(
    z.array(z.string()).min(1, 'Select at least one client population'),
  ),
  sessionFormats: jsonArrayPreprocess(
    z.array(
      z.enum(Object.values(SESSION_FORMAT) as [string, ...string[]])
    ).min(1, 'Select at least one session format'),
  ),
  sessionLengths: jsonArrayPreprocess(
    z.array(z.coerce.number()).optional().default([]),
  ),
});

export const profileUpdateSchema = z.object({
  fullName:                 z.string().optional(),
  phone:                    z.string().optional(),
  officeAddress:            z.string().optional(),
  city:                     z.string().optional(),
  affiliations:             z.string().optional(),
  additionalCertifications: z.string().optional(),
  education: jsonArrayPreprocess(
    z.array(educationSchema).optional(),
  ),
  employment: jsonArrayPreprocess(
    z.array(employmentSchema).optional(),
  ),
  therapeuticApproaches: jsonArrayPreprocess(
    z.array(z.string()).optional(),
  ),
  clientPopulations: jsonArrayPreprocess(
    z.array(z.string()).optional(),
  ),
  sessionFormats: jsonArrayPreprocess(
    z.array(
      z.enum(Object.values(SESSION_FORMAT) as [string, ...string[]])
    ).optional(),
  ),
  sessionLengths: jsonArrayPreprocess(
    z.array(z.coerce.number()).optional(),
  ),
});

export const adminReviewSchema = z.object({
  action:          z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
}).refine(
  data => data.action !== 'reject' || (data.rejectionReason && data.rejectionReason.trim().length > 0),
  { message: 'Rejection reason is required when rejecting', path: ['rejectionReason'] },
);

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type TStep1Input        = z.infer<typeof step1Schema>;
export type TStep2Input        = z.infer<typeof step2Schema>;
export type TStep3Input        = z.infer<typeof step3Schema>;
export type TProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type TAdminReviewInput  = z.infer<typeof adminReviewSchema>;
export type TIntakeStepInput   = TStep1Input | TStep2Input | TStep3Input;

// ─── Wrapped schemas for validateRequest middleware ───────────────────────────

export const providerProfileValidation = {
  step1:         z.object({ body: step1Schema }),
  step2:         z.object({ body: step2Schema }),
  step3:         z.object({ body: step3Schema }),
  profileUpdate: z.object({ body: profileUpdateSchema }),
  adminReview:   z.object({ body: adminReviewSchema }),

  stepMap: {
    1: z.object({ body: step1Schema }),
    2: z.object({ body: step2Schema }),
    3: z.object({ body: step3Schema }),
  } as Record<number, z.ZodTypeAny>,
};
