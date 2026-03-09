import express from 'express';
import { checkAuth }             from '../../middlewares/checkAuth';
import { USER_ROLES }            from '../../../enums/user';
import validateRequest           from '../../middlewares/validateRequest';
import { AppointmentController } from './appointment.controller';
import { AppointmentValidation } from './appointment.validation';

const router = express.Router();

// ── Booking — Stripe Hosted Checkout ─────────────────────────────────────────
// Returns { checkoutUrl, sessionId } → frontend redirects to checkoutUrl
router.post(
  '/create-checkout-session',
  checkAuth(USER_ROLES.CLIENT),
  validateRequest(AppointmentValidation.createCheckoutSessionSchema),
  AppointmentController.createCheckoutSession,
);

// ── Client + Provider ─────────────────────────────────────────────────────────
router.get(
  '/my',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  AppointmentController.getMyAppointments,
);

// ── Provider ──────────────────────────────────────────────────────────────────
router.get(
  '/provider/today',
  checkAuth(USER_ROLES.PROVIDER),
  AppointmentController.getProviderTodayAppointments,
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get(
  '/admin/all',
  checkAuth(USER_ROLES.ADMIN),
  AppointmentController.getAllAppointments,
);

// ── Param routes — MUST be after named routes ─────────────────────────────────
router.get(
  '/:id',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  validateRequest(AppointmentValidation.appointmentIdParamSchema),
  AppointmentController.getAppointmentById,
);

router.patch(
  '/:id/cancel',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  validateRequest(AppointmentValidation.cancelAppointmentSchema),
  AppointmentController.cancelAppointment,
);

router.patch(
  '/:id/start',
  checkAuth(USER_ROLES.PROVIDER),
  validateRequest(AppointmentValidation.appointmentIdParamSchema),
  AppointmentController.startSession,
);

router.patch(
  '/:id/complete',
  checkAuth(USER_ROLES.PROVIDER),
  validateRequest(AppointmentValidation.appointmentIdParamSchema),
  AppointmentController.completeSession,
);

router.patch(
  '/:id/no-show',
  checkAuth(USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  validateRequest(AppointmentValidation.appointmentIdParamSchema),
  AppointmentController.markNoShow,
);

router.post(
  '/:id/summary',
  checkAuth(USER_ROLES.PROVIDER),
  validateRequest(AppointmentValidation.sessionSummarySchema),
  AppointmentController.addSessionSummary,
);

export const AppointmentRoutes = router;
