import { Document, Model, Types } from 'mongoose';

type IAttachment = {
  url:      string;
  fileName: string;
  fileType: string;  // "pdf" | "image" | "video"
  fileSize: number;  // bytes
};

export type IMessage = {
  conversation: Types.ObjectId;
  sender:       Types.ObjectId;
  content:      string;
  attachments:  IAttachment[];
  messageType:  'text' | 'file' | 'system';
  isPinned:     boolean;
  isRead:       boolean;
  readAt:       Date | null;
  isDeleted:    boolean;  // soft delete
};

export type IMessageDocument = IMessage & Document;
export type IMessageModel    = Model<IMessageDocument>;
