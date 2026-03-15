import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { ClientProfileService } from './clientProfile.service';
import sendResponse from '../../../shared/sendResponse';

const saveIntakeStep = catchAsync(async (req: Request, res: Response) => {
  const step = parseInt(req.params.step as string, 10);

  const result = await ClientProfileService.saveIntakeStep(
    req.user.id,
    step,
    req.body,
    req.files,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    `Step ${step} saved successfully`,
    data: {
      intakeStep:      result?.intakeStep,
      intakeCompleted: result?.intakeCompleted,
      profile:         result,
    },
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientProfileService.getMyProfile(req.user.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Profile retrieved successfully',
    data:       result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientProfileService.updateMyProfile(
    req.user.id,
    req.body,
    req.files,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Profile updated successfully',
    data:       result,
  });
});

const getClientById = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientProfileService.getClientById(
    req.params.id as string,
    req.user.role,
    req.user!.id
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Client profile retrieved successfully',
    data:       result,
  });
});

const getAllClients = catchAsync(async (req: Request, res: Response) => {
  const result = await ClientProfileService.getAllClients(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Clients retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

export const ClientProfileController = {
  saveIntakeStep,
  getMyProfile,
  updateMyProfile,
  getClientById,
  getAllClients,
};
