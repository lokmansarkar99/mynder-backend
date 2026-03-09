import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ProviderPayoutService } from './providerPayout.service';

const getAllPayouts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderPayoutService.getAllPayouts(
    req.query as Record<string, unknown>,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'All payouts retrieved',
    meta:       result.meta,
    data:       result.data,
  });
});

const getMyPayouts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderPayoutService.getMyPayouts(
    req.user.id,
    req.query as Record<string, unknown>,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Your payouts retrieved',
    meta:       result.meta,
    data:       result.data,
  });
});

const getPayoutById = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderPayoutService.getPayoutById(
    req.params.id as string,
    req.user.id,
    req.user.role,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Payout retrieved',
    data:       result,
  });
});

const processPayout = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderPayoutService.processPayout(req.params.id as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Payout processed successfully',
    data:       result,
  });
});

const markPayoutAsPaid = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderPayoutService.markPayoutAsPaid(req.params.id as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Payout marked as paid',
    data:       result,
  });
});

const markPayoutAsFailed = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderPayoutService.markPayoutAsFailed(
    req.params.id as string,
    req.body.reason,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Payout marked as failed',
    data:       result,
  });
});

const getPayoutSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderPayoutService.getPayoutSummary();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Payout summary retrieved',
    data:       result,
  });
});

export const ProviderPayoutController = {
  getAllPayouts,
  getMyPayouts,
  getPayoutById,
  processPayout,
  markPayoutAsPaid,
  markPayoutAsFailed,
  getPayoutSummary,
};
