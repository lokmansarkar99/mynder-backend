import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { ProviderProfile } from './providerProfile.model';
import { User } from '../user/user.model';
import { QueryBuilder } from '../../buillder/queryBuilder';
import { APPLICATION_STATUS } from '../../../enums/payment';
import unlinkFile from '../../../shared/unLinkFIle';
import { getSingleFilePath } from '../../../shared/getFilePath';
import {
  TStep1Input, TStep2Input, TStep3Input,
  TIntakeStepInput, TProfileUpdateInput, TAdminReviewInput,
} from './providerProfile.validation';

import { REFERENCE_MODEL, NOTIFICATION_TYPE } from '../../../enums/notification';

import sendNotification from '../../../shared/sendNotification';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeFiles = (
  files: Express.Multer.File[] | Record<string, Express.Multer.File[]> | undefined,
): Record<string, Express.Multer.File[]> => {
  if (!files) return {};
  if (Array.isArray(files)) {
    return files.reduce((acc, file) => {
      if (!acc[file.fieldname]) acc[file.fieldname] = [];
      acc[file.fieldname].push(file);
      return acc;
    }, {} as Record<string, Express.Multer.File[]>);
  }
  return files;
};

// profileImage Fix root cause — form-data arrays come as JSON strings
// Handles both: already-parsed array OR raw JSON string
const parseJsonArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T[]; } catch { return []; }
  }
  return [];
};

// ─── Step Data Builder ────────────────────────────────────────────────────────

const buildStepUpdateData = (
  step:    number,
  payload: TIntakeStepInput,
  files:   Record<string, Express.Multer.File[]>,
): Record<string, unknown> => {
  switch (step) {

    case 1: {
      const data   = payload as TStep1Input;
      const update: Record<string, unknown> = {
        fullName:       data.fullName,
        phone:          data.phone,
        dateOfBirth:    data.dateOfBirth,
        genderIdentity: data.genderIdentity,
        licenseNumber:  data.licenseNumber,
        licenseState:   data.licenseState,
        providerType:   data.providerType,
        officeAddress:  data.officeAddress ?? '',
        city:           data.city          ?? '',
      };
      const profileImgPath = getSingleFilePath(files, 'profileImage');
      const proPhotoPath   = getSingleFilePath(files, 'professionalPhoto');
      const proVideoPath   = getSingleFilePath(files, 'professionalVideo');
      if (profileImgPath) update.profilePhoto      = profileImgPath;
      if (proPhotoPath)   update.professionalPhoto = proPhotoPath;
      if (proVideoPath)   update.professionalVideo = proVideoPath;
      return update;
    }

    case 2: {
      const data   = payload as TStep2Input;
      const update: Record<string, unknown> = {};

      // profileImage parseJsonArray — handles string or array from form-data
      const education  = parseJsonArray<{
        degreeName: string;
        university: string;
        graduationYear: number ;
      }>(data.education);

      const employment = parseJsonArray<{
        employerName:     string;
        jobTitle:         string;
        startDate:        string;
        endDate:          string | null;
        responsibilities: string;
        isCurrent:        boolean;
      }>(data.employment);

      if (education.length) {
        update.education = education;
      }
      if (data.affiliations != null) {
        update.affiliations = data.affiliations;
      }
      if (data.additionalCertifications != null) {
        update.additionalCertifications = data.additionalCertifications;
      }
      if (employment.length) {
        // profileImage Convert date strings → Date objects
        update.employment = employment.map(e => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate:   e.endDate ? new Date(e.endDate) : null,
        }));
      }

      const cvPath      = getSingleFilePath(files, 'cvDocument');
      const licensePath = getSingleFilePath(files, 'licenseDocument');
      if (cvPath)      update.cvDocument      = cvPath;
      if (licensePath) update.licenseDocument = licensePath;
      return update;
    }

    case 3: {
      const data = payload as TStep3Input;

      // profileImage parseJsonArray for ALL array fields — same issue as employment
      const therapeuticApproaches = parseJsonArray<string>(data.therapeuticApproaches);
      const clientPopulations     = parseJsonArray<string>(data.clientPopulations);
      const sessionFormats        = parseJsonArray<string>(data.sessionFormats);
      const sessionLengths        = parseJsonArray<number>(data.sessionLengths);

      if (!therapeuticApproaches.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Select at least one therapeutic approach');
      }
      if (!clientPopulations.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Select at least one client population');
      }
      if (!sessionFormats.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Select at least one session format');
      }

      return {
        therapeuticApproaches,
        clientPopulations,
        sessionFormats,
        sessionLengths,
        applicationStatus:      APPLICATION_STATUS.PENDING,
        applicationSubmittedAt: new Date(),
      };
    }

    default:
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid step. Must be 1–3');
  }
};

