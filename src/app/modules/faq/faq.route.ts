import express            from 'express';
import { checkAuth }       from '../../middlewares/checkAuth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES }      from '../../../enums/user';
import { FAQController }   from './faq.controller';
import { FAQValidation }   from './faq.validation';

const router = express.Router();


router
  .route('/')
  .get(FAQController.getAllPublishedFAQs);

router
  .route('/admin')
  .post(
    checkAuth(USER_ROLES.ADMIN),
    validateRequest(FAQValidation.createFAQSchema),
    FAQController.createFAQ,
  )
 
  .get(
    checkAuth(USER_ROLES.ADMIN),
    FAQController.getAllFAQsAdmin,
  );



router
  .route('/:id')
  .get(
    validateRequest(FAQValidation.faqParamSchema),
    FAQController.getSingleFAQ,
  );

router
  .route('/admin/:id')
  .patch(
    checkAuth(USER_ROLES.ADMIN),
    validateRequest(FAQValidation.updateFAQSchema),
    FAQController.updateFAQ,
  )
  .delete(
    checkAuth(USER_ROLES.ADMIN),
    validateRequest(FAQValidation.faqParamSchema),
    FAQController.deleteFAQ,
  );

router
  .route('/admin/:id/toggle-publish')
  .patch(
    checkAuth(USER_ROLES.ADMIN),
    validateRequest(FAQValidation.togglePublishSchema),
    FAQController.togglePublish,
  );

export const FAQRoutes = router;
