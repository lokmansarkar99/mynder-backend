import express from 'express';
import { checkAuth } from '../../middlewares/checkAuth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { SlotController } from './slot.controller';
import { SlotValidation } from './slot.validation';

const router = express.Router();

// ── Provider routes ───────────────────────────────────────────────────────────

router
  .route('/')
  .post(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(SlotValidation.createSlotSchema),
    SlotController.createSlot,
  );

router
  .route('/my')
  .get(
    checkAuth(USER_ROLES.PROVIDER),
    SlotController.getMySlots,
  );

//  Bulk delete — BEFORE /:id to avoid route conflict
router
  .route('/bulk')
  .delete(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(SlotValidation.bulkDeleteSlotSchema),
    SlotController.bulkDeleteSlots,
  );

router
  .route('/:id')
  .patch(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(SlotValidation.updateSlotSchema),
    SlotController.updateSlot,
  )
  .delete(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(SlotValidation.deleteSlotSchema),
    SlotController.deleteSlot,
  );

// ── Client routes ─────────────────────────────────────────────────────────────

//  /upcoming BEFORE /:providerId — otherwise 'upcoming' matches as providerId
router
  .route('/provider/:providerId/upcoming')
  .get(
    checkAuth(USER_ROLES.CLIENT),
    SlotController.getProviderUpcomingSlots,
  );

router
  .route('/provider/:providerId')
  .get(
    checkAuth(USER_ROLES.CLIENT),
    SlotController.getProviderSlots,
  );

export const SlotRoutes = router;
