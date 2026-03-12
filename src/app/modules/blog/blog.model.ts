import { Schema, model } from 'mongoose';
import { IBlogDocument, IBlogModel } from './blog.interface';

const blogSchema = new Schema<IBlogDocument>(
  {
    title:       { type: String, required: true },
    slug:        { type: String, unique: true, required: true },
    author:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName:  { type: String },
    authorTitle: { type: String },

    category: {
      type: String,
      enum: ['anxiety','self_care','relationships','mindfulness','sleep_science','therapy','other'],
      required: true,
    },

    coverImage:      { type: String, default: '' },
    excerpt:         { type: String, default: '' },
    content:         { type: String, default: '' },
    readTimeMinutes: { type: Number, default: 0 },
    tags:            { type: [String], default: [] },

    status: {
      type:    String,
      enum:    ['draft', 'published', 'scheduled'],
      default: 'published',
    },

    publishedAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
    viewCount:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

blogSchema.index({ slug: 1 });
blogSchema.index({ status: 1, scheduledAt: 1 }); // cron job query

export const Blog = model<IBlogDocument, IBlogModel>('Blog', blogSchema);