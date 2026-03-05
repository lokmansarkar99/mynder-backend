import { Schema, model } from 'mongoose';
import { IClientProfile, IClientProfileDocument, IClientProfileModel } from './clientProfile.interface';
import { GENDER_IDENTITY } from '../../../enums/user';
import { SESSION_FORMAT } from '../../../enums/appointment';
import { PAYMENT_METHOD } from '../../../enums/payment';

const emergencyContactSchema = new Schema({
  fullName:     { type: String },
  phone:        { type: String },
  relationship: { type: String },
}, { _id: false });

const billingAddressSchema = new Schema({
  street:  { type: String },
  city:    { type: String },
  zipCode: { type: String },
  country: { type: String },
}, { _id: false });

const insuranceSchema = new Schema({
  provider:       { type: String },
  memberId:       { type: String },
  groupNumber:    { type: String },
  cardPhotoFront: { type: String, default: '' },
  cardPhotoBack:  { type: String, default: '' },
}, { _id: false });

const therapyPreferenceSchema = new Schema({
  therapistGender:   { type: String, enum: ['male','female','other','no_preference'] },
  therapyType:       { type: String, enum: ['individual','couple','family','group'] },
  sessionFormat:     { type: String, enum: Object.values(SESSION_FORMAT) },
  sessionFrequency:  { type: String, enum: ['weekly','bi_weekly','monthly'] },
  preferredApproach: { type: String },
}, { _id: false });

const medicalHistorySchema = new Schema({
  primaryPhysicianName:  { type: String },
  physicianPhone:        { type: String },
  currentMedications:    { type: String },
  previousDiagnoses:     { type: String },
  pastTherapyExperience: { type: String },
}, { _id: false });

const clientProfileSchema = new Schema<IClientProfileDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one-to-one
    },

    // ── Step 1 ──────────────────────────────────
    fullName:          { type: String },
    email:             { type: String },
    phone:             { type: String },
    dateOfBirth:       { type: Date },
    genderIdentity:    { type: String, enum: Object.values(GENDER_IDENTITY) },
    preferredLanguage: { type: String, default: 'English' },
    profilePhoto:      { type: String, default: '' },
    emergencyContact:  { type: emergencyContactSchema, default: {} },
    billingAddress:    { type: billingAddressSchema, default: {} },

    // ── Step 2 ──────────────────────────────────
    therapyPreference: { type: therapyPreferenceSchema, default: {} },

    // ── Step 3 ──────────────────────────────────
    insurance: { type: insuranceSchema, default: {} },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
    },

    // ── Step 4 ──────────────────────────────────
    medicalHistory: { type: medicalHistorySchema, default: {} },

    // ── Step 5 ──────────────────────────────────
    reasonForTherapy: { type: String },
    primaryGoal:      { type: String },

    // ── Intake Progress ──────────────────────────
    intakeCompleted: { type: Boolean, default: false },
    intakeStep:      { type: Number, default: 1, min: 1, max: 5 },

    // ── Platform Stats ───────────────────────────
    totalSessions: { type: Number, default: 0 },
    totalSpent:    { type: Number, default: 0 },
    memberSince:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const ClientProfile = model<IClientProfileDocument, IClientProfileModel>(
  'ClientProfile',
  clientProfileSchema
);
