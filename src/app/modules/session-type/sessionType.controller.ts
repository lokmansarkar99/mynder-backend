import { Request, Response } from 'express';
import { SessionTypeServices } from './sessionType.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const createSessionType = catchAsync(async (req: Request, res: Response) => {
  const result = await SessionTypeServices.createSessionType(
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    message:    'Session type created successfully',
    success:    true,
    statusCode: StatusCodes.CREATED,
    data:       result,
  });
});

const getMyAllSession = catchAsync(async (req: Request, res: Response) => {
  const result = await SessionTypeServices.getMyAllSession(req.user.id);

  sendResponse(res, {
    message:    'Session types retrieved successfully',
    success:    true,
    statusCode: StatusCodes.OK,
    data:       result,
  });
});

const updateSessionType = catchAsync(async (req: Request, res: Response) => {
  const result = await SessionTypeServices.updateSessionType(
    req.params.id as string,
    req.user.id,   
    req.body,
  );

  sendResponse(res, {
    message:    'Session type updated successfully',
    success:    true,
    statusCode: StatusCodes.OK,
    data:       result,
  });
});

const deleteSessionType = catchAsync(async (req: Request, res: Response) => {
  const result = await SessionTypeServices.deleteSessionType(
    req.params.id as string,
    req.user.id,   
  );

  sendResponse(res, {
    message:    'Session type deleted successfully',
    success:    true,
    statusCode: StatusCodes.OK,
    data:       result,
  });
});


const getProviderActiveSessions = catchAsync(async (req: Request, res: Response) => {
  const result = await SessionTypeServices.getProviderActiveSessions(
    req.params.providerId as string,
  );

  sendResponse(res, {
    success:    true,
    message:    'Provider session types retrieved successfully',
    statusCode: StatusCodes.OK,
    data:       result,
  });
});

const toggleSessionType = catchAsync(async (req: Request, res: Response) => {
  const result = await SessionTypeServices.toggleSessionType(
    req.params.id as string,
    req.user.id,   
    req.body,
  );

  sendResponse(res, {
    success:    true,
    message:    `Session type ${req.body.isActive ? 'activated' : 'deactivated'} successfully`,
    statusCode: StatusCodes.OK,
    data:       result,
  });
});

export const SessionTypeController = {
  createSessionType,
  getMyAllSession,
  updateSessionType,
  deleteSessionType,
  getProviderActiveSessions,
  toggleSessionType,
}; 
