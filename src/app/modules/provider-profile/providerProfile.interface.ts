import { Document, Model, Types } from 'mongoose';
import { GENDER_IDENTITY } from '../../../enums/user';
import { SESSION_FORMAT } from '../../../enums/appointment';
import { APPLICATION_STATUS } from '../../../enums/payment';

type IEducation = {
  degreeName:      string;
  university:      string;
  graduationYear:  number;
};

type IEmployment = {
  employerName:     string;
  jobTitle:         string;
  startDate:        Date;
  endDate:          Date | null;
  responsibilities: string;
  isCurrent:        boolean;
};

type ISessionFee = {
  duration: number;
  fee:      number;
};

export type IProviderProfile = {
  user:              Types.ObjectId;
  // Step 1
  fullName:          string;
  email:             string;
  dateOfBirth:       string;
  genderIdentity:    GENDER_IDENTITY;
  licenseNumber:     string;
  licenseState:      string;
  providerType:      'clinical_psychologist' | 'licensed_counselor' | 'social_worker' | 'psychiatrist' | 'other';
  phone:             string;
  officeAddress:     string;
  city:              string;
  profilePhoto:      string;
  professionalPhoto: string;
  professionalVideo: string;
  // Step 2
  education:                IEducation[];
  affiliations:             string;
  additionalCertifications: string;
  employment:               IEmployment[];
  cvDocument:               string;
  licenseDocument:          string;
  // Step 3
  therapeuticApproaches: string[];
  clientPopulations:     string[];
  sessionLengths:        number[];
  sessionFormats:        SESSION_FORMAT[];
  sessionFees:           ISessionFee[];
  //  Intake progress — was missing
  intakeStep:            number;
  // Admin Approval
  applicationStatus:       APPLICATION_STATUS;
  applicationSubmittedAt:  Date | null;
  approvedAt:              Date | null;
  rejectionReason:         string;
  reviewedBy:              Types.ObjectId | null;
  // Ratings
  averageRating:  number;
  totalReviews:   number;
  isFeatured:     boolean;
  isTopProvider:  boolean;
};

export type IProviderProfileDocument = IProviderProfile & Document;
export type IProviderProfileModel    = Model<IProviderProfileDocument>;
