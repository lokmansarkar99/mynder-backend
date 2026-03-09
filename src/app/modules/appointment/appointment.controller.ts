import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AppointmentService } from './appointment.service';

// ─── 1. Create Checkout Session 
const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.createCheckoutSession(
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Checkout session created. Redirect to checkoutUrl.',
    data:       result,
    // data: {
    //   checkoutUrl: "https://checkout.stripe.com/pay/cs_xxx"  ← frontend redirects here
    //   sessionId:   "cs_xxx"
    // }
  });
});

// ─── 2. Get My Appointments ────
const getMyAppointments = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.getMyAppointments(
    req.user.id,
    req.user.role,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Appointments retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

// ─── 3. Get Appointment By ID ──
const getAppointmentById = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.getAppointmentById(
    req.params.id as string,
    req.user.id,
    req.user.role
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Appointment retrieved successfully',
    data:       result,
  });
});

// ─── 4. Cancel Appointment ─────
const cancelAppointment = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.cancelAppointment(
    req.params.id as string,
    req.user.id,
    req.user.role,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Appointment cancelled successfully',
    data:       result,
  });
});

// ─── 5. Get All Appointments (Admin) ──────────────────────────────────────────
const getAllAppointments = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.getAllAppointments(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'All appointments retrieved successfully',
    meta:       result.meta,
    data:       result.data,
  });
});

// ─── 6. Provider Today's Appointments ─────────────────────────────────────────
const getProviderTodayAppointments = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.getProviderTodayAppointments(req.user.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    "Today's appointments retrieved successfully",
    data:       result,
  });
});

// ─── 7. Start Session ──────────
const startSession = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.startSession(
    req.params.id as string,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Session started successfully',
    data:       result,
  });
});

// ─── 8. Complete Session ───────
const completeSession = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.completeSession(
    req.params.id as string,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Session completed successfully',
    data:       result,
  });
});

// ─── 9. Mark No-Show ───────────
const markNoShow = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.markNoShow(
    req.params.id as string,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Appointment marked as no-show',
    data:       result,
  });
});

// ─── 10. Add Session Summary ───
const addSessionSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.addSessionSummary(
    req.params.id as string,
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Session summary added successfully',
    data:       result,
  });
});

export const AppointmentController = {
  createCheckoutSession,      
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  getAllAppointments,
  getProviderTodayAppointments,
  startSession,
  completeSession,
  markNoShow,
  addSessionSummary,
};
