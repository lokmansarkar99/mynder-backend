import express from 'express';
import { checkAuth } from '../../middlewares/checkAuth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { AvailabilityController } from './availability.controller';
import { AvailabilityValidation } from './availability.validation';

const router = express.Router();

// ── Provider ──────────────────────────────────────────────────────────────────

// PUT /availability/weekly — upsert full or partial schedule
router
  .route('/weekly')
  .put(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(AvailabilityValidation.updateWeeklyAvailabilitySchema),
    AvailabilityController.updateWeeklyAvailability,
  );

// GET /availability/weekly/my — own schedule
// Must be BEFORE /:providerId — otherwise 'my' is treated as providerId param
router
  .route('/weekly/my')
  .get(
    checkAuth(USER_ROLES.PROVIDER),
    AvailabilityController.getMyAvailability,
  );

// GET /availability/weekly/:providerId — public, client views provider's days
router
  .route('/weekly/:providerId')
  .get(
    checkAuth(USER_ROLES.CLIENT),
    validateRequest(AvailabilityValidation.getProviderAvailabilitySchema),
    AvailabilityController.getProviderAvailability,
  );

export const AvailabilityRoutes = router;
