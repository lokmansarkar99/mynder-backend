import { z } from 'zod';

// ─── POST /conversation/start ─────────────────────────────────────────────────
const startConversationSchema = z.object({
  body: z.object({
    receiverId: z
      .string()
      .min(1, 'Receiver ID cannot be empty'),

    type: z
      .enum(['direct', 'support'])
      .optional()
      .default('direct'),
  }),
});

// ─── GET /conversation/:id ────────────────────────────────────────────────────
const getConversationParamsSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1, 'Conversation ID cannot be empty'),
  }),
});

export const ConversationValidation = {
  startConversationSchema,
  getConversationParamsSchema,
};
