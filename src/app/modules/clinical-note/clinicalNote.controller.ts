import { Request, Response } from 'express';
import { StatusCodes }       from 'http-status-codes';
import catchAsync            from '../../../shared/catchAsync';
import sendResponse          from '../../../shared/sendResponse';
import { ClinicalNoteService } from './clinicalNote.service';

const createClinicalNote = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicalNoteService.createClinicalNote(
    req.user!.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'Clinical note created successfully',
    data:       result,
  });
});

const getClientNotes = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicalNoteService.getClientNotes(
    req.user!.id,
    req.params.clientId as string,
    req.query as Record<string, unknown>,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Client notes retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

const getNoteById = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicalNoteService.getNoteById(
    req.params.id as string,
    req.user!.id,
    req.user!.role,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Clinical note retrieved successfully',
    data:       result,
  });
});

const updateNote = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicalNoteService.updateNote(
    req.params.id as string,
    req.user!.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Clinical note updated successfully',
    data:       result,
  });
});

const finalizeNote = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicalNoteService.finalizeNote(
    req.params.id as string,
    req.user!.id,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Clinical note finalized and signed successfully',
    data:       result,
  });
});

const getMyNotes = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicalNoteService.getMyNotes(
    req.user!.id,
    req.query as Record<string, unknown>,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'My clinical notes retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

const getMyClientNotes = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicalNoteService.getMyClientNotes(
    req.user!.id,
    req.query as Record<string, unknown>,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'My notes retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

const getAllNotesAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await ClinicalNoteService.getAllNotesAdmin(
    req.query as Record<string, unknown>,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'All clinical notes retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

export const ClinicalNoteController = {
  createClinicalNote,
  getClientNotes,
  getNoteById,
  updateNote,
  finalizeNote,
  getMyNotes,
  getMyClientNotes,
  getAllNotesAdmin,
};
