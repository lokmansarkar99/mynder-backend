import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { ClientProfile } from './clientProfile.model';
import { QueryBuilder } from '../../buillder/queryBuilder';
import {
  TStep1Input, TStep2Input, TStep3Input,
  TStep4Input, TStep5Input,
  TIntakeStepInput, TProfileUpdateInput,
} from './clientProfile.validation';
// profileImage Use project helpers — no more custom normalizePath
import unlinkFile from '../../../shared/unLinkFIle';
import { getSingleFilePath } from '../../../shared/getFilePath';

// ─── Normalize req.files (array → Record for .any() safety) ──────────────────
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
        fullName:          data.fullName,
        phone:             data.phone,
        dateOfBirth:       new Date(data.dateOfBirth),
        genderIdentity:    data.genderIdentity,
        preferredLanguage: data.preferredLanguage ?? 'English',
        emergencyContact:  data.emergencyContact  ?? {},
        billingAddress:    data.billingAddress    ?? {},
      };
      // profileImage multer field = 'profileImage', DB field = 'profilePhoto' (was a bug before)
      const profileImgPath = getSingleFilePath(files, 'profileImage');
      if (profileImgPath) update.profilePhoto = profileImgPath;
      return update;
    }

    case 2: {
      const data = payload as TStep2Input;
      return { therapyPreference: data.therapyPreference };
    }

    case 3: {
      const data   = payload as TStep3Input;
      const update: Record<string, unknown> = {};
      if (data.insurance?.provider    != null) update['insurance.provider']    = data.insurance.provider;
      if (data.insurance?.memberId    != null) update['insurance.memberId']    = data.insurance.memberId;
      if (data.insurance?.groupNumber != null) update['insurance.groupNumber'] = data.insurance.groupNumber;
      if (data.paymentMethod          != null) update.paymentMethod            = data.paymentMethod;
      // profileImage getSingleFilePath returns "/{folder}/{filename}" directly
      const cardFrontPath = getSingleFilePath(files, 'insuranceCardFront');
      const cardBackPath  = getSingleFilePath(files, 'insuranceCardBack');
      if (cardFrontPath) update['insurance.cardPhotoFront'] = cardFrontPath;
      if (cardBackPath)  update['insurance.cardPhotoBack']  = cardBackPath;
      return update;
    }

    case 4: {
      const data = payload as TStep4Input;
      return { medicalHistory: data.medicalHistory };
    }

    case 5: {
      const data = payload as TStep5Input;
      return {
        reasonForTherapy: data.reasonForTherapy,
        primaryGoal:      data.primaryGoal,
        intakeCompleted:  true,
      };
    }

    default:
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid step. Must be 1–5');
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

  // profileImage Fetch existing doc only for steps that have file uploads (1 & 3)
  const existing = (step === 1 || step === 3)
    ? await ClientProfile.findOne({ user: userObjectId })
    : null;

  // profileImage Delete old files BEFORE saving new ones
  if (step === 1 && getSingleFilePath(files, 'profileImage')) {
    if (existing?.profilePhoto) unlinkFile(existing.profilePhoto);
  }
  if (step === 3) {
    if (getSingleFilePath(files, 'insuranceCardFront') && existing?.insurance?.cardPhotoFront) {
      unlinkFile(existing.insurance.cardPhotoFront);
    }
    if (getSingleFilePath(files, 'insuranceCardBack') && existing?.insurance?.cardPhotoBack) {
      unlinkFile(existing.insurance.cardPhotoBack);
    }
  }

  const rawData   = buildStepUpdateData(step, payload, files);
  const cleanData = Object.fromEntries(
    Object.entries(rawData).filter(([, v]) => v !== undefined),
  );

  return await ClientProfile.findOneAndUpdate(
    { user: userObjectId },
    {
      $set:         cleanData,
      $max:         { intakeStep: step },
      $setOnInsert: { user: userObjectId }, // profileImage upsert-এ user field নিশ্চিত করে
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
  const profile = await ClientProfile
    .findOne({ user: new Types.ObjectId(userId) })
    .populate('user', 'email role isEmailVerified lastLogin createdAt');

  if (!profile) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Profile not found. Please complete your intake form.',
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

  // profileImage findOne instead of exists() — same query, gives us data for old file deletion
  const existing = await ClientProfile.findOne({ user: userObjectId });
  if (!existing) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Client profile not found. Please complete your intake form first.',
    );
  }

  const files      = normalizeFiles(rawFiles);
  const updateData: Record<string, unknown> = {};

  // Only include defined payload fields
  Object.entries(payload as Record<string, unknown>).forEach(([key, val]) => {
    if (val !== undefined) updateData[key] = val;
  });

  // ── Profile photo ──────────────────────────────────────────────────────────
  const newProfileImg = getSingleFilePath(files, 'profileImage');
  if (newProfileImg) {
    if (existing.profilePhoto) unlinkFile(existing.profilePhoto); // profileImage delete old
    updateData.profilePhoto = newProfileImg;                      // profileImage correct DB field
  }

  // ── Insurance card front ───────────────────────────────────────────────────
  const newCardFront = getSingleFilePath(files, 'insuranceCardFront');
  if (newCardFront) {
    if (existing.insurance?.cardPhotoFront) unlinkFile(existing.insurance.cardPhotoFront);
    updateData['insurance.cardPhotoFront'] = newCardFront;
  }

  // ── Insurance card back ────────────────────────────────────────────────────
  const newCardBack = getSingleFilePath(files, 'insuranceCardBack');
  if (newCardBack) {
    if (existing.insurance?.cardPhotoBack) unlinkFile(existing.insurance.cardPhotoBack);
    updateData['insurance.cardPhotoBack'] = newCardBack;
  }

  return await ClientProfile.findOneAndUpdate(
    { user: userObjectId },
    { $set: updateData },
    { returnDocument: 'after', runValidators: true },
  ).populate('user', 'email role isEmailVerified lastLogin createdAt');
};

const getClientById = async (clientId: string, requesterRole: string) => {
  const profile = await ClientProfile
    .findOne({ user: new Types.ObjectId(clientId) })
    .populate('user', 'email role isEmailVerified isBlocked lastLogin createdAt');

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Client profile not found');
  }

  if (requesterRole === 'PROVIDER' || requesterRole === 'provider') {
    const safe = profile.toObject() as unknown as Record<string, unknown>;
    delete safe.insurance;
    delete safe.billingAddress;
    delete safe.paymentMethod;
    delete safe.medicalHistory;
    return safe;
  }

  return profile;
};

const getAllClients = async (query: Record<string, unknown>) => {
  const clientQuery = new QueryBuilder(
    ClientProfile.find().populate(
      'user',
      'email role isEmailVerified isBlocked lastLogin createdAt',
    ),
    query,
  )
    .search(['fullName', 'phone'])
    .filter()
    .dateRange()
    .sort()
    .paginate()
    .fields();

  const [data, meta] = await Promise.all([
    clientQuery.modelQuery,
    clientQuery.countTotal(),
  ]);

  return { data, meta };
};

const incrementSessionStats = async (userId: string, sessionFee: number) => {
  await ClientProfile.findOneAndUpdate(
    { user: new Types.ObjectId(userId) },
    { $inc: { totalSessions: 1, totalSpent: sessionFee } },
  );
};

export const ClientProfileService = {
  saveIntakeStep,
  getMyProfile,
  updateMyProfile,
  getClientById,
  getAllClients,
  incrementSessionStats,
};