// ─── Service Functions ────────────────────────────────────────────────────────

const saveIntakeStep = async (
  userId:   string,
  step:     number,
  payload:  TIntakeStepInput,
  rawFiles: Express.Multer.File[] | Record<string, Express.Multer.File[]> | undefined,
) => {
  const userObjectId = new Types.ObjectId(userId);
  const files        = normalizeFiles(rawFiles);

  // Fetch existing doc only for steps with file uploads (1 & 2)
  const existing = (step === 1 || step === 2)
    ? await ProviderProfile.findOne({ user: userObjectId })
    : null;

  // ── Delete old files before saving new ones ───────────────────────────────
  if (step === 1) {
    if (getSingleFilePath(files, 'profileImage')      && existing?.profilePhoto)      unlinkFile(existing.profilePhoto);
    if (getSingleFilePath(files, 'professionalPhoto') && existing?.professionalPhoto) unlinkFile(existing.professionalPhoto);
    if (getSingleFilePath(files, 'professionalVideo') && existing?.professionalVideo) unlinkFile(existing.professionalVideo);
  }
  if (step === 2) {
    if (getSingleFilePath(files, 'cvDocument')      && existing?.cvDocument)      unlinkFile(existing.cvDocument);
    if (getSingleFilePath(files, 'licenseDocument') && existing?.licenseDocument) unlinkFile(existing.licenseDocument);
  }

  const rawData   = buildStepUpdateData(step, payload, files);
  const cleanData = Object.fromEntries(
    Object.entries(rawData).filter(([, v]) => v !== undefined),
  );

  return await ProviderProfile.findOneAndUpdate(
    { user: userObjectId },
    {
      $set:         cleanData,
      $max:         { intakeStep: step },
      $setOnInsert: { user: userObjectId },
    },
    {
      returnDocument:      'after',
      upsert:              true,
      runValidators:       true,
      setDefaultsOnInsert: true,
    },
  );
};

const getMyProfile = async (userId: string) => {
  const profile = await ProviderProfile
    .findOne({ user: new Types.ObjectId(userId) })
    .populate('user', 'email role isEmailVerified lastLogin createdAt');

  if (!profile) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Provider profile not found. Please complete your intake form.',
    );
  }
  return profile;
};

