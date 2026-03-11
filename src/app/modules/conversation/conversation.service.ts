import { Types }        from 'mongoose';
import { StatusCodes }  from 'http-status-codes';
import ApiError         from '../../../errors/ApiErrors';
import { Conversation } from './conversation.model';
import { User }         from '../user/user.model';

const validateObjectId = (id: string, label: string) => {
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}. Please login again.`);
  }
};

// ─── 1. Get or Create Conversation 
const getOrCreateConversation = async (myId: string, receiverId: string) => {
  validateObjectId(myId,       'user session');
  validateObjectId(receiverId, 'receiver ID');

  if (myId === receiverId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot start a conversation with yourself');
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Receiver not found');
  }

  const existing = await Conversation.findOne({
    participants: { $all: [new Types.ObjectId(myId), new Types.ObjectId(receiverId)] },
    isActive:     true,
  })
    .populate('participants', 'name email profileImage role')
    .populate('lastMessage',  'content messageType createdAt sender attachments');

  if (existing) return existing;

  const newConversation = await Conversation.create({
    participants:  [new Types.ObjectId(myId), new Types.ObjectId(receiverId)],
    type:          'direct',
    lastMessageAt: new Date(),
  });

  const populated = await Conversation.findById(newConversation._id)
    .populate('participants', 'name email profileImage role')
    .populate('lastMessage',  'content messageType createdAt sender attachments');

  if (!populated) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create conversation');
  }

  return populated;
};

// ─── 2. Get My Conversations — with Search + Pagination ──────────────────────
// - CLIENT  → sees conversations with PROVIDERs
// - PROVIDER → sees conversations with CLIENTs
// - search  → filter by the OTHER participant's name or email
const getMyConversations = async (
  myId:   string,
  search?: string,
  page:    number = 1,
  limit:   number = 20,
) => {
  validateObjectId(myId, 'user session');

  // Base filter: I must be a participant
  const baseFilter: any = {
    participants: new Types.ObjectId(myId),
    isActive:     true,
  };

  // ── Search: find other users whose name/email matches ─────────────────────
  // Then restrict conversations to only those involving matched users
  if (search?.trim()) {
    const matchedUsers = await User.find({
      _id:  { $ne: new Types.ObjectId(myId) },
      $or:  [
        { name:  { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ],
    }).select('_id').lean();

    if (matchedUsers.length === 0) {
      return {
        conversations: [],
        pagination: { total: 0, page, limit, totalPages: 0, hasMore: false },
      };
    }

    const matchedIds = matchedUsers.map(u => u._id);

    // Conversation must have BOTH: myId AND at least one matched user
    delete baseFilter.participants;
    baseFilter.$and = [
      { participants: new Types.ObjectId(myId) },
      { participants: { $in: matchedIds } },
      { isActive: true },
    ];
  }

  const skip  = (page - 1) * limit;
  const total = await Conversation.countDocuments(baseFilter);

  const conversations = await Conversation.find(baseFilter)
    .populate('participants', 'name email profileImage role')
    .populate('lastMessage',  'content messageType createdAt sender attachments')
    .sort({ lastMessageAt: -1 })   // ← most recent on top always
    .skip(skip)
    .limit(limit);

  return {
    conversations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore:    page * limit < total,
    },
  };
};

// ─── 3. Get Single Conversation ──────────────────────────────────────────────
const getSingleConversation = async (conversationId: string, myId: string) => {
  validateObjectId(myId,           'user session');
  validateObjectId(conversationId, 'conversation ID');

  const conversation = await Conversation.findById(conversationId)
    .populate('participants', 'name email profileImage role')
    .populate('lastMessage',  'content messageType createdAt sender attachments');

  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found');
  }

  const isParticipant = (conversation.participants as any[]).some(
    (p: any) => p._id.toString() === myId,
  );

  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant of this conversation');
  }

  return conversation;
};

// ─── 4. Admin — Get All Conversations ────────────────────────────────────────
// Paginated + searchable by any participant's name/email
const getAllConversations = async (
  search?: string,
  page:    number = 1,
  limit:   number = 20,
) => {
  const filter: any = { isActive: true };

  if (search?.trim()) {
    const matchedUsers = await User.find({
      $or: [
        { name:  { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ],
    }).select('_id').lean();

    if (matchedUsers.length === 0) {
      return {
        conversations: [],
        pagination: { total: 0, page, limit, totalPages: 0, hasMore: false },
      };
    }

    filter.participants = { $in: matchedUsers.map(u => u._id) };
  }

  const skip  = (page - 1) * limit;
  const total = await Conversation.countDocuments(filter);

  const conversations = await Conversation.find(filter)
    .populate('participants', 'name email profileImage role')
    .populate('lastMessage',  'content messageType createdAt sender attachments')
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    conversations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore:    page * limit < total,
    },
  };
};

export const ConversationService = {
  getOrCreateConversation,
  getMyConversations,
  getSingleConversation,
  getAllConversations,
};
