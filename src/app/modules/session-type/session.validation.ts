import { z } from 'zod'; 
import { checkValidID } from '../../../shared/chackValid';

const createSessionTypeSchema = z.object({
  body: z.object({
    name:     z.string().min(3, 'Name must be at least 3 characters'),
    duration: z.coerce.number().positive('Duration must be a positive number'),  
    price:    z.coerce.number().nonnegative('Price must be a non-negative number'),
  }),
});

const updateSessionTypeSchema = z.object({
  params: z.object({
    id: checkValidID('Invalid Session Type ID'),
  }),
  body: z.object({
    name:     z.string().min(3, 'Name must be at least 3 characters').optional(),
    duration: z.coerce.number().positive().optional(), 
    price:    z.coerce.number().nonnegative().optional(), 
  }),
});

const deleteSessionTypeSchema = z.object({
  params: z.object({
    id: checkValidID('Invalid Session Type ID'),
  }),
});

const toggleSessionTypeSchema = z.object({
  params: z.object({
    id: checkValidID('Invalid Session Type ID'),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const SessionTypeValidation = {
  createSessionTypeSchema,
  updateSessionTypeSchema,
  deleteSessionTypeSchema,
  toggleSessionTypeSchema, 
};

export type CreateSessionTypePayload = z.infer<typeof createSessionTypeSchema>['body'];
export type UpdateSessionTypePayload = z.infer<typeof updateSessionTypeSchema>['body'];
export type ToggleSessionTypePayload = z.infer<typeof toggleSessionTypeSchema>['body'];
