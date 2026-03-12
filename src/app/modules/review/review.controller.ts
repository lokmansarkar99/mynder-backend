import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';
import { ReviewService }     from './review.service';

// ── 1. Create Review 
const createReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.createReview(
    req.user!.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'Review submitted successfully',
    data:       result,
  });
});

// ── 2. Get Provider Reviews (Public)
const getProviderReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getProviderReviews(
    req.params.providerId as string,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Provider reviews retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  
    ...(result.stats && { stats: result.stats }),
  });
});

// ── 3. Get My Reviews (Client) 
const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getMyReviews(
    req.user!.id,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'My reviews retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

// ── 4. Toggle Publish (Admin) 
const togglePublish = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.togglePublish(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    `Review ${result?.isPublished ? 'published' : 'unpublished'} successfully`,
    data:       result,
  });
});

// ── 5. Get All Reviews (Admin) 
const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getAllReviews(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'All reviews retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

export const ReviewController = {
  createReview,
  getProviderReviews,
  getMyReviews,
  togglePublish,
  getAllReviews,
};
