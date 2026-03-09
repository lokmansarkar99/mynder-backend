import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StripeService } from './stripe.service';

// ⚠️ Webhook — NO catchAsync — needs raw error handling
const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const result    = await StripeService.handleWebhook(req.body, signature);
    res.status(StatusCodes.OK).json(result);
  } catch (error: any) {
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: error.message });
  }
};

const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await StripeService.getPaymentStatus(
    req.params.appointmentId as string,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Payment status retrieved',
    data:       result,
  });
});

const refundPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await StripeService.refundPayment(
    req.params.appointmentId as string,
    req.body.reason,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success:    true,
    message:    'Payment refunded successfully',
    data:       result,
  });
});

export const StripeController = {
  handleWebhook,
  getPaymentStatus,
  refundPayment,
};
