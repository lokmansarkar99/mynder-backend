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

import { Invoice }         from '../invoice/invoice.model';
import { Appointment }     from '../appointment/appointment.model';
import { ProviderProfile } from '../provider-profile/providerProfile.model';


import { ClinicalNote }    from '../clinical-note/clinicalNote.model';

import { APPOINTMENT_STATUS } from '../../../enums/appointment';
import { USER_ROLES }      from '../../../enums/user';

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


// ─── Merge incoming customFields into existing array ─────────────────────────
// Incoming: [{ fieldKey, fieldLabel, value }]
// If fieldKey already exists → update value
// If new fieldKey → push new entry
const mergeCustomFields = (
  existing: { fieldKey: string; fieldLabel: string; value: any }[],
  incoming: { fieldKey: string; fieldLabel?: string; value: any }[],
): { fieldKey: string; fieldLabel: string; value: any }[] => {
  const merged = [...existing];

  incoming.forEach((item) => {
    const idx = merged.findIndex((f) => f.fieldKey === item.fieldKey);
    if (idx > -1) {
      merged[idx].value      = item.value;
      merged[idx].fieldLabel = item.fieldLabel ?? merged[idx].fieldLabel;
    } else {
      merged.push({
        fieldKey:   item.fieldKey,
        fieldLabel: item.fieldLabel ?? '',
        value:      item.value,
      });
    }
  });

  return merged;
};


