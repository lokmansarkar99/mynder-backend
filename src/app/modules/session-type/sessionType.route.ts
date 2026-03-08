import express from 'express';
import { checkAuth } from '../../middlewares/checkAuth';
import { USER_ROLES } from '../../../enums/user';
import { SessionTypeController } from './sessionType.controller';
import validateRequest from '../../middlewares/validateRequest';
import { SessionTypeValidation } from './session.validation';

const router = express.Router();

// ── Provider routes ───────────────────────────────────────────────────────────
router
  .route('/')
  .post(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(SessionTypeValidation.createSessionTypeSchema),
    SessionTypeController.createSessionType,
  )
  .get(
    checkAuth(USER_ROLES.PROVIDER),
    SessionTypeController.getMyAllSession,
  );


router
  .route('/:id')
  .patch(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(SessionTypeValidation.updateSessionTypeSchema),
    SessionTypeController.updateSessionType,
  )
  .delete(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(SessionTypeValidation.deleteSessionTypeSchema),
    SessionTypeController.deleteSessionType,
  );


router
  .route('/:id/toggle')
  .patch(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(SessionTypeValidation.toggleSessionTypeSchema),
    SessionTypeController.toggleSessionType,
  );


router
  .route('/public/:providerId')
  .get(
    checkAuth(USER_ROLES.CLIENT),
    SessionTypeController.getProviderActiveSessions,
  );

export const SessionTypeRouter = router;
