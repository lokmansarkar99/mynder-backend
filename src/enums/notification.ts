export enum NOTIFICATION_TYPE {
  SESSION_REMINDER  = 'session_reminder',
  SESSION_SUMMARY   = 'session_summary',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  NEW_MESSAGE       = 'new_message',
  PAYOUT_PROCESSED  = 'payout_processed',
  PAYOUT_FAILED     = 'payout_failed',
  PROVIDER_APPROVED = 'provider_approved',
  PROVIDER_REJECTED = 'provider_rejected',
  NEW_CLIENT_MATCH  = 'new_client_match',
  SYSTEM            = 'system',
}

export enum REFERENCE_MODEL {
  APPOINTMENT    = 'Appointment',
  MESSAGE        = 'Message',
  INVOICE        = 'Invoice',
  PROVIDER_PAYOUT = 'ProviderPayout',
   PROVIDER_PROFILE = 'ProviderProfile',
}
