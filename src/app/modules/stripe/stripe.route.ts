// import express         from "express";
// import { checkAuth }   from "../../middlewares/checkAuth";
// import { USER_ROLES }  from "../../../enums/user";
// import { StripeController } from "./stripe.controller";

// const router = express.Router();


// // ══════════════════════════════════════════════════
// // USER
// // ══════════════════════════════════════════════════

// // POST /api/v1/payment/create-checkout-session
// // Body: { "orderId": "..." }
// router.post(
//   "/create-checkout-session",
//   checkAuth(USER_ROLES.USER, USER_ROLES.ADMIN),
//   StripeController.createCheckoutSession
// );

// // GET /api/v1/payment/status/:orderId
// router.get(
//   "/status/:orderId",
//   checkAuth(USER_ROLES.USER, USER_ROLES.ADMIN),
//   StripeController.getPaymentStatus
// );

// // GET /api/v1/payment/verify-session?sessionId=cs_test_xxx
// // call after redirect from success page
// router.get(
//   "/verify-session",
//   checkAuth(USER_ROLES.USER, USER_ROLES.ADMIN),
//   StripeController.verifySession
// );

// // ══════════════════════════════════════════════════
// // ADMIN
// // ══════════════════════════════════════════════════

// // POST /api/v1/payment/refund/:orderId
// router.post(
//   "/refund/:orderId",
//   checkAuth(USER_ROLES.ADMIN),
//   StripeController.refundPayment
// );

// export const StripeRoutes = router;
