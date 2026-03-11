import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';
import { MessageService }    from './message.service';
import { getIO }             from '../../../socket/socket';
import { getSocketId }       from '../../../socket/onlineUsers';
import { Conversation }      from '../conversation/conversation.model';
import ApiError              from '../../../errors/ApiErrors';

// ─── Helper: safely extract userId string from req.user ───────────────────────
// Handles both login token { id } and refresh token { _id } cases
const getUserId = (req: Request): string => {
  const id = (req.user!.id || (req.user as any)._id)?.toString();
  if (!id) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid session. Please login again.');
  return id;
};

// ─── POST /api/v1/message ─────────────────────────────────────────────────────
const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const senderId = getUserId(req);
  const { conversationId, content, messageType = 'text', tempId } = req.body;

  if (!content?.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Message content cannot be empty');
  }

  // ── 1. Save to DB ────────────────────────────────────────────────────────
  const message = await MessageService.sendMessage(
    conversationId,
    senderId,
    content,
    messageType,
  );

  const msgPayload = { ...message.toObject(), tempId: tempId || null };

  const io = getIO();

  // ── 2. Fetch updated conversation ONCE (used for both delivery + inbox) ──
  const updatedConv = await Conversation.findById(conversationId)
    .populate('participants', 'name email profileImage role')
    .populate('lastMessage',  'content messageType createdAt sender attachments')
    .lean();

  // ── 3. Emit message:new to conversation room ─────────────────────────────
  io.to(conversationId).emit('message:new', msgPayload);

  // ── 4. Delivery tick ─────────────────────────────────────────────────────
  if (tempId && updatedConv) {
    const receiverId = (updatedConv.participants as any[])
      .find((p: any) => p._id.toString() !== senderId)
      ?._id?.toString();

    const senderSocketId   = getSocketId(senderId);
    const receiverSocketId = receiverId ? getSocketId(receiverId) : null;

    if (senderSocketId) {
      io.to(senderSocketId).emit(
        receiverSocketId ? 'message:delivered' : 'message:saved',
        { tempId, messageId: message._id, conversationId },
      );
    }
  }

  // ── 5. conversation:updated → both participants re-sort their inbox ───────
  // Each user is in their personal userId room (joined on socket connect)
  // Frontend listens to this event and moves conversation to top of list
  if (updatedConv) {
    (updatedConv.participants as any[]).forEach((p: any) => {
      io.to(p._id.toString()).emit('conversation:updated', updatedConv);
    });
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
    getUserId(req),
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
  const myId          = getUserId(req);
  const modifiedCount = await MessageService.markAllAsRead(
    req.params.conversationId  as string,
    myId,
  );

  // ── Emit read-receipt to the other participant ───────────────────────────
  // So their sent messages show blue ticks instantly
  if (modifiedCount > 0) {
    const io   = getIO();
    const conv = await Conversation.findById(req.params.conversationId).lean();

    if (conv) {
      const senderId = conv.participants
        .find(p => p.toString() !== myId)
        ?.toString();

      if (senderId) {
        const senderSocketId = getSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read-receipt', {
            conversationId: req.params.conversationId,
            readBy:         myId,
            readAt:         new Date(),
          });
        }
      }
    }
  }

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
    getUserId(req),
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
    getUserId(req),
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
    req.params.conversationId  as string,
    getUserId(req),
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
