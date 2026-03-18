import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';
import { IntakeFormConfigService } from './intake-form-config.service';

// ── PUBLIC ────────────────────────────────────────────────────────

// GET /intake-form-config/public?formType=CLIENT
// Used by CLIENT and PROVIDER to load their intake form fields
const getPublicFormConfig = catchAsync(async (req: Request, res: Response) => {
  const formType = req.query.formType as 'CLIENT' | 'PROVIDER';

  const step = Number(req.query.step)

  if (!formType || !['CLIENT', 'PROVIDER'].includes(formType)) {
    return sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success:    false,
      message:    'formType query param required: CLIENT or PROVIDER',
      data:       null,
    });
  }

  const result = await IntakeFormConfigService.getPublicFormConfig(formType, step);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Form config loaded',
    data:       result,
  });
});

// ── ADMIN ─────────────────────────────────────────────────────────

// GET /intake-form-config?formType=CLIENT  (admin sees ALL including hidden)
const getAdminFormConfig = catchAsync(async (req: Request, res: Response) => {
  const formType = req.query.formType as 'CLIENT' | 'PROVIDER';

  if (!formType || !['CLIENT', 'PROVIDER'].includes(formType)) {
    return sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success:    false,
      message:    'formType query param required: CLIENT or PROVIDER',
      data:       null,
    });
  }

  const result = await IntakeFormConfigService.getAdminFormConfig(formType);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Admin form config loaded',
    data:       result,
  });
});

// POST /intake-form-config
const addField = catchAsync(async (req: Request, res: Response) => {
  const result = await IntakeFormConfigService.addField(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'Field added successfully',
    data:       result,
  });
});

// PATCH /intake-form-config/:fieldId
const updateField = catchAsync(async (req: Request, res: Response) => {
  const result = await IntakeFormConfigService.updateField(
    req.params.fieldId as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Field updated successfully',
    data:       result,
  });
});

// PATCH /intake-form-config/:fieldId/toggle
const toggleField = catchAsync(async (req: Request, res: Response) => {
  const result = await IntakeFormConfigService.toggleField(req.params.fieldId as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Field visibility toggled',
    data:       result,
  });
});

// DELETE /intake-form-config/:fieldId
const deleteField = catchAsync(async (req: Request, res: Response) => {
  const result = await IntakeFormConfigService.deleteField(req.params.fieldId as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Field deleted successfully',
    data:       result,
  });
});

// PATCH /intake-form-config/reorder
const reorderFields = catchAsync(async (req: Request, res: Response) => {
  const result = await IntakeFormConfigService.reorderFields(req.body.fields);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Fields reordered successfully',
    data:       result,
  });
});

export const IntakeFormConfigController = {
  getPublicFormConfig,
  getAdminFormConfig,
  addField,
  updateField,
  toggleField,
  deleteField,
  reorderFields,
};
