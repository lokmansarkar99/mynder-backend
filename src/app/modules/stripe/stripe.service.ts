// import Stripe from "stripe";
// import stripe from "../../../config/stripe.config";
// import { StatusCodes } from "http-status-codes";
// import config      from "../../../config";
// import ApiError    from "../../../errors/ApiErrors";
// import { Order }   from "../order/order.model";
// import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "../../../enums/oder";


// // =====================================================
// // CREATE CHECKOUT SESSION
// // User order place this  function call 
// // Stripe-hosted payment page redirect 
// // =====================================================
// const createCheckoutSession = async (orderId: string, userId: string) => {
//   // ① Order exist + ownership check
//   const order = await Order.findOne({
//     _id:       orderId,
//     user:      userId,
//     isDeleted: false,
//   }).populate("items.product", "name thumbnail");

//   if (!order) {
//     throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
//   }

//   //  stripe payment order-এ checkout session 
//   if (order.paymentMethod !== PAYMENT_METHOD.STRIPE) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       "This order uses Cash on Delivery, not Stripe"
//     );
//   }

//   //  Already paid check
//   if (order.paymentStatus === PAYMENT_STATUS.PAID) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "This order is already paid");
//   }

//   //  Stripe line_items — each order item
//   const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
//     order.items.map((item) => ({
//       price_data: {
//         currency:     "usd",
//         product_data: {
//           name:   item.name,
//           images: `${config.client_url}/uploads${item.thumbnail}` ? [
//             // full URL  — relative path  Stripe cant show
//             `${config.client_url}/uploads${item.thumbnail}`,
//           ] : [],
//         },
//         unit_amount: Math.round(item.price * 100), // dollar → cents
//       },
//       quantity: item.quantity,
//     }));

//   // ⑤ Shipping charge line item (যদি থাকে)
//   if (order.shippingCharge > 0) {
//     lineItems.push({
//       price_data: {
//         currency:     "usd",
//         product_data: { name: "Shipping Charge" },
//         unit_amount:  Math.round(order.shippingCharge * 100),
//       },
//       quantity: 1,
//     });
//   }

//   // ⑥ Stripe Checkout Session তৈরি করো
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ["card"],
//     mode:                 "payment",
//     line_items:           lineItems,

//     // ── metadata — webhook-এ orderId ফিরে পেতে ───
//     metadata: {
//       orderId: orderId,
//       userId:  userId,
//     },

//     // ── redirect URLs ─────────────────────────────
//     success_url: `${config.stripe.success_url}?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
//     cancel_url:  `${config.stripe.cancel_url}?orderId=${orderId}`,

//     // ── customer info pre-fill ────────────────────
//     customer_email: undefined, // optional: user email দিতে পারো
//   });

//   // ⑦ Session ID order-এ save করো (track করার জন্য)
//   await Order.findByIdAndUpdate(orderId, {
//     $set: { stripePaymentIntentId: session.id },
//   });

//   return {
//     sessionId:  session.id,
//     sessionUrl: session.url,  // এই URL-এ frontend redirect করবে
//   };
// };

// // =====================================================
// // HANDLE STRIPE WEBHOOK
// // Stripe → POST /api/v1/payment/webhook
// // =====================================================
// const handleWebhook = async (
//   rawBody: Buffer,
//   signature: string
// ) => {
//   let event: Stripe.Event;

//   // ① Signature verify — fake request reject 
//   try {
//     event = stripe.webhooks.constructEvent(
//       rawBody,
//       signature,
//       config.stripe.webhook_secret as string
//     );
//   } catch (err: any) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       `Webhook signature verification failed: ${err.message}`
//     );
//   }

//   // ② Event type handle
//   switch (event.type) {

//     // StripeController Payment successful
//     case "checkout.session.completed": {
//       const session = event.data.object as Stripe.Checkout.Session;

//       if (session.payment_status === "paid") {
//         const orderId = session.metadata?.orderId;

//         if (orderId) {
//           await Order.findByIdAndUpdate(orderId, {
//             $set: {
//               paymentStatus:         PAYMENT_STATUS.PAID,
//               status:                ORDER_STATUS.PAID,
//               stripePaymentIntentId: session.payment_intent as string,
//             },
//           });
//           console.log(`StripeController Order ${orderId} marked as PAID`);
//         }
//       }
//       break;
//     }