const saveIntakeStep = async (
  userId:   string,
  step:     number,
  payload:  TIntakeStepInput,
  rawFiles: Express.Multer.File[] | Record<string, Express.Multer.File[]> | undefined,
) => {
  const userObjectId = new Types.ObjectId(userId);
  const files        = normalizeFiles(rawFiles);

  // ── Extract customFields BEFORE passing payload to buildStepUpdateData ──────
  const { customFields: incomingCustom, ...corePayload } = payload as any;

  // ── Fetch existing doc — needed for file steps AND custom fields ──────────
  const needsExisting = step === 1 || step === 3 || (incomingCustom?.length > 0);
  const existing = needsExisting
    ? await ClientProfile.findOne({ user: userObjectId }).lean()
    : null;

  // ── Delete old files BEFORE saving new ones (unchanged) ──────────────────
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

  // ── Build core step data (unchanged logic) ────────────────────────────────
  const rawData   = buildStepUpdateData(step, corePayload as TIntakeStepInput, files);
  const cleanData = Object.fromEntries(
    Object.entries(rawData).filter(([, v]) => v !== undefined),
  );

  // ── Merge customFields if any sent ────────────────────────────────────────
  if (Array.isArray(incomingCustom) && incomingCustom.length > 0) {
    const existingCustom = (existing as any)?.customFields ?? [];
    cleanData.customFields = mergeCustomFields(existingCustom, incomingCustom);
  }

  return await ClientProfile.findOneAndUpdate(
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









// ── Helper: age from dateOfBirth ──────────────────────────────────
const calcAge = (dob: Date | undefined): number | null => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

// ══════════════════════════════════════════════════════════════════
//  getClientById

const getClientById = async (
  clientId:      string,
  requesterRole: string,
  requesterId?:  string,
) => {

  const profile = await ClientProfile
    .findOne({ user: new Types.ObjectId(clientId) })
    .populate('user', 'email role isBlocked status lastLogin createdAt profileImage')
    .lean();

  if (!profile) throw new ApiError(StatusCodes.NOT_FOUND, 'Client profile not found');

  const user       = profile.user as any;
  const now        = new Date();
  const isProvider = requesterRole === USER_ROLES.PROVIDER;
  const isAdmin    = requesterRole === USER_ROLES.ADMIN;

  // ── All queries in parallel ───────────────────────────────────
  const [
    recentInvoices,
    allAppointments,
    providerSessionsRaw,
    clinicalNotes,
  ] = await Promise.all([

    // ADMIN: all invoices for this client
    isAdmin
      ? Invoice.find({ client: new Types.ObjectId(clientId) })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('invoiceNumber sessionFee processingFee totalAmount paymentStatus paidAt createdAt')
          .lean()
      : Promise.resolve([]),

    // ADMIN: full appointment history across all providers
    // PROVIDER: also fetch all to build careTeam
    Appointment.find({ client: new Types.ObjectId(clientId) })
      .sort({ scheduledAt: -1 })
      .limit(20)
      .populate('provider', '_id')
      .select('appointmentId scheduledAt durationMinutes sessionFee status format sessionName provider')
      .lean(),

    // PROVIDER: only this provider's sessions with client
    isProvider && requesterId
      ? Appointment.find({
          client:   new Types.ObjectId(clientId),
          provider: new Types.ObjectId(requesterId),
        })
          .sort({ scheduledAt: -1 })
          .limit(20)
          .select('appointmentId scheduledAt durationMinutes sessionFee status format sessionName')
          .lean()
      : Promise.resolve([]),

    // PROVIDER: quick notes written by this provider
    isProvider && requesterId
      ? ClinicalNote.find({
  client:   new Types.ObjectId(clientId),
  provider: new Types.ObjectId(requesterId),
})
  .sort({ createdAt: -1 })
  .limit(3)
  .select(
    'noteType quickNote subjective objective assessment plan ' +
    'isFinalized finalizedAt isSigned signedAt appointment createdAt updatedAt'
  )
  .lean()
      : Promise.resolve([]),
  ]);

  // ── Build providerMap from allAppointments ────────────────────
  const allProviderUserIds = [
    ...new Set(
      allAppointments
        .map((a: any) => a.provider?._id?.toString())
        .filter(Boolean),
    ),
  ];

  const providerProfiles = allProviderUserIds.length
    ? await ProviderProfile.find({ user: { $in: allProviderUserIds } })
        .select('user fullName professionalPhoto providerType')
        .lean()
    : [];

  const providerMap = Object.fromEntries(
    providerProfiles.map((p: any) => [
      p.user.toString(),
      { fullName: p.fullName, photo: p.professionalPhoto ?? '', providerType: p.providerType },
    ]),
  );

  // ── Shape appointment history (admin) ─────────────────────────
  const appointmentHistory = allAppointments.map((appt: any) => ({
    appointmentId:   appt.appointmentId,
    scheduledAt:     appt.scheduledAt,
    durationMinutes: appt.durationMinutes,
    sessionFee:      appt.sessionFee,
    status:          appt.status,
    format:          appt.format,
    sessionName:     appt.sessionName,
    therapist: {
      fullName: providerMap[appt.provider?._id?.toString()]?.fullName ?? 'Provider',
      photo:    providerMap[appt.provider?._id?.toString()]?.photo    ?? '',
    },
  }));

  // ── Shape session history (provider) ─────────────────────────
  const sessionHistory = providerSessionsRaw.map((appt: any) => ({
    appointmentId:   appt.appointmentId,
    date:            appt.scheduledAt,
    type:            appt.format,
    sessionName:     appt.sessionName,
    durationMinutes: appt.durationMinutes,
    status:          appt.status,
  }));

  // ── Last / next session (provider) ───────────────────────────
  const completed = providerSessionsRaw.filter(
    (a: any) => a.status === APPOINTMENT_STATUS.COMPLETED,
  );
  const upcoming = providerSessionsRaw
    .filter((a: any) =>
      a.status === APPOINTMENT_STATUS.UPCOMING && new Date(a.scheduledAt) > now,
    )
    .sort((a: any, b: any) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

  const lastSession = completed[0]?.scheduledAt ?? null;
  const nextSession = upcoming[0]?.scheduledAt  ?? null;

  // ── Care team: all OTHER providers who treated this client ────
  const careTeam = allProviderUserIds
    .filter((id) => id !== requesterId)
    .map((id) => ({
      fullName:     providerMap[id]?.fullName     ?? 'Provider',
      photo:        providerMap[id]?.photo        ?? '',
      providerType: providerMap[id]?.providerType ?? '',
    }));

  // ── Demographics ──────────────────────────────────────────────
  const demographics = {
    age:               calcAge(profile.dateOfBirth as Date | undefined),
    genderIdentity:    (profile as any).genderIdentity    ?? null,
    location: profile.billingAddress
      ? `${(profile.billingAddress as any).city ?? ''}, ${(profile.billingAddress as any).country ?? ''}`.trim()
      : null,
    preferredLanguage: (profile as any).preferredLanguage ?? 'English',
    reasonForTherapy:  (profile as any).reasonForTherapy  ?? null,
    primaryGoal:       (profile as any).primaryGoal       ?? null,
  };

  // ══════════════════════════════════════════════════════════════
  //  UNIFIED RESPONSE — both roles get ALL common fields
  //  sensitive fields added only for ADMIN
  // ══════════════════════════════════════════════════════════════
  return {
    // ── Header ───────────────────────────────────────────
    clientId:     `MND-${String(profile._id).slice(-5).toUpperCase()}`,
    fullName:      profile.fullName,
    profilePhoto:  profile.profilePhoto || user?.profileImage || '',
    memberSince:   profile.memberSince,
    email:         profile.email || user?.email || '',
    phone:         profile.phone || '',

    // ── Personal Info — both roles (no sensitive fields) ─
    personalInfo: {
      fullName: profile.fullName,
      email:    profile.email || user?.email || '',
      phone:    profile.phone || '',
      location: demographics.location,
    },

    // ── Account Access — both roles ───────────────────────
    accountAccess: {
      lastLogin:      user?.lastLogin ?? null,
      accountCreated: user?.createdAt ?? null,
      isBlocked:      user?.isBlocked ?? false,
      status:         user?.status    ?? 'active',
    },

    // ── Stats — both roles ────────────────────────────────
    stats: {
      totalSessions: profile.totalSessions,
      totalSpent:    profile.totalSpent,
    },

    // ── Demographics — both roles ─────────────────────────
    demographics,

    // ── Provider card (lastSession / nextSession) ─────────
    clientCard: {
      fullName:    profile.fullName,
      photo:       profile.profilePhoto || user?.profileImage || '',
      lastSession,
      nextSession,
      location:    demographics.location,
    },

    // ── Provider-specific: their own session history ──────
    sessionHistory,

    // ── Care team ─────────────────────────────────────────
    careTeam,

    // ── Quick notes by this provider ─────────────────────
    quickNotes: clinicalNotes,

    // ── ADMIN ONLY: full appointment history ─────────────
    ...(isAdmin && { appointmentHistory }),

    // ── ADMIN ONLY: invoices ──────────────────────────────
    ...(isAdmin && { recentInvoices }),

    // ── ADMIN ONLY: sensitive profile fields ─────────────
    ...(isAdmin && {
      sensitiveInfo: {
        billingAddress: profile.billingAddress,
        insurance:      (profile as any).insurance,
        paymentMethod:  (profile as any).paymentMethod,
        medicalHistory: (profile as any).medicalHistory,
      },
    }),
  };
};





const getAllClients = async (query: Record<string, unknown>) => {
  const clientQuery = new QueryBuilder(
    ClientProfile.find({}, {fullName: 1, email: 1, phone: 1, billingAddress:1, memberSince:1}).populate(
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
