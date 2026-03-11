import express           from 'express';
import { checkAuth }     from '../../middlewares/checkAuth';
import { USER_ROLES }    from '../../../enums/user';
import { ConversationController } from './conversation.controller';

const router = express.Router();

// ── IMPORTANT: specific routes BEFORE param routes ───────────────────────────
// /all before /:id — otherwise "all" is treated as an :id param
router.get(
  '/all',
  checkAuth(USER_ROLES.ADMIN),
  ConversationController.getAllConversations,
);

router.get(
  '/my',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  ConversationController.getMyConversations,
);

router.post(
  '/start',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  ConversationController.startConversation,
);

router.get(
  '/:id',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  ConversationController.getSingleConversation,
);

export const ConversationRoutes = router;