const updateMyProfile = async (
  userId:   string,
  payload:  TProfileUpdateInput,
  rawFiles: Express.Multer.File[] | Record<string, Express.Multer.File[]> | undefined,
) => {
  const userObjectId = new Types.ObjectId(userId);

  const existing = await ProviderProfile.findOne({ user: userObjectId });
  if (!existing) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Provider profile not found. Please complete your intake form first.',
    );
  }

  const files      = normalizeFiles(rawFiles);
  const updateData: Record<string, unknown> = {};

  // Only include defined payload fields
  Object.entries(payload as Record<string, unknown>).forEach(([key, val]) => {
    if (val !== undefined) updateData[key] = val;
  });

  // profileImage Array fields from PATCH also need parseJsonArray
  if (payload.education) {
    updateData.education = parseJsonArray(payload.education);
  }
  if (payload.employment) {
    const employment = parseJsonArray<{
      employerName: string; jobTitle: string;
      startDate: string; endDate: string | null;
      responsibilities: string; isCurrent: boolean;
    }>(payload.employment);
    updateData.employment = employment.map(e => ({
      ...e,
      startDate: new Date(e.startDate),
      endDate:   e.endDate ? new Date(e.endDate) : null,
    }));
  }
  if (payload.therapeuticApproaches) {
    updateData.therapeuticApproaches = parseJsonArray(payload.therapeuticApproaches);
  }
  if (payload.clientPopulations) {
    updateData.clientPopulations = parseJsonArray(payload.clientPopulations);
  }
  if (payload.sessionFormats) {
    updateData.sessionFormats = parseJsonArray(payload.sessionFormats);
  }
  if (payload.sessionLengths) {
    updateData.sessionLengths = parseJsonArray(payload.sessionLengths);
  }

  // ── File updates with old file deletion ───────────────────────────────────
  const newProfileImg = getSingleFilePath(files, 'profileImage');
  const newProPhoto   = getSingleFilePath(files, 'professionalPhoto');
  const newProVideo   = getSingleFilePath(files, 'professionalVideo');
  const newCv         = getSingleFilePath(files, 'cvDocument');
  const newLicense    = getSingleFilePath(files, 'licenseDocument');

  if (newProfileImg) {
    if (existing.profilePhoto)      unlinkFile(existing.profilePhoto);
    updateData.profilePhoto = newProfileImg;
  }
  if (newProPhoto) {
    if (existing.professionalPhoto) unlinkFile(existing.professionalPhoto);
    updateData.professionalPhoto = newProPhoto;
  }
  if (newProVideo) {
    if (existing.professionalVideo) unlinkFile(existing.professionalVideo);
    updateData.professionalVideo = newProVideo;
  }
  if (newCv) {
    if (existing.cvDocument)        unlinkFile(existing.cvDocument);
    updateData.cvDocument = newCv;
  }
  if (newLicense) {
    if (existing.licenseDocument)   unlinkFile(existing.licenseDocument);
    updateData.licenseDocument = newLicense;
  }

  return await ProviderProfile.findOneAndUpdate(
    { user: userObjectId },
    { $set: updateData },
    { returnDocument: 'after', runValidators: true },
  ).populate('user', 'email role isEmailVerified lastLogin createdAt');
};

// ─── Public Endpoints ─────────────────────────────────────────────────────────

