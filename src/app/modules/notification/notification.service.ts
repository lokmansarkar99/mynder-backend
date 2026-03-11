import { Types }        from 'mongoose';
import { StatusCodes }  from 'http-status-codes';
import ApiError         from '../../../errors/ApiErrors';
import { Notification } from './notification.model';

type NotificationQuery = {
  page?:  number;
  limit?: number;
  type?:  string;
};

// ─── 1. Get My Notifications — Paginated + Type Filter ───────────────────────
const getMyNotifications = async (userId: string, query: NotificationQuery) => {
  const page  = query.page  || 1;
  const limit = query.limit || 20;
  const skip  = (page - 1) * limit;

  const filter: any = { recipient: new Types.ObjectId(userId) };

  // Optional type filter: ?type=BOOKING_CONFIRMED
  if (query.type?.trim()) {
    filter.type = query.type.trim();
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })   // newest first
      .skip(skip)
      .limit(limit)
      .lean(),

    Notification.countDocuments(filter),

    // Always include unreadCount in meta — used for bell badge
    Notification.countDocuments({
      recipient: new Types.ObjectId(userId),
      isRead:    false,
    }),
  ]);

  return {
    notifications,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore:    page * limit < total,
      unreadCount,   // ← bell badge number
    },
  };
};

// ─── 2. Get Unread Count Only — Bell Badge ────────────────────────────────────
const getUnreadCount = async (userId: string) => {
  const unreadCount = await Notification.countDocuments({
    recipient: new Types.ObjectId(userId),
    isRead:    false,
  });

  return { unreadCount };
};

// ─── 3. Mark One As Read ─────────────────────────────────────────────────────
const markOneAsRead = async (notificationId: string, userId: string) => {
  const notification = await Notification.findOne({
    _id:       new Types.ObjectId(notificationId),
    recipient: new Types.ObjectId(userId),   // ← ownership check
  });

  if (!notification) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Notification not found or does not belong to you',
    );
  }

  if (notification.isRead) return notification;  // already read — no-op

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

// ─── 4. Mark All As Read ─────────────────────────────────────────────────────
const markAllAsRead = async (userId: string) => {
  const result = await Notification.updateMany(
    {
      recipient: new Types.ObjectId(userId),
      isRead:    false,
    },
    {
      $set: { isRead: true, readAt: new Date() },
    },
  );

  return { updatedCount: result.modifiedCount };
};

// ─── 5. Delete One Notification ──────────────────────────────────────────────
const deleteOne = async (notificationId: string, userId: string) => {
  const notification = await Notification.findOneAndDelete({
    _id:       new Types.ObjectId(notificationId),
    recipient: new Types.ObjectId(userId),   // ← ownership check
  });

  if (!notification) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Notification not found or does not belong to you',
    );
  }

  return { deleted: true, notificationId };
};

export const NotificationService = {
  getMyNotifications,
  getUnreadCount,
  markOneAsRead,
  markAllAsRead,
  deleteOne,
};
