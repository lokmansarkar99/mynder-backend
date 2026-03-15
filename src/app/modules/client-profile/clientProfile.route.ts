import express, { NextFunction, Request, Response } from 'express';
import { checkAuth } from '../../middlewares/checkAuth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { ClientProfileController } from './clientProfile.controller';
import { clientProfileValidation } from './clientProfile.validation';

const router = express.Router();

// ─── Dynamic step validator middleware ────────────────────────────────────────

const validateStep = (req: Request, res: Response, next: NextFunction) => {
  const step   = parseInt(req.params.step as string, 10);
  const schema = clientProfileValidation.stepMap[step];
  if (schema) return validateRequest(schema)(req, res, next);
  return next();
};

// ================= INTAKE FORM (5 STEPS) =================
// Steps 1 & 3 have file uploads — fileUploadHandler handles all steps uniformly
router
  .route('/intake/step/:step')
  .post(
    checkAuth(USER_ROLES.CLIENT),
    fileUploadHandler(),
    validateStep,
    ClientProfileController.saveIntakeStep,
  );

// ================= MY PROFILE =================
router
  .route('/profile')
  .get(
    checkAuth(USER_ROLES.CLIENT),
    ClientProfileController.getMyProfile,
  )
  .patch(
    checkAuth(USER_ROLES.CLIENT),
    fileUploadHandler(),
    validateRequest(clientProfileValidation.profileUpdate),
    ClientProfileController.updateMyProfile,
  );

// ================= SINGLE CLIENT PROFILE (Provider / Admin) =================
router
  .route('/profile/:id')
  .get(
    checkAuth(USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
    ClientProfileController.getClientById,
  );

// ================= ALL CLIENTS (Admin) =================
// ?searchTerm=john&page=1&limit=10&sort=-createdAt&intakeCompleted=true&dateRange=monthly
router
  .route('/all')
  .get(
    checkAuth(USER_ROLES.PROVIDER,  USER_ROLES.ADMIN),
    ClientProfileController.getAllClients,
  );

export const ClientProfileRoutes = router;
