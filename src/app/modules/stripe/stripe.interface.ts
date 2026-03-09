
export type TCreatePaymentIntentPayload = {
  slotId:          string;
  paymentMethodId: string;
  timezone?:       string;
  cardLast4?:      string;
  sessionType?:    string;  
};


export type TStripeWebhookEvent =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'charge.refunded';



export type TPaymentIntentMetadata = {
  clientId:    string;
  slotId:      string;
  sessionFee:  string;
  sessionType: string;   
};


// ── Refund request
export type TRefundPayload = {
  appointmentId: string;
  reason?:       'duplicate' | 'fraudulent' | 'requested_by_customer';
};
