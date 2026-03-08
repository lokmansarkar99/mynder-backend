import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AvailabilityService } from './availability.service';

const updateWeeklyAvailability = catchAsync(async (req: Request, res: Response) => {
  const result = await AvailabilityService.updateWeeklyAvailability(
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Weekly availability updated successfully',
    data:       result,
  });
});

const getMyAvailability = catchAsync(async (req: Request, res: Response) => {
  const result = await AvailabilityService.getMyAvailability(req.user.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Availability retrieved successfully',
    data:       result,
  });
});

const getProviderAvailability = catchAsync(async (req: Request, res: Response) => {
  const result = await AvailabilityService.getProviderAvailability(
    req.params.providerId as string,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Provider availability retrieved successfully',
    data:       result,
  });
});

export const AvailabilityController = {
  updateWeeklyAvailability,
  getMyAvailability,
  getProviderAvailability,
};
