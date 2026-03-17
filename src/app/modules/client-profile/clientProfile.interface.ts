import { Document, Model, Types } from 'mongoose';
import { GENDER_IDENTITY } from '../../../enums/user';
import { SESSION_FORMAT } from '../../../enums/appointment';
import { PAYMENT_METHOD } from '../../../enums/payment';

// ─── Sub-document Types ───────────────────────────────────────────────────────

export type IEmergencyContact = {
  fullName:     string;
  phone:        string;
  relationship: string;
};

export type IBillingAddress = {
  street:  string;
  city:    string;
  zipCode: string;
  country: string;
};

export type IInsurance = {
  provider:       string;
  memberId:       string;
  groupNumber:    string;
  cardPhotoFront: string;
  cardPhotoBack:  string;
};

export type ITherapyPreference = {
  therapistGender:   'male' | 'female' | 'other' | 'no_preference';
  therapyType:       'individual' | 'couple' | 'family' | 'group';
  sessionFormat:     SESSION_FORMAT;
  sessionFrequency:  'weekly' | 'bi_weekly' | 'monthly';
  preferredApproach: string;
};

export type IMedicalHistory = {
  primaryPhysicianName:  string;
  physicianPhone:        string;
  currentMedications:    string;
  previousDiagnoses:     string;
  pastTherapyExperience: string;
};

// ─── Main Document Type ───────────────────────────────────────────────────────

export type IClientProfile = {
  user:              Types.ObjectId;
  fullName:          string;
  email:             string;
  phone:             string;
  dateOfBirth:       Date;
  genderIdentity:    GENDER_IDENTITY;
  preferredLanguage: string;
  profilePhoto:      string;
  emergencyContact:  IEmergencyContact;
  billingAddress:    IBillingAddress;
  therapyPreference: ITherapyPreference;
  insurance:         IInsurance;
  paymentMethod:     PAYMENT_METHOD;
  medicalHistory:    IMedicalHistory;
  reasonForTherapy:  string;
  primaryGoal:       string;
  intakeCompleted:   boolean;
  intakeStep:        number;
  totalSessions:     number;
  totalSpent:        number;
  memberSince:       Date;
  customFields: [ { fieldKey: string, fieldLabel:string, value: any } ]
};

export type IClientProfileDocument = IClientProfile & Document;
export type IClientProfileModel    = Model<IClientProfileDocument>;

