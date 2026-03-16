import { z } from 'zod';
import { checkValidID } from '../../../shared/chackValid';

//  Time format: "07:00" or "07:30" — HH:mm 24hr
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createSlotSchema = z.object({
  body: z.object({
    date:            z.string().refine(v => !isNaN(Date.parse(v)), {
                       message: 'Invalid date format. Use YYYY-MM-DD',
                     }),
    startTime:       z.string().regex(timeRegex, 'startTime must be HH:mm format e.g. 07:00'),
    sessionType:     z.string().refine(v => /^[a-f\d]{24}$/i.test(v), {
                       message: 'Invalid sessionType ID',
                     }),
    meetingLink:     z.string().url('meetingLink must be a valid URL').optional().or(z.literal('')),
    timezone: z.string(),
    meetingId:       z.string().optional().default(''),
    meetingPassword: z.string().optional().default(''),
  }),
});

const updateSlotSchema = z.object({
  params: z.object({
    id: checkValidID('Invalid Slot ID'),
  }),
  body: z.object({
    startTime:       z.string().regex(timeRegex, 'startTime must be HH:mm').optional(),
    meetingLink:     z.string().url('meetingLink must be a valid URL').optional().or(z.literal('')),
    meetingId:       z.string().optional(),
    meetingPassword: z.string().optional(),
  }).refine(
    data => Object.values(data).some(v => v !== undefined),
    { message: 'At least one field must be provided to update' },
  ),
});

const deleteSlotSchema = z.object({
  params: z.object({
    id: checkValidID('Invalid Slot ID'),
  }),
});

// Bulk delete: { ids: ["id1", "id2", ...] }
const bulkDeleteSlotSchema = z.object({
  body: z.object({
    ids: z.array(
      z.string().refine(v => /^[a-f\d]{24}$/i.test(v), { message: 'Invalid Slot ID in list' }),
    ).min(1, 'At least one slot ID is required'),
  }),
});

export const SlotValidation = {
  createSlotSchema,
  updateSlotSchema,
  deleteSlotSchema,
  bulkDeleteSlotSchema,
};

export type TCreateSlotPayload = z.infer<typeof createSlotSchema>['body'];
export type TUpdateSlotPayload = z.infer<typeof updateSlotSchema>['body'];
export type TBulkDeletePayload = z.infer<typeof bulkDeleteSlotSchema>['body'];
