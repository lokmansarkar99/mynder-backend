import express, { NextFunction, Request, Response } from 'express';
import { checkAuth } from '../../middlewares/checkAuth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { ProviderProfileController } from './providerProfile.controller';
import { providerProfileValidation } from './providerProfile.validation';

const router = express.Router();

// ─── Dynamic step validator ───────────────────────────────────────────────────
const validateStep = (req: Request, res: Response, next: NextFunction) => {
  const step   = parseInt(req.params.step as string, 10);
  const schema = providerProfileValidation.stepMap[step];
  if (schema) return validateRequest(schema)(req, res, next);
  return next();
};

// ─── Intake Form (3 Steps) ────────────────────────────────────────────────────
// Steps 1 & 2 have file uploads. Step 3 is JSON only but fileUploadHandler
// is applied uniformly — handles gracefully when no file is sent.
router
  .route('/intake/step/:step')
  .post(checkAuth(USER_ROLES.PROVIDER), 
    fileUploadHandler(),
    validateStep,
    ProviderProfileController.saveIntakeStep,
  );

// ─── My Profile ───────────────────────────────────────────────────────────────
router
  .route('/profile')
  .get(
    checkAuth(USER_ROLES.PROVIDER),
    ProviderProfileController.getMyProfile,
  )
  .patch(
    checkAuth(USER_ROLES.PROVIDER),
    fileUploadHandler(),
    validateRequest(providerProfileValidation.profileUpdate),
    ProviderProfileController.updateMyProfile,
  );

// ─── Public — Find a Provider (Client access) ─────────────────────────────────
// ?searchTerm=john&city=NYC&providerType=clinical_psychologist
// ?therapeuticApproaches=CBT&sessionFormats=online&page=1&limit=10
router
  .route('/public')
  .get(
    checkAuth(USER_ROLES.CLIENT),
    ProviderProfileController.getPublicProviders,
  );

router
  .route('/public/:id')
  .get(
    checkAuth(USER_ROLES.CLIENT),
    ProviderProfileController.getPublicProviderById,
  );

// ─── Admin ────────────────────────────────────────────────────────────────────
// ?searchTerm=&applicationStatus=pending&page=1&limit=10
router
  .route('/admin/all')
  .get(
    checkAuth(USER_ROLES.ADMIN),
    ProviderProfileController.getAllProviders,
  );

// ─── Admin — Get Single Provider (Details Page) 
  router
  .route('/admin/:id')
  .get(
    checkAuth(USER_ROLES.ADMIN),
    ProviderProfileController.getProviderById,
  );

// PATCH body: { action: "approve" } or { action: "reject", rejectionReason: "..." }
router
  .route('/admin/:id/review')
  .patch(
    checkAuth(USER_ROLES.ADMIN),
    validateRequest(providerProfileValidation.adminReview),
    ProviderProfileController.reviewApplication,
  );

export const ProviderProfileRoutes = router;
