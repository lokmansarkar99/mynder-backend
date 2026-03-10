// ─────────────────────────────────────────────────────────────────────────────
// sendNotification.ts
//
// Shared utility used by ANY service to trigger a notification:
//   appointment.service  → BOOKING_CONFIRMED, BOOKING_CANCELLED
//   providerPayout.service → PAYOUT_PROCESSED, PAYOUT_FAILED
//   providerProfile.service → PROVIDER_APPROVED, PROVIDER_REJECTED
//   socketHandlers       → NEW_MESSAGE
//
// Flow:
//   STEP 1 → Notification.create() — ALWAYS save to DB
//            (offline users will receive it on next GET /notification/my)
//   STEP 2 → getSocketId(recipientId) — check if user is online right now
//   STEP 3 → if online → io.to(socketId).emit('notification:new', data)
//            (real-time bell badge update)
//
// IMPORTANT: wrapped in try/catch — a notification failure must NEVER
//            crash the parent service (booking, payout, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import { Types }  from 'mongoose';
import { Notification } from '../app/modules/notification/notification.model';
import { NOTIFICATION_TYPE, REFERENCE_MODEL } from '../enums/notification';
import { getSocketId } from '../socket/onlineUsers';
import { getIO }       from '../socket/socket';

// ─── Payload type ─────────────────────────────────────────────────────────────
interface ISendNotificationPayload {
  recipientId:     string | Types.ObjectId;
  type:            NOTIFICATION_TYPE;
  title:           string;
  body?:           string;
  referenceId?:    string | Types.ObjectId | null;
  referenceModel?: REFERENCE_MODEL | null;
}

// ─── Main Function ────────────────────────────────────────────────────────────
const sendNotification = async (
  payload: ISendNotificationPayload,
): Promise<void> => {
  try {
    const {
      recipientId,
      type,
      title,
      body           = '',
      referenceId    = null,
      referenceModel = null,
    } = payload;

    // ── STEP 1: Always save to DB ────────────────────────────────────────────
    // Offline users get this when they call GET /notification/my after login
    const notification = await Notification.create({
      recipient: new Types.ObjectId(String(recipientId)),
      type,
      title,
      body,
      ...(referenceId    ? { referenceId:    new Types.ObjectId(String(referenceId)) } : {}),
      ...(referenceModel ? { referenceModel }                                          : {}),
    });

    // ── STEP 2: Check if recipient is currently online ───────────────────────
    const socketId = getSocketId(String(recipientId));

    // ── STEP 3: If online → push real-time notification to their socket ──────
    if (socketId) {
      const io = getIO();
      
    

      io.to(socketId).emit('notification:new', {
        _id:            notification._id,
        type:           notification.type,
        title:          notification.title,
        body:           notification.body,
        referenceId:    notification.referenceId,
        referenceModel: notification.referenceModel,
        isRead:         false,
        createdAt:      notification.createdAt ?? new Date(),
      });
    }

  } catch (err) {
    // ── NEVER re-throw — notification failure must not break the caller ──────
    console.error('[sendNotification] Non-critical error:', err);
  }
};

export default sendNotification;
