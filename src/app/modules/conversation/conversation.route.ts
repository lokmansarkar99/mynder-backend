import express         from 'express';
import { checkAuth }   from '../../middlewares/checkAuth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES }  from '../../../enums/user';
import { ConversationController } from './conversation.controller';
import { ConversationValidation } from './conversation.validation';

const router = express.Router();

// Auth allowed for all 3 roles — CLIENT, PROVIDER, ADMIN can all chat
const auth = checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN);

// ── POST /api/v1/conversation/start ──────────────────────────────────────────
// Start a new conversation OR return existing one (idempotent)
router.post(
  '/start',
  auth,
  validateRequest(ConversationValidation.startConversationSchema),
  ConversationController.startConversation,
);

// ── GET /api/v1/conversation/my ───────────────────────────────────────────────
// ⚠️ MUST be before /:id — otherwise "my" would match as :id param
router.get(
  '/my',
  auth,
  ConversationController.getMyConversations,
);

// ── GET /api/v1/conversation/:id ──────────────────────────────────────────────
router.get(
  '/:id',
  auth,
  validateRequest(ConversationValidation.getConversationParamsSchema),
  ConversationController.getSingleConversation,
);

export const ConversationRoutes = router;
