import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { Slot } from './slot.model';
import { SessionType } from '../session-type/sessionType.model';
import { TCreateSlotPayload, TUpdateSlotPayload, TBulkDeletePayload } from './slot.validation';

// ─── Helper: "07:00" → total minutes since midnight ──────────────────────────
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// ─── Helper: minutes → "HH:mm" ───────────────────────────────────────────────
const minutesToTime = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// ─── Helper: Conflict check ───────────────────────────────────────────────────
// New slot overlaps if:
//   newStart < existingEnd  AND  newEnd > existingStart
const checkSlotConflict = async (
  providerId:    Types.ObjectId,
  date:          Date,
  newStartMins:  number,
  newEndMins:    number,
  excludeSlotId?: string,  // for update: exclude current slot itself
): Promise<void> => {
  const existingSlots = await Slot.find({
    provider: providerId,
    date:     {
      $gte: new Date(date.setUTCHours(0, 0, 0, 0)),
      $lte: new Date(date.setUTCHours(23, 59, 59, 999)),
    },
    ...(excludeSlotId && { _id: { $ne: new Types.ObjectId(excludeSlotId) } }),
  }).select('startTime endTime');

  for (const slot of existingSlots) {
    const existingStart = timeToMinutes(slot.startTime);
    const existingEnd   = timeToMinutes(slot.endTime);

    const hasOverlap =
      newStartMins < existingEnd && newEndMins > existingStart;

    if (hasOverlap) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `You already have a slot during this time (${slot.startTime} – ${slot.endTime}). Please choose a different time.`,
      );
    }
  }
};

// ─── Service Functions ────────────────────────────────────────────────────────

const createSlot = async (providerId: string, payload: TCreateSlotPayload) => {
  const providerObjectId = new Types.ObjectId(providerId);

  //  Validate date is not in the past
  const slotDate = new Date(payload.date);
  const today    = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (slotDate < today) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Slot date cannot be in the past');
  }

  //  Fetch SessionType to denormalize
  const sessionTypeDoc = await SessionType.findById(
    new Types.ObjectId(payload.sessionType),
  );
  if (!sessionTypeDoc) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session type not found');
  }

  //  Ownership check — provider can only use their own session types
  if (sessionTypeDoc.provider.toString() !== providerId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only create slots with your own session types',
    );
  }

  //  isActive check
  if (!sessionTypeDoc.isActive) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot create slot with an inactive session type',
    );
  }

  //  Calculate endTime
  const startMins = timeToMinutes(payload.startTime);
  const endMins   = startMins + sessionTypeDoc.duration;
  if (endMins >= 24 * 60) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Slot end time exceeds midnight. Please choose an earlier start time.',
    );
  }
  const endTime = minutesToTime(endMins);

  //  Conflict check
  await checkSlotConflict(providerObjectId, slotDate, startMins, endMins);

  //  Create slot with denormalized session data
  const slot = await Slot.create({
    provider:        providerObjectId,
    date:            slotDate,
    startTime:       payload.startTime,
    endTime,                                   // auto-calculated
    sessionType:     new Types.ObjectId(payload.sessionType),
    sessionName:     sessionTypeDoc.name,      // denormalized
    duration:        sessionTypeDoc.duration,  // denormalized
    price:           sessionTypeDoc.price,     // denormalized (read-only)
    meetingLink:     payload.meetingLink ?? '',
    meetingId:       payload.meetingId   ?? '',
    meetingPassword: payload.meetingPassword ?? '',
    isBooked:        false,
  });

  return slot;
};

// Provider: GET /slot/my?date=2026-03-07
const getMySlots = async (providerId: string, query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = {
    provider: new Types.ObjectId(providerId),
  };

  // Optional date filter
  if (query.date) {
    const d = new Date(query.date as string);
    filter.date = {
      $gte: new Date(d.setUTCHours(0, 0, 0, 0)),
      $lte: new Date(d.setUTCHours(23, 59, 59, 999)),
    };
  }

  // Optional isBooked filter
  if (query.isBooked !== undefined) {
    filter.isBooked = query.isBooked === 'true';
  }

  return await Slot.find(filter)
    .sort({ date: 1, startTime: 1 })
    .populate('sessionType', 'name duration price')
    .populate('bookedBy', 'email');
};

