import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';
import { ConversationService } from './conversation.service';

// ─── POST /api/v1/conversation/start ─────────────────────────────────────────
const startConversation = catchAsync(async (req: Request, res: Response) => {
  const myId           = req.user!.id;         
  const { receiverId } = req.body;

  const result = await ConversationService.getOrCreateConversation(
    myId,
    receiverId,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Conversation ready',
    data:       result,
  });
});

// ─── GET /api/v1/conversation/my ─────────────────────────────────────────────
const getMyConversations = catchAsync(async (req: Request, res: Response) => {
  const myId = req.user!.id;                  
  const result = await ConversationService.getMyConversations(myId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Conversations fetched successfully',
    data:       result,
  });
});

// ─── GET /api/v1/conversation/:id ────────────────────────────────────────────
const getSingleConversation = catchAsync(async (req: Request, res: Response) => {
  const myId           = req.user!.id;        
  const conversationId = req.params.id as string;

  const result = await ConversationService.getSingleConversation(
    conversationId,
    myId,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Conversation fetched successfully',
    data:       result,
  });
});

export const ConversationController = {
  startConversation,
  getMyConversations,
  getSingleConversation,
};
