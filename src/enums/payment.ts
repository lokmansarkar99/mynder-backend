export enum PAYMENT_STATUS {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  FAILED    = 'failed',
  REFUNDED  = 'refunded',
}

export enum PAYMENT_METHOD {
  CREDIT_CARD = 'credit_card',
  PAYPAL      = 'paypal',
  INSURANCE   = 'insurance',
}

export enum PAYOUT_STATUS {
  PENDING = 'pending',
  PAID    = 'paid',
  FAILED  = 'failed',
}

export enum CLAIM_STATUS {
  SUBMITTED  = 'submitted',
  PROCESSING = 'processing',
  APPROVED   = 'approved',
  DENIED     = 'denied',
}

export enum APPLICATION_STATUS {
  PENDING      = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED     = 'approved',
  REJECTED     = 'rejected',
}
