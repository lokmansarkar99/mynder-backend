import { Types }        from 'mongoose';
import { StatusCodes }  from 'http-status-codes';
import ApiError         from '../../../errors/ApiErrors';
import { Message }      from './message.model';
import { Conversation } from '../conversation/conversation.model';

// ─── Helper: validate ObjectId ────────────────────────────────────────────────
const validateObjectId = (id: string, label: string) => {
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Invalid ${label}. Please login again and retry.`,
    );
  }
};

// ─── 1. Send Message ──────────────────────────────────────────────────────────
const sendMessage = async (
  conversationId: string,
  senderId:       string,
  content:        string,
  messageType:    'text' | 'file' | 'system' = 'text',
  attachments?:   Array<{
    url:      string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>,
) => {
  validateObjectId(conversationId, 'conversation ID');
  validateObjectId(senderId,       'user session');

  if (!content?.trim() && (!attachments || attachments.length === 0)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Message must have content or attachment');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    p => p.toString() === senderId,
  );
  if (!isParticipant) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not a participant of this conversation',
    );
  }

  const message = await Message.create({
    conversation: new Types.ObjectId(conversationId),
    sender:       new Types.ObjectId(senderId),
    content:      content?.trim() || '',
    messageType:  attachments?.length ? 'file' : messageType,
    attachments:  attachments || [],
  });

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage:   message._id,
    lastMessageAt: new Date(),
  });

  const populated = await Message.findById(message._id)
    .populate('sender', 'name email profileImage role');

  if (!populated) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Message save failed');
  }

  return populated;
};

// ─── 2. Get Messages — Paginated ─────────────────────────────────────────────
const getMessages = async (
  conversationId: string,
  myId:           string,
  page:           number = 1,
  limit:          number = 30,
) => {
  validateObjectId(conversationId, 'conversation ID');
  validateObjectId(myId,           'user session');

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    p => p.toString() === myId,
  );
  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not a participant');
  }

  const skip  = (page - 1) * limit;
  const total = await Message.countDocuments({
    conversation: new Types.ObjectId(conversationId),
    isDeleted:    false,
  });

  const messages = await Message.find({
    conversation: new Types.ObjectId(conversationId),
    isDeleted:    false,
  })
    .populate('sender', 'name email profileImage role')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);

  return {
    messages,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore:    page * limit < total,
    },
  };
};

// ─── 3. Mark All As Read ─────────────────────────────────────────────────────
const markAllAsRead = async (conversationId: string, myId: string) => {
  validateObjectId(conversationId, 'conversation ID');
  validateObjectId(myId,           'user session');

  const result = await Message.updateMany(
    {
      conversation: new Types.ObjectId(conversationId),
      sender:       { $ne: new Types.ObjectId(myId) },
      isRead:       false,
    },
    {
      $set: { isRead: true, readAt: new Date() },
    },
  );

  return result.modifiedCount;
};

// ─── 4. Toggle Pin ────────────────────────────────────────────────────────────
const togglePin = async (messageId: string, myId: string) => {
  validateObjectId(messageId, 'message ID');
  validateObjectId(myId,      'user session');

  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found');
  }
  if (message.isDeleted) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot pin a deleted message');
  }
  if (message.sender.toString() !== myId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only the sender can pin this message');
  }

  message.isPinned = !message.isPinned;
  await message.save();

  return message;
};

// ─── 5. Soft Delete ───────────────────────────────────────────────────────────
const deleteMessage = async (messageId: string, myId: string) => {
  validateObjectId(messageId, 'message ID');
  validateObjectId(myId,      'user session');

  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found');
  }
  if (message.sender.toString() !== myId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only delete your own messages');
  }
  if (message.isDeleted) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Message already deleted');
  }

  message.isDeleted   = true;
  message.content     = 'This message was deleted';
  message.attachments = [];
  message.isPinned    = false;
  await message.save();

  return { deleted: true, messageId };
};

// ─── 6. Get Pinned Messages ───────────────────────────────────────────────────
const getPinnedMessages = async (conversationId: string, myId: string) => {
  validateObjectId(conversationId, 'conversation ID');
  validateObjectId(myId,           'user session');

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    p => p.toString() === myId,
  );
  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not a participant');
  }

  return Message.find({
    conversation: new Types.ObjectId(conversationId),
    isPinned:     true,
    isDeleted:    false,
  })
    .populate('sender', 'name email profileImage role')
    .sort({ createdAt: -1 });
};

export const MessageService = {
  sendMessage,
  getMessages,
  markAllAsRead,
  togglePin,
  deleteMessage,
  getPinnedMessages,
};
