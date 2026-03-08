import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SlotService } from './slot.service';

const createSlot = catchAsync(async (req: Request, res: Response) => {
  const result = await SlotService.createSlot(req.user.id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'Slot created successfully',
    data:       result,
  });
});

const getMySlots = catchAsync(async (req: Request, res: Response) => {
  const result = await SlotService.getMySlots(
    req.user.id,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Slots retrieved successfully',
    data:       result,
  });
});

const getProviderSlots = catchAsync(async (req: Request, res: Response) => {
  const result = await SlotService.getProviderSlots(
    req.params.providerId as string,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Provider slots retrieved successfully',
    data:       result,
  });
});

const getProviderUpcomingSlots = catchAsync(async (req: Request, res: Response) => {
  const result = await SlotService.getProviderUpcomingSlots(
    req.params.providerId as string,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Upcoming slots retrieved successfully',
    data:       result,
  });
});

const updateSlot = catchAsync(async (req: Request, res: Response) => {
  const result = await SlotService.updateSlot(
    req.params.id as string,
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Slot updated successfully',
    data:       result,
  });
});

const deleteSlot = catchAsync(async (req: Request, res: Response) => {
  await SlotService.deleteSlot(req.params.id as string, req.user.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Slot deleted successfully',
    data:       null,
  });
});

const bulkDeleteSlots = catchAsync(async (req: Request, res: Response) => {
  const result = await SlotService.bulkDeleteSlots(req.user.id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    `${result.deletedCount} slot(s) deleted. ${result.skipped} skipped (booked or unauthorized).`,
    data:       result,
  });
});

export const SlotController = {
  createSlot,
  getMySlots,
  getProviderSlots,
  getProviderUpcomingSlots,
  updateSlot,
  deleteSlot,
  bulkDeleteSlots,
};
