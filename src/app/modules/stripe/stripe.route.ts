import express from 'express';
import { checkAuth }        from '../../middlewares/checkAuth';
import { USER_ROLES }       from '../../../enums/user';
import { StripeController } from './stripe.controller';

const router = express.Router();

// ⚠️ Webhook — raw body required — BEFORE express.json() in app.ts
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  StripeController.handleWebhook,
);

// Payment status
router.get(
  '/status/:appointmentId',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  StripeController.getPaymentStatus,
);

// Admin refund
router.post(
  '/refund/:appointmentId',
  checkAuth(USER_ROLES.ADMIN),
  StripeController.refundPayment,
);

export const StripeRoutes = router;
