import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { ClientProfile } from './clientProfile.model';
import { QueryBuilder } from '../../buillder/queryBuilder';
import {
  TStep1Input,
  TStep2Input,
  TStep3Input,
  TStep4Input,
  TStep5Input,
  TIntakeStepInput,
  TProfileUpdateInput,
} from './clientProfile.validation';

// ─── Helper ───────────────────────────────────────────────────────────────────

const normalizePath = (p: string) => p.replace(/\\/g, '/');

// ─── Normalize req.files ──────────────────────────────────────────────────────
// Handles both multer .any() → File[]  and  .fields() → Record<string, File[]>
const normalizeFiles = (
  files:
    | Express.Multer.File[]
    | Record<string, Express.Multer.File[]>
    | undefined,
): Record<string, Express.Multer.File[]> => {
  if (!files) return {};

  // multer .any() returns an array
  if (Array.isArray(files)) {
    return files.reduce(
      (acc, file) => {
        if (!acc[file.fieldname]) acc[file.fieldname] = [];
        acc[file.fieldname].push(file);
        return acc;
      },
      {} as Record<string, Express.Multer.File[]>,
    );
  }

  // multer .fields() already returns the right shape
  return files;
};

// ─── Step Update Data Builder ─────────────────────────────────────────────────

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
      if (files.profilePhoto?.[0]) {
        update.profilePhoto = normalizePath(files.profilePhoto[0].path);
      }
      return update;
    }

    case 2: {
      const data = payload as TStep2Input;
      return { therapyPreference: data.therapyPreference };
    }

    case 3: {
      const data   = payload as TStep3Input;
      const update: Record<string, unknown> = {};
      // Dot-notation prevents wiping cardPhotoFront/Back on re-submit
      if (data.insurance?.provider    != null) update['insurance.provider']    = data.insurance.provider;
      if (data.insurance?.memberId    != null) update['insurance.memberId']    = data.insurance.memberId;
      if (data.insurance?.groupNumber != null) update['insurance.groupNumber'] = data.insurance.groupNumber;
      if (data.paymentMethod          != null) update.paymentMethod             = data.paymentMethod;
      if (files.insuranceCardFront?.[0]) {
        update['insurance.cardPhotoFront'] = normalizePath(files.insuranceCardFront[0].path);
      }
      if (files.insuranceCardBack?.[0]) {
        update['insurance.cardPhotoBack'] = normalizePath(files.insuranceCardBack[0].path);
      }
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
  const files     = normalizeFiles(rawFiles);
  const rawData   = buildStepUpdateData(step, payload, files);
  const cleanData = Object.fromEntries(
    Object.entries(rawData).filter(([, v]) => v !== undefined),
  );

  return await ClientProfile.findOneAndUpdate(
    { user: userId },
    {
      $set: cleanData,
      $max: { intakeStep: step },
    },
    {
      new:                 true,
      upsert:              true,
      runValidators:       true,
      setDefaultsOnInsert: true,
    },
  );
};

const getMyProfile = async (userId: string) => {
  const profile = await ClientProfile
    .findOne({ user: userId })
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
  const exists = await ClientProfile.exists({ user: userId });
  if (!exists) throw new ApiError(StatusCodes.NOT_FOUND, 'Client profile not found');

  const files      = normalizeFiles(rawFiles);
  const updateData: Record<string, unknown> = { ...payload };

  if (files.profilePhoto?.[0]) {
    updateData.profilePhoto = normalizePath(files.profilePhoto[0].path);
  }

  return await ClientProfile.findOneAndUpdate(
    { user: userId },
    { $set: updateData },
    { new: true, runValidators: true },
  ).populate('user', 'email role lastLogin');
};

const getClientById = async (clientId: string, requesterRole: string) => {
  const profile = await ClientProfile
    .findOne({ user: clientId })
    .populate('user', 'email role isEmailVerified isBlocked lastLogin createdAt');

  if (!profile) throw new ApiError(StatusCodes.NOT_FOUND, 'Client profile not found');

  if (requesterRole === 'provider') {
    // ✅ Fix: cast to unknown first, then to Record<string, unknown>
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
    .search(['fullName', 'email', 'phone'])
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
    { user: userId },
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
