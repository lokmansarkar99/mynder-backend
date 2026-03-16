import express            from 'express';
import { checkAuth }       from '../../middlewares/checkAuth';

import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES }      from '../../../enums/user';
import { ReviewController } from './review.controller';
import { ReviewValidation } from './review.validation';

const router = express.Router();

router
  .route('/provider/:providerId')
  .get(
    validateRequest(ReviewValidation.providerIdParamSchema),
    ReviewController.getProviderReviews,
  );

router
  .route('/')
  .post(
    checkAuth(USER_ROLES.CLIENT),
    validateRequest(ReviewValidation.createReviewSchema),
    ReviewController.createReview,
  );


router
  .route('/my')
  .get(
    checkAuth(USER_ROLES.CLIENT),
    ReviewController.getMyReviews,
  );

router
  .route('/admin')
  .get(
    checkAuth(USER_ROLES.ADMIN),
    ReviewController.getAllReviews,
  );


router
  .route('/public')
  .get(
    ReviewController.getAllReviews,
  );

router
  .route('/:id/publish')
  .patch(
    checkAuth(USER_ROLES.ADMIN),
    validateRequest(ReviewValidation.reviewParamSchema),
    ReviewController.togglePublish,
  );

export const ReviewRoutes = router;
