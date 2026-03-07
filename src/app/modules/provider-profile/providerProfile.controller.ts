import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { ProviderProfileService } from './providerProfile.service';
import sendResponse from '../../../shared/sendResponse';
import { IProviderProfileDocument } from './providerProfile.interface';

const saveIntakeStep = catchAsync(async (req: Request, res: Response) => {
  const step = parseInt(req.params.step as string, 10);


  const result = await ProviderProfileService.saveIntakeStep(
    req.user.id,
    step,
    req.body,
    req.files,
  );

  const profile = await result as IProviderProfileDocument | null

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    step === 3
      ? 'Application submitted successfully. We are reviewing your profile.'
      : `Step ${step} saved successfully`,
    data: {
      intakeStep:          result?.intakeStep,
      applicationStatus:   result?.applicationStatus,
      profile
    },
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderProfileService.getMyProfile(req.user.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Provider profile retrieved successfully',
    data:       result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderProfileService.updateMyProfile(
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

const getPublicProviders = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderProfileService.getPublicProviders(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Providers retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

const getPublicProviderById = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderProfileService.getPublicProviderById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Provider profile retrieved successfully',
    data:       result,
  });
});

const getAllProviders = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderProfileService.getAllProviders(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'All providers retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

const reviewApplication = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderProfileService.reviewApplication(
    req.params.id as string,
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    `Provider application ${req.body.action}d successfully`,
    data:       result,
  });
});

const getProviderById = catchAsync(async (req: Request, res: Response) => {
  const result = await ProviderProfileService.getProviderById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Provider profile retrieved successfully',
    data:       result,
  });
});

export const ProviderProfileController = {
  saveIntakeStep,
  getMyProfile,
  updateMyProfile,
  getPublicProviders,
  getPublicProviderById,
  getAllProviders,
  reviewApplication,
  getProviderById
};
