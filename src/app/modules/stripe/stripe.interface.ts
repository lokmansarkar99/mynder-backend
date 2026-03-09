// ── PaymentIntent create করার জন্য
export type TCreatePaymentIntentPayload = {
  slotId:          string;
  paymentMethodId: string;
  timezone?:       string;
  cardLast4?:      string;
  sessionType?:    string;  
};

// ── Webhook event types — আমরা যা handle করবো
export type TStripeWebhookEvent =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'charge.refunded';

// ── PaymentIntent metadata — webhook-এ ফিরে পাবো
// ✅ Fix: sessionType added
export type TPaymentIntentMetadata = {
  clientId:    string;
  slotId:      string;
  sessionFee:  string;
  sessionType: string;   // ✅ new
};


// ── Refund request
export type TRefundPayload = {
  appointmentId: string;
  reason?:       'duplicate' | 'fraudulent' | 'requested_by_customer';
};
