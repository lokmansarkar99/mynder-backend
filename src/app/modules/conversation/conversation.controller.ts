import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';
import { ConversationService } from './conversation.service';

const startConversation = catchAsync(async (req: Request, res: Response) => {
  const myId           = (req.user!.id || (req.user as any)._id)?.toString();
  const { receiverId } = req.body;

  const result = await ConversationService.getOrCreateConversation(myId, receiverId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Conversation ready',
    data:       result,
  });
});

// ─── GET /api/v1/conversation/my?search=&page=&limit= ────────────────────────
const getMyConversations = catchAsync(async (req: Request, res: Response) => {
  const myId   = (req.user!.id || (req.user as any)._id)?.toString();
  const search = req.query.search  as string | undefined;
  const page   = Number(req.query.page)  || 1;
  const limit  = Number(req.query.limit) || 20;

  const result = await ConversationService.getMyConversations(myId, search, page, limit);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Conversations fetched successfully',
    data:       result,
  });
});

const getSingleConversation = catchAsync(async (req: Request, res: Response) => {
  const myId           = (req.user!.id || (req.user as any)._id)?.toString();
  const conversationId = req.params.id as string;

  const result = await ConversationService.getSingleConversation(conversationId, myId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Conversation fetched successfully',
    data:       result,
  });
});

// ─── GET /api/v1/conversation/all?search=&page=&limit= ───────────────────────
// Admin only
const getAllConversations = catchAsync(async (req: Request, res: Response) => {
  const search = req.query.search  as string | undefined;
  const page   = Number(req.query.page)  || 1;
  const limit  = Number(req.query.limit) || 20;

  const result = await ConversationService.getAllConversations(search, page, limit);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'All conversations fetched',
    data:       result,
  });
});

export const ConversationController = {
  startConversation,
  getMyConversations,
  getSingleConversation,
  getAllConversations,
};
