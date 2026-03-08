import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { Availability } from './availability.model';
import { DAY_OF_WEEK } from '../../../enums/appointment';
import { TUpdateWeeklyAvailabilityPayload } from './availability.validation';



// ─── Default 7-day schedule ───────────────────────────────────────────────────
const buildDefaultSchedule = () => [
  { day: DAY_OF_WEEK.MON, isAvailable: true  },
  { day: DAY_OF_WEEK.TUE, isAvailable: true  },
  { day: DAY_OF_WEEK.WED, isAvailable: true  },
  { day: DAY_OF_WEEK.THU, isAvailable: true  },
  { day: DAY_OF_WEEK.FRI, isAvailable: true  },
  { day: DAY_OF_WEEK.SAT, isAvailable: false },
  { day: DAY_OF_WEEK.SUN, isAvailable: false },
];

// ─── Service Functions ────────────────────────────────────────────────────────

// PUT /availability/weekly — upsert
// Provider sends full or partial schedule
// Partial update: only sent days are updated, rest remain unchanged
const updateWeeklyAvailability = async (
  providerId: string,
  payload:    TUpdateWeeklyAvailabilityPayload,
) => {
  const userObjectId = new Types.ObjectId(providerId);

  // Get existing doc to merge schedule
  const existing = await Availability.findOne({ provider: userObjectId });

  let mergedSchedule;

  if (existing) {
    // Merge — only update days that are sent, keep others unchanged
    const scheduleMap = new Map(
      existing.schedule.map(s => [s.day, s.isAvailable]),
    );
    payload.schedule.forEach(s => scheduleMap.set(s.day as DAY_OF_WEEK, s.isAvailable));

    // Maintain fixed day order (MON → SUN)
    const dayOrder = Object.values(DAY_OF_WEEK);
    mergedSchedule = dayOrder
      .filter(day => scheduleMap.has(day))
      .map(day => ({ day, isAvailable: scheduleMap.get(day)! }));
  } else {
    // First time — start with default, then apply payload
    const defaultMap = new Map(
      buildDefaultSchedule().map(s => [s.day, s.isAvailable]),
    );
    payload.schedule.forEach(s => defaultMap.set(s.day as DAY_OF_WEEK, s.isAvailable));

    const dayOrder = Object.values(DAY_OF_WEEK);
    mergedSchedule = dayOrder.map(day => ({
      day,
      isAvailable: defaultMap.get(day) ?? false,
    }));
  }

  const updateData: Record<string, unknown> = {
    schedule: mergedSchedule,
  };
  if (payload.timezone) updateData.timezone = payload.timezone;

  return await Availability.findOneAndUpdate(
    { provider: userObjectId },
    {
      $set:         updateData,
      $setOnInsert: { provider: userObjectId }, // user field only on insert
    },
    {
      returnDocument:      'after',
      upsert:              true,
      setDefaultsOnInsert: true,
    },
  );
};

// GET /availability/weekly/my — provider sees own schedule
const getMyAvailability = async (providerId: string) => {
  const availability = await Availability.findOne({
    provider: new Types.ObjectId(providerId),
  });

  // If never set before → return default schedule (don't throw 404)
  if (!availability) {
    return {
      provider: providerId,
      timezone: 'America/New_York',
      schedule: buildDefaultSchedule(),
      isDefault: true,  // frontend can show "not configured yet"
    };
  }

  return availability;
};

// GET /availability/weekly/:providerId — client sees provider's available days
const getProviderAvailability = async (providerId: string) => {
  const availability = await Availability
    .findOne({ provider: new Types.ObjectId(providerId) })
    .select('schedule timezone provider'); // no updatedAt for public

  if (!availability) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Availability not set for this provider yet',
    );
  }

  // Client only needs available days list
  const availableDays = availability.schedule
    .filter(s => s.isAvailable)
    .map(s => s.day);

  return {
    provider:      availability.provider,
    timezone:      availability.timezone,
    schedule:      availability.schedule,      // full schedule with true/false
    availableDays,                             // convenience: just the active days
  };
};

export const AvailabilityService = {
  updateWeeklyAvailability,
  getMyAvailability,
  getProviderAvailability,
};
