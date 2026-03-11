import { Types }        from 'mongoose';
import { StatusCodes }  from 'http-status-codes';
import ApiError         from '../../../errors/ApiErrors';
import { Conversation } from './conversation.model';
import { User }         from '../user/user.model';

// ─── Helper: validate ObjectId — prevents fake random IDs from undefined ──────
const validateObjectId = (id: string, label: string) => {
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Invalid ${label}. Please login again and retry.`,
    );
  }
};

// ─── 1. Get or Create Conversation ───────────────────────────────────────────
const getOrCreateConversation = async (myId: string, receiverId: string) => {

  // ── Guards first — catch undefined/invalid IDs before any DB call ────────
  validateObjectId(myId,        'user session');
  validateObjectId(receiverId,  'receiver ID');

  if (myId === receiverId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You cannot start a conversation with yourself',
    );
  }

  // ── Receiver must exist in DB ────────────────────────────────────────────
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver not found');
  }

  // ── Check existing — $all matches [A,B] and [B,A] ────────────────────────
  const existing = await Conversation.findOne({
    participants: {
      $all: [
        new Types.ObjectId(myId),
        new Types.ObjectId(receiverId),
      ],
    },
    isActive: true,
  })
    .populate('participants', 'name email profileImage role')
    .populate('lastMessage',  'content messageType createdAt sender attachments');

  if (existing) return existing;

  // ── Create new ───────────────────────────────────────────────────────────
  const newConversation = await Conversation.create({
    participants:  [new Types.ObjectId(myId), new Types.ObjectId(receiverId)],
    type:          'direct',
    lastMessageAt: new Date(),
  });

  const populated = await Conversation.findById(newConversation._id)
    .populate('participants', 'name email profileImage role')
    .populate('lastMessage',  'content messageType createdAt sender attachments');

  if (!populated) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to create conversation',
    );
  }

  return populated;
};

// ─── 2. Get My Conversations — Inbox ─────────────────────────────────────────
const getMyConversations = async (myId: string) => {
  validateObjectId(myId, 'user session');

  return Conversation.find({
    participants: new Types.ObjectId(myId),
    isActive:     true,
  })
    .populate('participants', 'name email profileImage role')
    .populate('lastMessage',  'content messageType createdAt sender attachments')
    .sort({ lastMessageAt: -1 });
};

// ─── 3. Get Single Conversation ──────────────────────────────────────────────
const getSingleConversation = async (conversationId: string, myId: string) => {
  validateObjectId(myId,            'user session');
  validateObjectId(conversationId,  'conversation ID');

  const conversation = await Conversation.findById(
    new Types.ObjectId(conversationId),
  )
    .populate('participants', 'name email profileImage role')
    .populate('lastMessage',  'content messageType createdAt sender attachments');

  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found');
  }

  const isParticipant = (conversation.participants as any[]).some(
    (p: any) => p._id.toString() === myId,
  );

  if (!isParticipant) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not a participant of this conversation',
    );
  }

  return conversation;
};

export const ConversationService = {
  getOrCreateConversation,
  getMyConversations,
  getSingleConversation,
};
