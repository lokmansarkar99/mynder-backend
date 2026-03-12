import { Request, Response, NextFunction } from 'express';
import express            from 'express';
import { checkAuth }      from '../../middlewares/checkAuth';
import validateRequest    from '../../middlewares/validateRequest';
import fileUploadHandler  from '../../middlewares/fileUploadHandler';
import { USER_ROLES }     from '../../../enums/user';
import { BlogController } from './blog.controller';
import { BlogValidation } from './blog.validation';

const router = express.Router();

const conditionalUpload = (
  req:  Request,
  res:  Response,
  next: NextFunction,
) => {
  const ct = req.headers['content-type'] ?? '';
  if (ct.includes('multipart/form-data')) {
    // fileUploadHandler() returns a middleware — invoke it correctly
    return fileUploadHandler()(req, res, next);
  }
  // Plain JSON / no body — skip multer entirely and continue
  next();
};


router
  .route('/admin')
  .post(
    checkAuth(USER_ROLES.ADMIN),
    conditionalUpload,
    validateRequest(BlogValidation.createBlogSchema),
    BlogController.createBlog,
  )
  .get(
    checkAuth(USER_ROLES.ADMIN),
    BlogController.getAllBlogsAdmin,
  );

router
  .route('/admin/:id')
  .get(
    checkAuth(USER_ROLES.ADMIN),
    validateRequest(BlogValidation.blogParamSchema),
    BlogController.getBlogById,
  )
  .patch(
    checkAuth(USER_ROLES.ADMIN),
    conditionalUpload,
    validateRequest(BlogValidation.updateBlogSchema),
    BlogController.updateBlog,
  )
  .delete(
    checkAuth(USER_ROLES.ADMIN),
    validateRequest(BlogValidation.blogParamSchema),
    BlogController.deleteBlog,
  );

// PATCH /api/v1/blog/admin/:id/status
router
  .route('/admin/:id/status')
  .patch(
    checkAuth(USER_ROLES.ADMIN),
    validateRequest(BlogValidation.changeStatusSchema),
    BlogController.changeStatus,
  );


router
  .route('/')
  .get(BlogController.getAllPublishedBlogs);


router
  .route('/:slug')
  .get(
    validateRequest(BlogValidation.slugParamSchema),
    BlogController.getBlogBySlug,
  );

export const BlogRoutes = router;