import { z } from 'zod';

// ─── POST /message 
const sendMessageSchema = z.object({
  body: z.object({
    conversationId: z
      .string()
      .min(1, 'conversationId cannot be empty'),
    content:     z.string().max(5000).optional().default(''),
    messageType: z.enum(['text', 'file', 'system']).optional().default('text'),
    tempId:      z.string().optional(), 
  }),
});

// ─── GET /message/:conversationId ───────────
const getMessagesSchema = z.object({
  params: z.object({
    conversationId: z.string().min(1, 'conversationId required'),
  }),
  query: z.object({
    page:  z.string().optional().default('1'),
    limit: z.string().optional().default('30'),
  }),
});

// ─── PATCH /message/read-all/:conversationId 
const markAsReadSchema = z.object({
  params: z.object({
    conversationId: z.string().min(1, 'conversationId required'),
  }),
});

// ─── PATCH /message/:id/pin  +  DELETE /message/:id
const messageIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'message id required'),
  }),
});

export const MessageValidation = {
  sendMessageSchema,
  getMessagesSchema,
  markAsReadSchema,
  messageIdSchema,
};
