import { Document, Model, Types } from 'mongoose';

export type IConversation = {
  participants:    Types.ObjectId[];  // exactly 2 users
  type:            'direct' | 'support';
  lastMessage:     Types.ObjectId | null;
  lastMessageAt:   Date | null;
  isActive:        boolean;
};

export type IConversationDocument = IConversation & Document;
export type IConversationModel    = Model<IConversationDocument>;
