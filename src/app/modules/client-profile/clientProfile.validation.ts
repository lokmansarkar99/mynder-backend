import { z } from 'zod';
import { GENDER_IDENTITY } from '../../../enums/user';
import { SESSION_FORMAT }   from '../../../enums/appointment';
import { PAYMENT_METHOD }   from '../../../enums/payment';

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const emergencyContactSchema = z.object({
  fullName:     z.string().min(1).optional(),
  phone:        z.string().min(6).optional(),
  relationship: z.string().min(1).optional(),
}).optional();

const billingAddressSchema = z.object({
  street:  z.string().optional(),
  city:    z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
}).optional();

// ─── Step Schemas ─────────────────────────────────────────────────────────────

export const step1Schema = z.object({
  fullName:          z.string().min(2, 'Full name must be at least 2 characters'),
  phone:             z.string().min(7, 'Enter a valid phone number'),
  dateOfBirth:       z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Invalid date format' }),
  genderIdentity:    z.enum(Object.values(GENDER_IDENTITY) as [string, ...string[]]),
  preferredLanguage: z.string().optional(),
  emergencyContact:  emergencyContactSchema,
  billingAddress:    billingAddressSchema,
});

export const step2Schema = z.object({
  therapyPreference: z.object({
    therapistGender:   z.enum(['male', 'female', 'other', 'no_preference']),
    therapyType:       z.enum(['individual', 'couple', 'family', 'group']),
    sessionFormat:     z.enum(Object.values(SESSION_FORMAT) as [string, ...string[]]),
    sessionFrequency:  z.enum(['weekly', 'bi_weekly', 'monthly']),
    preferredApproach: z.string().optional(),
  }),
});

export const step3Schema = z.object({
  insurance: z.object({
    provider:    z.string().optional(),
    memberId:    z.string().optional(),
    groupNumber: z.string().optional(),
  }).optional(),
  paymentMethod: z.enum(Object.values(PAYMENT_METHOD) as [string, ...string[]]).optional(),
});

export const step4Schema = z.object({
  medicalHistory: z.object({
    primaryPhysicianName:  z.string().optional(),
    physicianPhone:        z.string().optional(),
    currentMedications:    z.string().optional(),
    previousDiagnoses:     z.string().optional(),
    pastTherapyExperience: z.string().optional(),
  }),
});

export const step5Schema = z.object({
  reasonForTherapy: z.string().min(10, 'Please provide at least 10 characters'),
  primaryGoal:      z.string().min(10, 'Please provide at least 10 characters'),
});

export const profileUpdateSchema = z.object({
  fullName:          z.string().optional(),
  phone:             z.string().optional(),
  preferredLanguage: z.string().optional(),
  emergencyContact:  emergencyContactSchema,
  billingAddress:    billingAddressSchema,
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type TStep1Input         = z.infer<typeof step1Schema>;
export type TStep2Input         = z.infer<typeof step2Schema>;
export type TStep3Input         = z.infer<typeof step3Schema>;
export type TStep4Input         = z.infer<typeof step4Schema>;
export type TStep5Input         = z.infer<typeof step5Schema>;
export type TProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export type TIntakeStepInput =
  | TStep1Input
  | TStep2Input
  | TStep3Input
  | TStep4Input
  | TStep5Input;

// ─── Wrapped schemas for validateRequest middleware ───────────────────────────

export const clientProfileValidation = {
  step1:         z.object({ body: step1Schema }),
  step2:         z.object({ body: step2Schema }),
  step3:         z.object({ body: step3Schema }),
  step4:         z.object({ body: step4Schema }),
  step5:         z.object({ body: step5Schema }),
  profileUpdate: z.object({ body: profileUpdateSchema }),

  stepMap: {
    1: z.object({ body: step1Schema }),
    2: z.object({ body: step2Schema }),
    3: z.object({ body: step3Schema }),
    4: z.object({ body: step4Schema }),
    5: z.object({ body: step5Schema }),
  } as Record<number, z.ZodTypeAny>,
};
