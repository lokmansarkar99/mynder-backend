export enum APPOINTMENT_STATUS {
  UPCOMING  = 'upcoming',
  ONGOING   = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW   = 'no_show',
}

export enum SESSION_TYPE {
  INDIVIDUAL_THERAPY   = 'individual_therapy',
  COUPLES_SESSION      = 'couples_session',
  FAMILY_SESSION       = 'family_session',
  GROUP_SESSION        = 'group_session',
  INITIAL_CONSULTATION = 'initial_consultation',
  FOLLOW_UP            = 'follow_up',
  CBT_SESSION          = 'cbt_session',
}

export enum SESSION_FORMAT {
  ONLINE     = 'online',
  IN_PERSON  = 'in_person',
  HYBRID     = 'hybrid',
  PHONE_CALL = 'phone_call',
}

export enum CANCELLED_BY {
  CLIENT   = 'client',
  PROVIDER = 'provider',
  ADMIN    = 'admin',
}

export enum DAY_OF_WEEK {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}
