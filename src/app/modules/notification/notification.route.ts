import express        from 'express';
import { checkAuth }  from '../../middlewares/checkAuth';
import { USER_ROLES } from '../../../enums/user';
import { NotificationController } from './notification.controller';

const router = express.Router();

router.get(
  '/my',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  NotificationController.getMyNotifications,
);

router.get(
  '/unread-count',                                          // ← BEFORE /:id
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  NotificationController.getUnreadCount,
);

router.patch(
  '/read-all',                                              // ← BEFORE /:id
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  NotificationController.markAllAsRead,
);

router.patch(
  '/:id/read',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  NotificationController.markOneAsRead,
);

router.delete(
  '/:id',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  NotificationController.deleteOne,
);

export const NotificationRoutes = router;
