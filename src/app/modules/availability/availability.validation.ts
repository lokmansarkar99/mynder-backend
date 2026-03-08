import { z } from 'zod';
import { DAY_OF_WEEK } from '../../../enums/appointment';
import { checkValidID } from '../../../shared/chackValid';

const scheduleDaySchema = z.object({
  day:         z.enum(Object.values(DAY_OF_WEEK) as [string, ...string[]]),
  isAvailable: z.boolean(),
});

const updateWeeklyAvailabilitySchema = z.object({
  body: z.object({
    timezone: z.string().optional(),
    //  Full 7-day array OR partial update both supported
    schedule: z.array(scheduleDaySchema)
      .min(1, 'At least one day must be provided')
      .max(7, 'Schedule cannot exceed 7 days')
      .refine(
        days => {
          const dayValues = days.map(d => d.day);
          return new Set(dayValues).size === dayValues.length;
        },
        { message: 'Duplicate days are not allowed in schedule' },
      ),
  }),
});

const getProviderAvailabilitySchema = z.object({
  params: z.object({
    providerId: checkValidID('Invalid Provider ID'),
  }),
});

export const AvailabilityValidation = {
  updateWeeklyAvailabilitySchema,
  getProviderAvailabilitySchema,
};

export type TUpdateWeeklyAvailabilityPayload =
  z.infer<typeof updateWeeklyAvailabilitySchema>['body'];
