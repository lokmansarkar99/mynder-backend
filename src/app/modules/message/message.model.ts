import { Schema, model } from 'mongoose';
import { IMessageDocument, IMessageModel } from './message.interface';

const attachmentSchema = new Schema({
  url:      { type: String },
  fileName: { type: String },
  fileType: { type: String },
  fileSize: { type: Number },
}, { _id: false });

const messageSchema = new Schema<IMessageDocument>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content:      { type: String, default: '' },
    attachments:  { type: [attachmentSchema], default: [] },

    messageType: {
      type:    String,
      enum:    ['text', 'file', 'system'],
      default: 'text',
    },

    isPinned:  { type: Boolean, default: false },
    isRead:    { type: Boolean, default: false },
    readAt:    { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Message = model<IMessageDocument, IMessageModel>('Message', messageSchema);
