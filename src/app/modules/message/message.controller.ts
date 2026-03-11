import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';
import { MessageService }    from './message.service';
import { getIO }             from '../../../socket/socket';
import { getSocketId }       from '../../../socket/onlineUsers';
import { Conversation }      from '../conversation/conversation.model';
import ApiError              from '../../../errors/ApiErrors';

// ─── POST /api/v1/message ─────────────────────────────────────────────────────
const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const senderId                                       = req.user!.id;
  const { conversationId, content, messageType = 'text', tempId } = req.body;

  if (!content?.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Message content cannot be empty');
  }

  // ── 1. Save to DB 
  const message = await MessageService.sendMessage(
    conversationId,
    senderId,
    content,
    messageType,
  );

  const msgPayload = { ...message.toObject(), tempId: tempId || null };

  // ── 2. Socket: emit message:new to everyone in room ──────────────────────
  const io = getIO();
  io.to(conversationId).emit('message:new', msgPayload);

  // ── 3. Delivery tick ─────────────────────────────────────────────────────
  if (tempId) {
    const conv = await Conversation.findById(conversationId).lean();
    const receiverId = conv?.participants
      .find(p => p.toString() !== senderId)
      ?.toString();

    const senderSocketId   = getSocketId(senderId);
    const receiverSocketId = receiverId ? getSocketId(receiverId) : null;

    if (senderSocketId) {
      io.to(senderSocketId).emit(
        receiverSocketId ? 'message:delivered' : 'message:saved',
        { tempId, messageId: message._id, conversationId },
      );
    }
  }

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'Message sent successfully',
    data:       msgPayload,
  });
});

// ─── GET /api/v1/message/:conversationId ─────────────────────────────────────
const getMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await MessageService.getMessages(
    req.params.conversationId as string,
    req.user!.id,                             
    Number(req.query.page)  || 1,
    Number(req.query.limit) || 30,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Messages fetched successfully',
    data:       result,
  });
});

// ─── PATCH /api/v1/message/read-all/:conversationId ──────────────────────────
const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const modifiedCount = await MessageService.markAllAsRead(
    req.params.conversationId as string,
    req.user!.id,                               
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    `${modifiedCount} messages marked as read`,
    data:       { modifiedCount },
  });
});

// ─── PATCH /api/v1/message/:id/pin ───────────────────────────────────────────
const togglePin = catchAsync(async (req: Request, res: Response) => {
  const result = await MessageService.togglePin(
    req.params.id as string,
    req.user!.id,                               
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    result.isPinned ? 'Message pinned' : 'Message unpinned',
    data:       result,
  });
});

// ─── DELETE /api/v1/message/:id ──────────────────────────────────────────────
const deleteMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await MessageService.deleteMessage(
    req.params.id as string,
    req.user!.id,                              
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Message deleted',
    data:       result,
  });
});

// ─── GET /api/v1/message/:conversationId/pinned ──────────────────────────────
const getPinnedMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await MessageService.getPinnedMessages(
    req.params.conversationId as string,
    req.user!.id,                               
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Pinned messages fetched',
    data:       result,
  });
});

export const MessageController = {
  sendMessage,
  getMessages,
  markAllAsRead,
  togglePin,
  deleteMessage,
  getPinnedMessages,
};