// Client: GET /slot/provider/:providerId?date=2026-03-07
// Returns only available (not booked, not expired) slots
const getProviderSlots = async (
  providerId: string,
  query:      Record<string, unknown>,
) => {
  const filter: Record<string, unknown> = {
    provider: new Types.ObjectId(providerId),
    isBooked:  false,
    //  Only show future slots
    date:      { $gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) },
  };

  if (query.date) {
    const d = new Date(query.date as string);
    filter.date = {
      $gte: new Date(d.setUTCHours(0, 0, 0, 0)),
      $lte: new Date(d.setUTCHours(23, 59, 59, 999)),
    };
  }

  return await Slot.find(filter)
    .sort({ date: 1, startTime: 1 })
    .select('-meetingLink -meetingId -meetingPassword') //  hide meeting info until booked
    .populate('sessionType', 'name duration price');
};

// Client: GET /slot/provider/:providerId/upcoming
// Groups upcoming slots by date
const getProviderUpcomingSlots = async (providerId: string) => {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  const slots = await Slot.find({
    provider: new Types.ObjectId(providerId),
    isBooked: false,
    date:     { $gte: now },
  })
    .sort({ date: 1, startTime: 1 })
    .select('-meetingLink -meetingId -meetingPassword')
    .populate('sessionType', 'name duration price');

  //  Group by date for frontend calendar view
  const grouped: Record<string, typeof slots> = {};
  for (const slot of slots) {
    const dateKey = slot.date.toISOString().split('T')[0]; // "2026-03-10"
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(slot);
  }

  return grouped;
};

const updateSlot = async (
  slotId:     string,
  providerId: string,
  payload:    TUpdateSlotPayload,
) => {
  const slot = await Slot.findById(slotId);
  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Slot not found');
  }

  //  Ownership check
  if (slot.provider.toString() !== providerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to update this slot');
  }

  //  Cannot update a booked slot's time
  if (slot.isBooked && payload.startTime) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot change time of an already booked slot',
    );
  }

  const updateData: Record<string, unknown> = {};

  //  Recalculate endTime if startTime changes
  if (payload.startTime) {
    const startMins = timeToMinutes(payload.startTime);
    const endMins   = startMins + slot.duration;

    if (endMins >= 24 * 60) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Slot end time exceeds midnight');
    }

    const newEndTime = minutesToTime(endMins);

    //  Conflict check excluding current slot
    await checkSlotConflict(
      slot.provider as Types.ObjectId,
      slot.date,
      startMins,
      endMins,
      slotId,
    );

    updateData.startTime = payload.startTime;
    updateData.endTime   = newEndTime;
  }

  if (payload.meetingLink     !== undefined) updateData.meetingLink     = payload.meetingLink;
  if (payload.meetingId       !== undefined) updateData.meetingId       = payload.meetingId;
  if (payload.meetingPassword !== undefined) updateData.meetingPassword = payload.meetingPassword;

  return await Slot.findByIdAndUpdate(
    slotId,
    { $set: updateData },
    { returnDocument: 'after' },
  );
};

const deleteSlot = async (slotId: string, providerId: string) => {
  const slot = await Slot.findById(slotId);
  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Slot not found');
  }

  //  Ownership check
  if (slot.provider.toString() !== providerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to delete this slot');
  }

  //  Cannot delete a booked slot
  if (slot.isBooked) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot delete a booked slot. Cancel the appointment first.',
    );
  }

  return await Slot.findByIdAndDelete(slotId);
};

const bulkDeleteSlots = async (providerId: string, payload: TBulkDeletePayload) => {
  const objectIds = payload.ids.map(id => new Types.ObjectId(id));

  //  Only delete slots owned by this provider AND not booked
  const result = await Slot.deleteMany({
    _id:      { $in: objectIds },
    provider: new Types.ObjectId(providerId),
    isBooked: false,  //  never delete booked slots
  });

  return {
    deletedCount: result.deletedCount,
    requestedCount: payload.ids.length,
    skipped: payload.ids.length - result.deletedCount, // booked or not owned
  };
};

// ─── Cron Job Function — called from cron scheduler ──────────────────────────
// Marks slots as expired if their date+endTime is 48hrs in the past
const markExpiredSlots = async (): Promise<void> => {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 48); // 48 hours ago

  await Slot.updateMany(
    {
      date:     { $lte: cutoff },
      isBooked: false,   //  never expire booked slots
    },
    { $set: { isExpired: true } },
  );
};

export const SlotService = {
  createSlot,
  getMySlots,
  getProviderSlots,
  getProviderUpcomingSlots,
  updateSlot,
  deleteSlot,
  bulkDeleteSlots,
  markExpiredSlots,
};
