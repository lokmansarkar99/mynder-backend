import express from 'express';
import { checkAuth }               from '../../middlewares/checkAuth';
import { USER_ROLES }              from '../../../enums/user';
import { ProviderPayoutController } from './providerPayout.controller';

const router = express.Router();

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get(
  '/admin/all',
  checkAuth(USER_ROLES.ADMIN),
  ProviderPayoutController.getAllPayouts,
);

router.get(
  '/admin/summary',
  checkAuth(USER_ROLES.ADMIN),
  ProviderPayoutController.getPayoutSummary,
);

router.patch(
  '/admin/:id/process',
  checkAuth(USER_ROLES.ADMIN),
  ProviderPayoutController.processPayout,
);

router.patch(
  '/admin/:id/mark-paid',
  checkAuth(USER_ROLES.ADMIN),
  ProviderPayoutController.markPayoutAsPaid,
);

router.patch(
  '/admin/:id/mark-failed',
  checkAuth(USER_ROLES.ADMIN),
  ProviderPayoutController.markPayoutAsFailed,
);

// ── Provider ──────────────────────────────────────────────────────────────────
router.get(
  '/my',
  checkAuth(USER_ROLES.PROVIDER),
  ProviderPayoutController.getMyPayouts,
);

// ── Shared — param last ───────────────────────────────────────────────────────
router.get(
  '/:id',
  checkAuth(USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  ProviderPayoutController.getPayoutById,
);

export const ProviderPayoutRoutes = router;
