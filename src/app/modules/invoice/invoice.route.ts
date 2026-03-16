import express from 'express';
import { checkAuth }         from '../../middlewares/checkAuth';
import { USER_ROLES }        from '../../../enums/user';
import { InvoiceController } from './invoice.controller';

const router = express.Router();

// GET /invoices/my-billing  — CLIENT
router.get(
  '/my-billing',
  checkAuth(USER_ROLES.CLIENT),
  InvoiceController.getMyBillingHistory,
);

export const InvoiceRoutes = router;
