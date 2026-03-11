import express          from 'express';
import { checkAuth }    from '../../middlewares/checkAuth';
import validateRequest  from '../../middlewares/validateRequest';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import { USER_ROLES }   from '../../../enums/user';
import { MessageController } from './message.controller';
import { MessageValidation } from './message.validation';

const router = express.Router();

const auth = checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN);

// ⚠️ ROUTE ORDER IS CRITICAL:
// /read-all/:conversationId  MUST be before  /:conversationId
// /pinned endpoint           MUST be before  /:id
// Otherwise Express matches "read-all" as a message :id param

// ── POST   /api/v1/message ────────────────────────────────────────────────────
router.post(
  '/',
  auth,
  fileUploadHandler(),
  validateRequest(MessageValidation.sendMessageSchema),
  MessageController.sendMessage,
);

// ── PATCH  /api/v1/message/read-all/:conversationId ──────────────────────────
// ⚠️ BEFORE /:id — "read-all" must not be caught as :id
router.patch(
  '/read-all/:conversationId',
  auth,
  validateRequest(MessageValidation.markAsReadSchema),
  MessageController.markAllAsRead,
);

// ── GET    /api/v1/message/:conversationId/pinned ─────────────────────────────
// ⚠️ BEFORE /:conversationId alone
router.get(
  '/:conversationId/pinned',
  auth,
  MessageController.getPinnedMessages,
);

// ── GET    /api/v1/message/:conversationId ────────────────────────────────────
router.get(
  '/:conversationId',
  auth,
  validateRequest(MessageValidation.getMessagesSchema),
  MessageController.getMessages,
);

// ── PATCH  /api/v1/message/:id/pin ────────────────────────────────────────────
router.patch(
  '/:id/pin',
  auth,
  validateRequest(MessageValidation.messageIdSchema),
  MessageController.togglePin,
);

// ── DELETE /api/v1/message/:id ────────────────────────────────────────────────
router.delete(
  '/:id',
  auth,
  validateRequest(MessageValidation.messageIdSchema),
  MessageController.deleteMessage,
);

export const MessageRoutes = router;
