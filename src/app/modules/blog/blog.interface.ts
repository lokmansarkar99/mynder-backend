import { Document, Model, Types } from 'mongoose';

export const BLOG_CATEGORIES = [
  'anxiety',
  'self_care',
  'relationships',
  'mindfulness',
  'sleep_science',
  'therapy',
  'other',
] as const;

export const BLOG_STATUSES = ['draft', 'published', 'scheduled'] as const;

export type TBlogCategory = (typeof BLOG_CATEGORIES)[number];
export type TBlogStatus   = (typeof BLOG_STATUSES)[number];

export type IBlog = {
  title:           string;
  slug:            string;
  author:          Types.ObjectId;
  authorName?:     string;
  authorTitle?:    string;
  category:        TBlogCategory;
  coverImage:      string;
  excerpt:         string;
  content:         string;
  readTimeMinutes: number;
  tags:            string[];
  status:          TBlogStatus;
  publishedAt:     Date | null;
  scheduledAt:     Date | null;
  viewCount:       number;
};

export type IBlogDocument = IBlog & Document;
export type IBlogModel    = Model<IBlogDocument>;