const getPublicProviders = async (query: Record<string, unknown>) => {
  const baseQuery = ProviderProfile.find({
    applicationStatus: APPLICATION_STATUS.APPROVED,
  })
    .populate('user', 'email isActive')
    .select('-cvDocument -licenseDocument -applicationSubmittedAt -reviewedBy -rejectionReason');

  const providerQuery = new QueryBuilder(baseQuery, query)
    .search(['fullName', 'city', 'providerType'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [data, meta] = await Promise.all([
    providerQuery.modelQuery,
    providerQuery.countTotal(),
  ]);

  return { data, meta };
};

const getPublicProviderById = async (providerId: string) => {
  const profile = await ProviderProfile
    .findOne({
      user:              new Types.ObjectId(providerId),
      applicationStatus: APPLICATION_STATUS.APPROVED,
    })
    .populate('user', 'email isActive')
    .select('-cvDocument -licenseDocument -applicationSubmittedAt -reviewedBy -rejectionReason');

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Provider not found');
  }
  return profile;
};

// ─── Admin Endpoints ──────────────────────────────────────────────────────────

const getAllProviders = async (query: Record<string, unknown>) => {
  const providerQuery = new QueryBuilder(
    ProviderProfile.find()
      .populate('user', 'email role isEmailVerified isBlocked lastLogin createdAt')
      .populate('reviewedBy', 'email'),
    query,
  )
    .search(['fullName', 'city', 'licenseNumber', 'providerType'])
    .filter()
    .dateRange()
    .sort()
    .paginate()
    .fields();

  const [data, meta] = await Promise.all([
    providerQuery.modelQuery,
    providerQuery.countTotal(),
  ]);

  return { data, meta };
};

const reviewApplication = async (
  providerId: string,
  adminId:    string,
  payload:    TAdminReviewInput,
) => {
  const profile = await ProviderProfile.findOne({
    user: new Types.ObjectId(providerId),
  });

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Provider profile not found');
  }

  if (profile.applicationStatus !== APPLICATION_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Application is already ${profile.applicationStatus}. Only pending applications can be reviewed.`,
    );
  }

  const isApprove = payload.action === 'approve';

  const updateData: Record<string, unknown> = {
    applicationStatus: isApprove ? APPLICATION_STATUS.APPROVED : APPLICATION_STATUS.REJECTED,
    reviewedBy:        new Types.ObjectId(adminId),
    rejectionReason:   isApprove ? '' : (payload.rejectionReason ?? ''),
    approvedAt:        isApprove ? new Date() : null,
  };

  const updatedProfile = await ProviderProfile.findOneAndUpdate(
    { user: new Types.ObjectId(providerId) },
    { $set: updateData },
    { returnDocument: 'after' },
  ).populate('user', 'email role');

  if (isApprove) {
    // ── Activate user account ────────────────────────────────────────────────
    await User.findByIdAndUpdate(
      new Types.ObjectId(providerId),
      { $set: { isActive: true } },
    );

    // ── F-5: Notify provider — PROVIDER_APPROVED ─────────────────────────────
    await sendNotification({
      recipientId:    providerId,
      type:           NOTIFICATION_TYPE.PROVIDER_APPROVED,
      title:          'Profile Approved! 🎉',
      body:           'Congratulations! Your provider profile has been approved. You can now set up your availability and start accepting bookings.',
      referenceId:    profile._id,
      referenceModel: REFERENCE_MODEL.PROVIDER_PAYOUT,   // closest ref — or add PROVIDER_PROFILE to enum
    });

  } else {
    // ── F-5: Notify provider — PROVIDER_REJECTED ─────────────────────────────
    await sendNotification({
      recipientId:    providerId,
      type:           NOTIFICATION_TYPE.PROVIDER_REJECTED,
      title:          'Profile Not Approved',
      body:           payload.rejectionReason
        ? `Your provider profile was not approved. Reason: ${payload.rejectionReason}`
        : 'Your provider profile was not approved. Please contact support for more information.',
      referenceId:    profile._id,
      referenceModel: REFERENCE_MODEL.PROVIDER_PAYOUT,
    });
  }

  return updatedProfile;
};


// ─── Internal — called from Review module ────────────────────────────────────

const updateRatingStats = async (
  userId:           string,
  newAverageRating: number,
  newTotalReviews:  number,
) => {
  const isTopProvider = newAverageRating >= 4.5 && newTotalReviews >= 10;

  await ProviderProfile.findOneAndUpdate(
    { user: new Types.ObjectId(userId) },
    {
      $set: {
        averageRating: newAverageRating,
        totalReviews:  newTotalReviews,
        isTopProvider,
      },
    },
  );
};

const getProviderById = async (providerId: string) => {
  const profile = await ProviderProfile
    .findOne({ user: new Types.ObjectId(providerId) })
    .populate('user', 'email role isEmailVerified isBlocked lastLogin createdAt')
    .populate('reviewedBy', 'email');

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Provider profile not found');
  }
  return profile;
};

export const ProviderProfileService = {
  saveIntakeStep,
  getMyProfile,
  updateMyProfile,
  getPublicProviders,
  getPublicProviderById,
  getAllProviders,
  reviewApplication,
  updateRatingStats,
  getProviderById
};
