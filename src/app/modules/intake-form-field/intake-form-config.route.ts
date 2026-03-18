import { Router }    from 'express';
import { checkAuth } from '../../middlewares/checkAuth';
import { USER_ROLES } from '../../../enums/user';
import { IntakeFormConfigController } from './intake-form-config.controller';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTE — No admin required
// CLIENT and PROVIDER call this to load their form fields
// GET /intake-form-config/public?formType=CLIENT
// GET /intake-form-config/public?formType=PROVIDER
// ═══════════════════════════════════════════════════════════════
router.get(
  '/public',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  IntakeFormConfigController.getPublicFormConfig,
);

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES — All routes below require ADMIN token
// ═══════════════════════════════════════════════════════════════
router.use(checkAuth(USER_ROLES.ADMIN));

// GET    /intake-form-config?formType=CLIENT   → all fields (incl. hidden)
router.get(
  '/',
  IntakeFormConfigController.getAdminFormConfig,
);

// POST   /intake-form-config                   → add custom field
router.post(
  '/',
  IntakeFormConfigController.addField,
);

// PATCH  /intake-form-config/reorder           → drag & drop reorder
// ⚠️ Must be BEFORE /:fieldId route — otherwise "reorder" matches :fieldId
router.patch(
  '/reorder',
  IntakeFormConfigController.reorderFields,
);

// PATCH  /intake-form-config/:fieldId          → edit field
router.patch(
  '/:fieldId',
  IntakeFormConfigController.updateField,
);

// PATCH  /intake-form-config/:fieldId/toggle   → show / hide field
router.patch(
  '/:fieldId/toggle',
  IntakeFormConfigController.toggleField,
);

// DELETE /intake-form-config/:fieldId          → delete custom field only
router.delete(
  '/:fieldId',
  IntakeFormConfigController.deleteField,
);

export const IntakeFormConfigRoutes = router;
