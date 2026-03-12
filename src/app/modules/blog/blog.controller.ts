import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';

import { getSingleFilePath } from '../../../shared/getFilePath';
import { BlogService }   from './blog.service';

// ── 1. Create Blog ────────────────────────────────────────────────
const createBlog = catchAsync(async (req: Request, res: Response) => {

  const coverImagePath = getSingleFilePath(req.files, 'blogImage') ?? undefined;

  const result = await BlogService.createBlog(req.user!.id, req.body, coverImagePath);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'Blog created successfully',
    data:       result,
  });
});

// ── 2. Get All Published Blogs (Public) ───────────────────────────
const getAllPublishedBlogs = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.getAllPublishedBlogs(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Blogs retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

// ── 3. Get Blog By Slug (Public) ──────────────────────────────────
const getBlogBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.getBlogBySlug(req.params.slug as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Blog retrieved successfully',
    data:       result,
  });
});

// ── 4. Get All Blogs — Admin ──────────────────────────────────────
const getAllBlogsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.getAllBlogsAdmin(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'All blogs retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

// ── 5. Get Blog By ID — Admin preview ────────────────────────────
const getBlogById = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.getBlogById(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Blog retrieved successfully',
    data:       result,
  });
});

// ── 6. Update Blog ────────────────────────────────────────────────
const updateBlog = catchAsync(async (req: Request, res: Response) => {
  const coverImagePath = getSingleFilePath(req.files, 'blogImage') ?? undefined;

  const result = await BlogService.updateBlog(
    req.params.id as string,
    req.body,
    coverImagePath,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Blog updated successfully',
    data:       result,
  });
});

// ── 7. Change Status ──────────────────────────────────────────────
const changeStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.changeStatus(req.params.id as string, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    `Blog status changed to "${result?.status}" successfully`,
    data:       result,
  });
});

// ── 8. Delete Blog ────────────────────────────────────────────────
const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogService.deleteBlog(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Blog deleted successfully',
    data:       result,
  });
});

export const BlogController = {
  createBlog,
  getAllPublishedBlogs,
  getBlogBySlug,
  getAllBlogsAdmin,
  getBlogById,
  updateBlog,
  changeStatus,
  deleteBlog,
};