import { Document, Model, Types } from 'mongoose';

export type IBlog = {
  title:          string;
  slug:           string;  // SEO-friendly URL
  author:         Types.ObjectId;
  authorName:     string;  // denormalized
  authorTitle:    string;  // e.g. "Clinical Psychologist"
  category:       'anxiety' | 'self_care' | 'relationships' | 'mindfulness' | 'sleep_science' | 'therapy' | 'other';
  coverImage:     string;
  excerpt:        string;
  content:        string;  // rich text / HTML
  readTimeMinutes: number;
  tags:           string[];
  status:         'draft' | 'published' | 'scheduled';
  publishedAt:    Date | null;
  scheduledAt:    Date | null;
  viewCount:      number;
};

export type IBlogDocument = IBlog & Document;
export type IBlogModel    = Model<IBlogDocument>;
