import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';
import { FAQService }        from './faq.service';

// ── 1. Create FAQ (Admin) 
const createFAQ = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.createFAQ(
    req.user!.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'FAQ created successfully',
    data:       result,
  });
});

// ── 2. Get All Published FAQs (Public) 
const getAllPublishedFAQs = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.getAllPublishedFAQs(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'FAQs retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

// ── 3. Get All FAQs — Admin Panel
const getAllFAQsAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.getAllFAQsAdmin(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'All FAQs retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

// ── 4. Get Single FAQ (Public) 
const getSingleFAQ = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.getSingleFAQ(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'FAQ retrieved successfully',
    data:       result,
  });
});

// ── 5. Update FAQ (Admin) 
const updateFAQ = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.updateFAQ(req.params.id as string, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'FAQ updated successfully',
    data:       result,
  });
});

// ── 6. Toggle Publish (Admin) 
const togglePublish = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.togglePublish(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    `FAQ ${result?.isPublished ? 'published' : 'unpublished'} successfully`,
    data:       result,
  });
});

// ── 7. Delete FAQ (Admin) 
const deleteFAQ = catchAsync(async (req: Request, res: Response) => {
  const result = await FAQService.deleteFAQ(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'FAQ deleted successfully',
    data:       result,
  });
});

// ── Export 
export const FAQController = {
  createFAQ,
  getAllPublishedFAQs,
  getAllFAQsAdmin,
  getSingleFAQ,
  updateFAQ,
  togglePublish,
  deleteFAQ,
};
