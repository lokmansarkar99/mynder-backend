import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';
import { FormLibraryService } from './form-library.service';

const getAllForms = catchAsync(async (req: Request, res: Response) => {
  const result = await FormLibraryService.getAllForms(req.user.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Form library retrieved',
    data:       result,
  });
});

const getFormById = catchAsync(async (req: Request, res: Response) => {
  const result = await FormLibraryService.getFormById(
    req.params.formId as string,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Form retrieved',
    data:       result,
  });
});

const createForm = catchAsync(async (req: Request, res: Response) => {
  const result = await FormLibraryService.createForm(req.user.id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'Form created successfully',
    data:       result,
  });
});

const updateForm = catchAsync(async (req: Request, res: Response) => {
  const result = await FormLibraryService.updateForm(
    req.params.formId as string,
    req.user.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Form updated successfully',
    data:       result,
  });
});

const deleteForm = catchAsync(async (req: Request, res: Response) => {
  const result = await FormLibraryService.deleteForm(
    req.params.formId as string,
    req.user.id,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Form deleted successfully',
    data:       result,
  });
});

const reorderForms = catchAsync(async (req: Request, res: Response) => {
  const result = await FormLibraryService.reorderForms(
    req.user.id,
    req.body.forms,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Forms reordered',
    data:       result,
  });
});

export const FormLibraryController = {
  getAllForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  reorderForms,
};
