import { Document, Model, Types } from 'mongoose';
import { GENDER_IDENTITY } from '../../../enums/user';
import { SESSION_FORMAT, SESSION_TYPE } from '../../../enums/appointment';
import { PAYMENT_METHOD } from '../../../enums/payment';

// ── Nested types ──────────────────────────────────────────────────────────────

type IEmergencyContact = {
  fullName:     string;
  phone:        string;
  relationship: string;
};

type IBillingAddress = {
  street:  string;
  city:    string;
  zipCode: string;
  country: string;
};

type IInsurance = {
  provider:       string;
  memberId:       string;
  groupNumber:    string;
  cardPhotoFront: string; // file path
  cardPhotoBack:  string; // file path
};

type ITherapyPreference = {
  therapistGender:   'male' | 'female' | 'other' | 'no_preference';
  therapyType:       'individual' | 'couple' | 'family' | 'group';
  sessionFormat:     SESSION_FORMAT;
  sessionFrequency:  'weekly' | 'bi_weekly' | 'monthly';
  preferredApproach: string;
};

type IMedicalHistory = {
  primaryPhysicianName:   string;
  physicianPhone:         string;
  currentMedications:     string;
  previousDiagnoses:      string;
  pastTherapyExperience:  string;
};

// ── Main interface ────────────────────────────────────────────────────────────

export type IClientProfile = {
  user:             Types.ObjectId;
  // Step 1 — Personal Info
  fullName:         string;
  email:            string;
  phone:            string;
  dateOfBirth:      Date;
  genderIdentity:   GENDER_IDENTITY;
  preferredLanguage: string;
  profilePhoto:     string;
  emergencyContact: IEmergencyContact;
  billingAddress:   IBillingAddress;
  // Step 2 — Therapy Preferences
  therapyPreference: ITherapyPreference;
  // Step 3 — Insurance & Payment
  insurance:        IInsurance;
  paymentMethod:    PAYMENT_METHOD;
  // Step 4 — Medical History
  medicalHistory:   IMedicalHistory;
  // Step 5 — Concerns & Goals
  reasonForTherapy: string;
  primaryGoal:      string;
  // Intake Progress
  intakeCompleted:  boolean;
  intakeStep:       number;
  // Platform Stats (denormalized)
  totalSessions:    number;
  totalSpent:       number;
  memberSince:      Date;
};

export type IClientProfileDocument = IClientProfile & Document;
export type IClientProfileModel    = Model<IClientProfileDocument>;