//     //  Payment failed
//     case "payment_intent.payment_failed": {
//       const paymentIntent = event.data.object as Stripe.PaymentIntent;
//       const orderId       = paymentIntent.metadata?.orderId;

//       if (orderId) {
//         await Order.findByIdAndUpdate(orderId, {
//           $set: { paymentStatus: PAYMENT_STATUS.FAILED },
//         });
//         console.log(`❌ Order ${orderId} payment FAILED`);
//       }
//       break;
//     }

//     //  Refund
//     case "charge.refunded": {
//       const charge  = event.data.object as Stripe.Charge;
//       const session = await stripe.checkout.sessions.list({
//         payment_intent: charge.payment_intent as string,
//         limit: 1,
//       });

//       const orderId = session.data[0]?.metadata?.orderId;
//       if (orderId) {
//         await Order.findByIdAndUpdate(orderId, {
//           $set: {
//             paymentStatus: PAYMENT_STATUS.REFUNDED,
//             status:        ORDER_STATUS.REFUNDED,
//           },
//         });
//         console.log(` Order ${orderId} REFUNDED`);
//       }
//       break;
//     }

//     default:
//       console.log(`Unhandled Stripe event: ${event.type}`);
//   }

//   return { received: true };
// };

// // =====================================================
// // GET PAYMENT STATUS
// // Order-এর payment status check
// // =====================================================
// const getPaymentStatus = async (orderId: string, userId: string) => {
//   const order = await Order.findOne({
//     _id:       orderId,
//     user:      userId,
//     isDeleted: false,
//   })
//     .select("status paymentStatus paymentMethod stripePaymentIntentId total createdAt")
//     .lean();

//   if (!order) {
//     throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
//   }

//   return order;
// };

// // =====================================================
// // VERIFY SESSION (success page-এ redirect হওয়ার পর)
// // Frontend success page-এ session verify করতে
// // =====================================================
// const verifySession = async (sessionId: string, userId: string) => {
//   const session = await stripe.checkout.sessions.retrieve(sessionId);

//   if (!session) {
//     throw new ApiError(StatusCodes.NOT_FOUND, "Stripe session not found");
//   }

//   const orderId = session.metadata?.orderId;

//   if (!orderId) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid session");
//   }

//   const order = await Order.findOne({
//     _id:       orderId,
//     user:      userId,
//     isDeleted: false,
//   })
//     .populate("items.product", "name thumbnail price")
//     .lean();

//   if (!order) {
//     throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
//   }

//   return {
//     session: {
//       id:             session.id,
//       paymentStatus:  session.payment_status,
//       amountTotal:    session.amount_total ? session.amount_total / 100 : 0,
//       currency:       session.currency,
//     },
//     order,
//   };
// };

// // =====================================================
// // ADMIN: REFUND PAYMENT
// // =====================================================
// const refundPayment = async (orderId: string) => {
//   const order = await Order.findById(orderId);

//   if (!order) {
//     throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
//   }

//   if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       "Only paid orders can be refunded"
//     );
//   }

//   if (!order.stripePaymentIntentId) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       "No payment intent found for this order"
//     );
//   }

//   // Stripe- refund 
//   const refund = await stripe.refunds.create({
//     payment_intent: order.stripePaymentIntentId,
//     //if amount partial refund — else full refund
//   });

//   // Order update — webhook- handle , update after webhook event 
//    await Order.findByIdAndUpdate(orderId, {
//     $set: {
//       paymentStatus: PAYMENT_STATUS.REFUNDED,
//       status:        ORDER_STATUS.REFUNDED,
//     },
//   });

//   return {
//     message:  "Refund initiated successfully",
//     refundId: refund.id,
//     status:   refund.status,
//     amount:   refund.amount / 100,
//   };
// };

// export const StripeService = {
//   createCheckoutSession,
//   handleWebhook,
//   getPaymentStatus,
//   verifySession,
//   refundPayment,
// };
