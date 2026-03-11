import { Schema, model } from 'mongoose';
import { IConversationDocument, IConversationModel } from './conversation.interface';
import { Message } from '../message/message.model';

const conversationSchema = new Schema<IConversationDocument>(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref:  'User',
    }],

    type: {
      type:    String,
      enum:    ['direct', 'support'],
      default: 'direct',
    },

    lastMessage: {
      type:    Schema.Types.ObjectId,
      ref:     'Message',
      default: null,
    },

    lastMessageAt: { type: Date, default: null },
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent duplicate conversations between same 2 users
conversationSchema.index({ participants: 1 });

export const Conversation = model<IConversationDocument, IConversationModel>(
  'Conversation',
  conversationSchema
);
