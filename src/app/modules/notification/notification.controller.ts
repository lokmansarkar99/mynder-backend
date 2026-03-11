import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';
import { NotificationService } from './notification.service';
import ApiError                from '../../../errors/ApiErrors';

const getUserId = (req: Request): string => {
  const id = (req.user!.id || (req.user as any)._id)?.toString();
  if (!id) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid session. Please login again.');
  return id;
};

// ─── GET /api/v1/notification/my?page=&limit=&type= ──────────────────────────
const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = getUserId(req);

  const result = await NotificationService.getMyNotifications(userId, {
    page:  Number(req.query.page)  || 1,
    limit: Number(req.query.limit) || 20,
    type:  req.query.type as string | undefined,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Notifications fetched successfully',
    data:       result,
  });
});

// ─── GET /api/v1/notification/unread-count ───────────────────────────────────
const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const result = await NotificationService.getUnreadCount(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Unread count fetched',
    data:       result,
  });
});

// ─── PATCH /api/v1/notification/read-all ─────────────────────────────────────
const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const result = await NotificationService.markAllAsRead(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    `${result.updatedCount} notifications marked as read`,
    data:       result,
  });
});

// ─── PATCH /api/v1/notification/:id/read ─────────────────────────────────────
const markOneAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const result = await NotificationService.markOneAsRead(req.params.id as string, userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Notification marked as read',
    data:       result,
  });
});

// ─── DELETE /api/v1/notification/:id ─────────────────────────────────────────
const deleteOne = catchAsync(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const result = await NotificationService.deleteOne(req.params.id as string, userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Notification deleted',
    data:       result,
  });
});

export const NotificationController = {
  getMyNotifications,
  getUnreadCount,
  markAllAsRead,
  markOneAsRead,
  deleteOne,
};
