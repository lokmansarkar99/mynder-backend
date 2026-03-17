import { Router }                from 'express';
import { checkAuth } from '../../middlewares/checkAuth';
import validateRequest           from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { FormLibraryController } from './form-library.controller';
import { createFormSchema, updateFormSchema } from './form-library.validation';

const router = Router();

// All routes — Provider only
router.use(checkAuth(USER_ROLES.PROVIDER));



router
  .route('/')
  .get(FormLibraryController.getAllForms)
  .post(
    validateRequest(createFormSchema),
    FormLibraryController.createForm,
  );

router.patch(
  '/reorder',
  FormLibraryController.reorderForms,
);

router
  .route('/:formId')
  .get(FormLibraryController.getFormById)
  .patch(
    validateRequest(updateFormSchema),
    FormLibraryController.updateForm,
  )
  .delete(FormLibraryController.deleteForm);

export const FormLibraryRoutes = router;
