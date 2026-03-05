// import { Request, Response } from "express";
// import { StatusCodes }       from "http-status-codes";

// import catchAsync   from "../../../shared/catchAsync";
// import sendResponse from "../../../shared/sendResponse";
// import { StripeService } from "./stripe.service";

// // ── Create Checkout Session ────────────────────────
// const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
//   const { orderId } = req.body;
//   const userId      = req.user?.id;

//   const result = await StripeService.createCheckoutSession(orderId, userId);

//   sendResponse(res, {
//     success:    true,
//     message:    "Checkout session created successfully",
//     statusCode: StatusCodes.OK,
//     data:       result,
//     // data.sessionUrl → frontend এই URL-এ redirect করবে
//   });
// });

// // ── Stripe Webhook ─────────────────────────────────
// // ⚠️ need raw body , so dont use catchAsync here

// const handleWebhook = async (req: Request, res: Response) => {
//   try {
//     const signature = req.headers["stripe-signature"] as string;

//     // req.body raw buffer (express.raw middleware)
//     const result = await StripeService.handleWebhook(req.body, signature);

//     res.status(StatusCodes.OK).json(result);
//   } catch (error: any) {
//     console.error("Webhook error:", error.message);
//     res.status(StatusCodes.BAD_REQUEST).json({
//       success: false,
//       message: error.message,
//     });
//   }
//   // ⚠️  need raw body , so dont use catchAsync here
//   // না হলে Stripe বারবার retry করবে
// };

// // ── Get Payment Status ─────────────────────────────
// const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
//   const result = await StripeService.getPaymentStatus(
//     req.params.orderId as string,
//     req.user?.id
//   );

//   sendResponse(res, {
//     success:    true,
//     message:    "Payment status fetched successfully",
//     statusCode: StatusCodes.OK,
//     data:       result,
//   });
// });

// // ── Verify Session (success page) ─────────────────
// const verifySession = catchAsync(async (req: Request, res: Response) => {
//   const { sessionId } = req.query as { sessionId: string };

//   const result = await StripeService.verifySession(sessionId, req.user?.id);

//   sendResponse(res, {
//     success:    true,
//     message:    "Session verified successfully",
//     statusCode: StatusCodes.OK,
//     data:       result,
//   });
// });

// // ── Refund Payment (admin) ─────────────────────────
// const refundPayment = catchAsync(async (req: Request, res: Response) => {
//   const result = await StripeService.refundPayment(req.params.orderId  as string);

//   sendResponse(res, {
//     success:    true,
//     message:    result.message,
//     statusCode: StatusCodes.OK,
//     data:       result,
//   });
// });

// export const StripeController = {
//   createCheckoutSession,
//   handleWebhook,
//   getPaymentStatus,
//   verifySession,
//   refundPayment,
// };
