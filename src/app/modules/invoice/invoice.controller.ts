import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes }  from 'http-status-codes';
import { InvoiceService } from './invoice.service';

const getMyBillingHistory = catchAsync(async (req, res) => {
  const result = await InvoiceService.getMyBillingHistory(
    req.user.id,   // client's User._id from JWT
    req.query as Record<string, unknown>,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Billing history retrieved successfully',
    data:       result,
  });
});

export const InvoiceController = {
  getMyBillingHistory,
};
