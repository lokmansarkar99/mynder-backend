import { Types }         from 'mongoose';
import { StatusCodes }    from 'http-status-codes';
import ApiError           from '../../../errors/ApiErrors';
import { Blog }           from './blog.model';
import { QueryBuilder }   from '../../buillder/queryBuilder';
import unlinkFile         from '../../../shared/unLinkFIle';
import {
  TCreateBlogPayload,
  TUpdateBlogPayload,
  TChangeStatusPayload,
} from './blog.validation';


const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);

const ensureUniqueSlug = async (
  base:       string,
  excludeId?: string,
): Promise<string> => {
  let slug    = base;
  let counter = 2;

  while (true) {
    const query: Record<string, unknown> = { slug };
    if (excludeId) query._id = { $ne: new Types.ObjectId(excludeId) };

    const exists = await Blog.findOne(query).lean();
    if (!exists) break;

    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
};

const calculateReadTime = (content: string): number => {
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};


const createBlog = async (
  userId:          string,
  payload:         TCreateBlogPayload,
  coverImagePath?: string,
) => {
  const rawSlug    = payload.slug ?? generateSlug(payload.title);
  const uniqueSlug = await ensureUniqueSlug(rawSlug);

  const readTimeMinutes = calculateReadTime(payload.content);
  const publishedAt     = payload.status === 'published' ? new Date() : null;

  const blog = await Blog.create({
    ...payload,
    slug:            uniqueSlug,
    author:          new Types.ObjectId(userId),
    coverImage:      coverImagePath ?? '',
    readTimeMinutes,
    publishedAt,
    scheduledAt:     payload.scheduledAt ?? null,
  });

  return blog;
};


const getAllPublishedBlogs = async (query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = { status: 'published' };


  const { tag, ...restQuery } = query;

  if (tag) {
    filter.tags = { $in: [tag] };
  }

  const blogQuery = new QueryBuilder(
    Blog.find(filter)
      .select('-content')
      .populate('author', 'name profileImage'),
    restQuery as Record<string, string>,
  )
    .search(['title', 'excerpt'])
    .filter()
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    blogQuery.modelQuery,
    blogQuery.countTotal(),
  ]);

  return { data, meta };
};


const getBlogBySlug = async (slug: string) => {
  const blog = await Blog.findOneAndUpdate(
    { slug, status: 'published' },
    { $inc: { viewCount: 1 } },
    { new: true },
  ).populate('author', 'name profileImage');

  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog post not found');
  }

  return blog;
};


const getAllBlogsAdmin = async (query: Record<string, unknown>) => {
  const blogQuery = new QueryBuilder(
    Blog.find().populate('author', 'name profileImage'),
    query as Record<string, string>,
  )
    .search(['title', 'excerpt'])
    .filter()
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    blogQuery.modelQuery,
    blogQuery.countTotal(),
  ]);

  return { data, meta };
};


const getBlogById = async (blogId: string) => {
  const blog = await Blog.findById(blogId)
    .populate('author', 'name profileImage');

  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  return blog;
};


const updateBlog = async (
  blogId:          string,
  payload:         TUpdateBlogPayload,
  coverImagePath?: string,
) => {
  const blog = await Blog.findById(blogId);
  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  const updateData: Record<string, unknown> = { ...payload };

  if (coverImagePath) {
    
    if (blog.coverImage) {
      unlinkFile(blog.coverImage);
    }
    updateData.coverImage = coverImagePath;
  }

  if (payload.content) {
    updateData.readTimeMinutes = calculateReadTime(payload.content);
  }

  const updated = await Blog.findByIdAndUpdate(
    blogId,
    { $set: updateData },
    { new: true, runValidators: true },
  );

  return updated;
};


const changeStatus = async (blogId: string, payload: TChangeStatusPayload) => {
  const blog = await Blog.findById(blogId);
  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  const updateData: Record<string, unknown> = { status: payload.status };

  if (payload.status === 'published') {

    updateData.publishedAt = new Date();
    updateData.scheduledAt = null;
  }

  if (payload.status === 'scheduled') {
    updateData.scheduledAt = payload.scheduledAt;
    updateData.publishedAt = null;
  }

  if (payload.status === 'draft') {
    updateData.scheduledAt = null;
    
  }

  const updated = await Blog.findByIdAndUpdate(
    blogId,
    { $set: updateData },
    { new: true },
  );

  return updated;
};


const deleteBlog = async (blogId: string) => {
  const blog = await Blog.findById(blogId);
  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  if (blog.coverImage) {
    unlinkFile(blog.coverImage);
  }

  await Blog.findByIdAndDelete(blogId);
  return { deleted: true };
};

const publishScheduledBlogs = async (): Promise<number> => {
  const now = new Date();

  const result = await Blog.updateMany(
    { status: 'scheduled', scheduledAt: { $lte: now } },
    { $set: { status: 'published', publishedAt: now, scheduledAt: null } },
  );

  return result.modifiedCount;
};

export const BlogService = {
  createBlog,
  getAllPublishedBlogs,
  getBlogBySlug,
  getAllBlogsAdmin,
  getBlogById,
  updateBlog,
  changeStatus,
  deleteBlog,
  publishScheduledBlogs,
};