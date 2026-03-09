import { z } from 'zod';
import { SESSION_TYPE } from '../../../enums/appointment';
import { checkValidID } from '../../../shared/chackValid';

// ── Create Checkout Session ────────────────────────────────────────────────────
const createCheckoutSessionSchema = z.object({
  body: z.object({
    slotId: z.string().refine(v => /^[a-f\d]{24}$/i.test(v), {
      message: 'Invalid slot ID',
    }),
    sessionType: z.nativeEnum(SESSION_TYPE).default(SESSION_TYPE.INDIVIDUAL_THERAPY),
    timezone:    z.string().optional().default('America/New_York'),
  }),
});

// ── Cancel ────────────────────────────────────────────────────────────────────
const cancelAppointmentSchema = z.object({
  params: z.object({
    id: checkValidID('Invalid Appointment ID'),
  }),
  body: z.object({
    cancellationReason: z.string().min(5, 'Please provide a reason (min 5 chars)'),
  }),
});

// ── Session Summary ───────────────────────────────────────────────────────────
const sessionSummarySchema = z.object({
  params: z.object({
    id: checkValidID('Invalid Appointment ID'),
  }),
  body: z.object({
    sessionSummary: z.string().min(10, 'Summary must be at least 10 characters'),
  }),
});

// ── Param only ────────────────────────────────────────────────────────────────
const appointmentIdParamSchema = z.object({
  params: z.object({
    id: checkValidID('Invalid Appointment ID'),
  }),
});

export const AppointmentValidation = {
  createCheckoutSessionSchema,
  cancelAppointmentSchema,
  sessionSummarySchema,
  appointmentIdParamSchema,
};

export type TCreateCheckoutSessionPayload = z.infer<typeof createCheckoutSessionSchema>['body'];
export type TCancelAppointmentPayload      = z.infer<typeof cancelAppointmentSchema>['body'];
export type TSessionSummaryPayload         = z.infer<typeof sessionSummarySchema>['body'];
