import { Schema, model } from 'mongoose';
import { IProviderProfileDocument, IProviderProfileModel } from './providerProfile.interface';
import { GENDER_IDENTITY } from '../../../enums/user';
import { SESSION_FORMAT } from '../../../enums/appointment';
import { APPLICATION_STATUS } from '../../../enums/payment';

const educationSchema = new Schema({
  degreeName:     { type: String },
  university:     { type: String },
  graduationYear: { type: Number },
}, { _id: false });

const employmentSchema = new Schema({
  employerName:    { type: String },
  jobTitle:        { type: String },
  startDate:       { type: Date },
  endDate:         { type: Date, default: null },
  responsibilities: { type: String },
  isCurrent:       { type: Boolean, default: false },
}, { _id: false });

const sessionFeeSchema = new Schema({
  duration: { type: Number }, // 15 | 30 | 60 | 90
  fee:      { type: Number },
}, { _id: false });

const providerProfileSchema = new Schema<IProviderProfileDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one-to-one
    },

    // ── Step 1 ──────────────────────────────────
    fullName:      { type: String },
    email:         { type: String },
    dateOfBirth:   { type: String },
    genderIdentity: { type: String, enum: Object.values(GENDER_IDENTITY) },
    licenseNumber: { type: String },
    licenseState:  { type: String },
    providerType:  {
      type: String,
      enum: ['clinical_psychologist','licensed_counselor','social_worker','psychiatrist','other'],
    },
    phone:             { type: String },
    officeAddress:     { type: String },
    city:              { type: String },
    profilePhoto:      { type: String, default: '' },
    professionalPhoto: { type: String, default: '' },
    professionalVideo: { type: String, default: '' }, // optional

    // ── Step 2 ──────────────────────────────────
    education:               { type: [educationSchema], default: [] },
    affiliations:            { type: String },
    additionalCertifications: { type: String },
    employment:              { type: [employmentSchema], default: [] },
    cvDocument:              { type: String, default: '' },
    licenseDocument:         { type: String, default: '' },

    // ── Step 3 ──────────────────────────────────
    therapeuticApproaches: { type: [String], default: [] },
    clientPopulations:     { type: [String], default: [] },
    sessionLengths:        { type: [Number], default: [] },
    sessionFormats:        { type: [String], enum: Object.values(SESSION_FORMAT), default: [] },
    sessionFees:           { type: [sessionFeeSchema], default: [] },

    // ── Admin Approval ───────────────────────────
    applicationStatus: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.PENDING,
    },
    applicationSubmittedAt: { type: Date, default: null },
    approvedAt:             { type: Date, default: null },
    rejectionReason:        { type: String, default: '' },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Ratings ──────────────────────────────────
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews:  { type: Number, default: 0 },
    isFeatured:    { type: Boolean, default: false },
    isTopProvider: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ProviderProfile = model<IProviderProfileDocument, IProviderProfileModel>(
  'ProviderProfile',
  providerProfileSchema
);
