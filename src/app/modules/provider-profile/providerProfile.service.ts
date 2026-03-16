import { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { ProviderProfile } from "./providerProfile.model";
import { User } from "../user/user.model";
import { QueryBuilder } from "../../buillder/queryBuilder";
import { APPLICATION_STATUS } from "../../../enums/payment";
import unlinkFile from "../../../shared/unLinkFIle";
import { getSingleFilePath } from "../../../shared/getFilePath";
import {
  TStep1Input,
  TStep2Input,
  TStep3Input,
  TIntakeStepInput,
  TProfileUpdateInput,
  TAdminReviewInput,
} from "./providerProfile.validation";

import {
  REFERENCE_MODEL,
  NOTIFICATION_TYPE,
} from "../../../enums/notification";

import sendNotification from "../../../shared/sendNotification";

import { Slot } from "../slot/slot.model";
import { SessionType } from "../session-type/sessionType.model";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeFiles = (
  files:
    | Express.Multer.File[]
    | Record<string, Express.Multer.File[]>
    | undefined,
): Record<string, Express.Multer.File[]> => {
  if (!files) return {};
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
  return files;
};

// profileImage Fix root cause — form-data arrays come as JSON strings
// Handles both: already-parsed array OR raw JSON string
const parseJsonArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T[];
    } catch {
      return [];
    }
  }
  return [];
};

// ─── Step Data Builder ────────────────────────────────────────────────────────

const buildStepUpdateData = (
  step: number,
  payload: TIntakeStepInput,
  files: Record<string, Express.Multer.File[]>,
): Record<string, unknown> => {
  switch (step) {
    case 1: {
      const data = payload as TStep1Input;
      const update: Record<string, unknown> = {
        fullName: data.fullName,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        genderIdentity: data.genderIdentity,
        licenseNumber: data.licenseNumber,
        licenseState: data.licenseState,
        providerType: data.providerType,
        officeAddress: data.officeAddress ?? "",
        city: data.city ?? "",
      };
      const profileImgPath = getSingleFilePath(files, "profileImage");
      const proPhotoPath = getSingleFilePath(files, "professionalPhoto");
      const proVideoPath = getSingleFilePath(files, "professionalVideo");
      if (profileImgPath) update.profilePhoto = profileImgPath;
      if (proPhotoPath) update.professionalPhoto = proPhotoPath;
      if (proVideoPath) update.professionalVideo = proVideoPath;
      return update;
    }

    case 2: {
      const data = payload as TStep2Input;
      const update: Record<string, unknown> = {};

      // profileImage parseJsonArray — handles string or array from form-data
      const education = parseJsonArray<{
        degreeName: string;
        university: string;
        graduationYear: number;
      }>(data.education);

      const employment = parseJsonArray<{
        employerName: string;
        jobTitle: string;
        startDate: string;
        endDate: string | null;
        responsibilities: string;
        isCurrent: boolean;
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
        update.employment = employment.map((e) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: e.endDate ? new Date(e.endDate) : null,
        }));
      }

      const cvPath = getSingleFilePath(files, "cvDocument");
      const licensePath = getSingleFilePath(files, "licenseDocument");
      if (cvPath) update.cvDocument = cvPath;
      if (licensePath) update.licenseDocument = licensePath;
      return update;
    }

    case 3: {
      const data = payload as TStep3Input;

      // profileImage parseJsonArray for ALL array fields — same issue as employment
      const therapeuticApproaches = parseJsonArray<string>(
        data.therapeuticApproaches,
      );
      const clientPopulations = parseJsonArray<string>(data.clientPopulations);
      const sessionFormats = parseJsonArray<string>(data.sessionFormats);
      const sessionLengths = parseJsonArray<number>(data.sessionLengths);

      if (!therapeuticApproaches.length) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Select at least one therapeutic approach",
        );
      }
      if (!clientPopulations.length) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Select at least one client population",
        );
      }
      if (!sessionFormats.length) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "Select at least one session format",
        );
      }

      return {
        therapeuticApproaches,
        clientPopulations,
        sessionFormats,
        sessionLengths,
        applicationStatus: APPLICATION_STATUS.PENDING,
        applicationSubmittedAt: new Date(),
      };
    }

    default:
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid step. Must be 1–3");
  }
};

// ─── Service Functions ────────────────────────────────────────────────────────

const saveIntakeStep = async (
  userId: string,
  step: number,
  payload: TIntakeStepInput,
  rawFiles:
    | Express.Multer.File[]
    | Record<string, Express.Multer.File[]>
    | undefined,
) => {
  const userObjectId = new Types.ObjectId(userId);
  const files = normalizeFiles(rawFiles);

  // Fetch existing doc only for steps with file uploads (1 & 2)
  const existing =
    step === 1 || step === 2
      ? await ProviderProfile.findOne({ user: userObjectId })
      : null;

  // ── Delete old files before saving new ones ───────────────────────────────
  if (step === 1) {
    if (getSingleFilePath(files, "profileImage") && existing?.profilePhoto)
      unlinkFile(existing.profilePhoto);
    if (
      getSingleFilePath(files, "professionalPhoto") &&
      existing?.professionalPhoto
    )
      unlinkFile(existing.professionalPhoto);
    if (
      getSingleFilePath(files, "professionalVideo") &&
      existing?.professionalVideo
    )
      unlinkFile(existing.professionalVideo);
  }
  if (step === 2) {
    if (getSingleFilePath(files, "cvDocument") && existing?.cvDocument)
      unlinkFile(existing.cvDocument);
    if (
      getSingleFilePath(files, "licenseDocument") &&
      existing?.licenseDocument
    )
      unlinkFile(existing.licenseDocument);
  }

  const rawData = buildStepUpdateData(step, payload, files);
  const cleanData = Object.fromEntries(
    Object.entries(rawData).filter(([, v]) => v !== undefined),
  );

  return await ProviderProfile.findOneAndUpdate(
    { user: userObjectId },
    {
      $set: cleanData,
      $max: { intakeStep: step },
      $setOnInsert: { user: userObjectId },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
};

const getMyProfile = async (userId: string) => {
  const profile = await ProviderProfile.findOne({
    user: new Types.ObjectId(userId),
  }).populate("user", "email role isEmailVerified lastLogin createdAt");

  if (!profile) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Provider profile not found. Please complete your intake form.",
    );
  }
  return profile;
};

const updateMyProfile = async (
  userId: string,
  payload: TProfileUpdateInput,
  rawFiles:
    | Express.Multer.File[]
    | Record<string, Express.Multer.File[]>
    | undefined,
) => {
  const userObjectId = new Types.ObjectId(userId);

  const existing = await ProviderProfile.findOne({ user: userObjectId });
  if (!existing) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Provider profile not found. Please complete your intake form first.",
    );
  }

  const files = normalizeFiles(rawFiles);
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
      employerName: string;
      jobTitle: string;
      startDate: string;
      endDate: string | null;
      responsibilities: string;
      isCurrent: boolean;
    }>(payload.employment);
    updateData.employment = employment.map((e) => ({
      ...e,
      startDate: new Date(e.startDate),
      endDate: e.endDate ? new Date(e.endDate) : null,
    }));
  }
  if (payload.therapeuticApproaches) {
    updateData.therapeuticApproaches = parseJsonArray(
      payload.therapeuticApproaches,
    );
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
  const newProfileImg = getSingleFilePath(files, "profileImage");
  const newProPhoto = getSingleFilePath(files, "professionalPhoto");
  const newProVideo = getSingleFilePath(files, "professionalVideo");
  const newCv = getSingleFilePath(files, "cvDocument");
  const newLicense = getSingleFilePath(files, "licenseDocument");

  if (newProfileImg) {
    if (existing.profilePhoto) unlinkFile(existing.profilePhoto);
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
    if (existing.cvDocument) unlinkFile(existing.cvDocument);
    updateData.cvDocument = newCv;
  }
  if (newLicense) {
    if (existing.licenseDocument) unlinkFile(existing.licenseDocument);
    updateData.licenseDocument = newLicense;
  }

  return await ProviderProfile.findOneAndUpdate(
    { user: userObjectId },
    { $set: updateData },
    { returnDocument: "after", runValidators: true },
  ).populate("user", "email role isEmailVerified lastLogin createdAt");
};

// ─── Public Endpoints ─────────────────────────────────────────────────────────



const getPublicProviders = async (query: Record<string, unknown>) => {

  // ── Tomorrow date window ──────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(new Date(tomorrow).setHours(0, 0, 0, 0));
  const tomorrowEnd   = new Date(new Date(tomorrow).setHours(23, 59, 59, 999));

  // ── Only card fields from ProviderProfile ─────────────────────
  const CARD_FIELDS =
    '_id user fullName providerType professionalPhoto ' +
    'therapeuticApproaches clientPopulations ' +
    'averageRating totalReviews isFeatured isTopProvider bio';

  const baseQuery = ProviderProfile.find({
    applicationStatus: APPLICATION_STATUS.APPROVED,
  })
    .select(CARD_FIELDS)
    .populate('user', '_id');

  const providerQuery = new QueryBuilder(baseQuery, query)
    .search(['fullName', 'city', 'providerType'])
    .filter()
    .sort()
    .paginate()
    .fields();

  // ── Run query + count in parallel ─────────────────────────────
  const [providers, meta] = await Promise.all([
    providerQuery.modelQuery,
    providerQuery.countTotal(),
  ]);

  // ── Collect all provider User._ids ────────────────────────────
  const providerUserIds = providers.map((p: any) => p.user?._id ?? p.user);

  // ── 3 parallel lookups ────────────────────────────────────────
  const [availableTomorrowIds, sessionTypes] = await Promise.all([

    // Which providers have a free slot tomorrow?
    Slot.find({
      provider:  { $in: providerUserIds },
      date:      { $gte: tomorrowStart, $lte: tomorrowEnd },
      isBooked:  false,
      isExpired: false,
    }).distinct('provider'),

    //  Session fees now come from SessionType — NOT providerProfile.sessionFees
    SessionType.find({
      provider: { $in: providerUserIds },
      isActive: true,
    })
      .select('provider name duration price')
      .lean(),
  ]);

  // ── Build lookup maps ─────────────────────────────────────────
  const availableSet = new Set(
    availableTomorrowIds.map((id: any) => id.toString()),
  );

  // providerUserId → [{ name, duration, price }]
  const sessionTypeMap: Record<
    string,
    { name: string; duration: number; price: number }[]
  > = {};

  for (const st of sessionTypes as any[]) {
    const key = st.provider.toString();
    if (!sessionTypeMap[key]) sessionTypeMap[key] = [];
    sessionTypeMap[key].push({
      name:     st.name,
      duration: st.duration,
      price:    st.price,
    });
  }

  // ── Shape provider cards ──────────────────────────────────────
  const data = providers.map((p: any) => {
    const doc    = p.toObject ? p.toObject() : p;
    const userId = (doc.user?._id ?? doc.user)?.toString();

    const sessions   = sessionTypeMap[userId] ?? [];
    const lowestFee  = sessions.length
      ? sessions.reduce((min, s) => (s.price < min ? s.price : min), sessions[0].price)
      : null;

    return {
      _id:                   doc._id,
      fullName:              doc.fullName,
      providerType:          doc.providerType,
      professionalPhoto:     doc.professionalPhoto,
      therapeuticApproaches: doc.therapeuticApproaches,
      clientPopulations:     doc.clientPopulations,
      averageRating:         doc.averageRating,
      totalReviews:          doc.totalReviews,
      isFeatured:            doc.isFeatured,
      isTopProvider:         doc.isTopProvider,
      bio:                   doc.bio ?? null,
      isAvailableTomorrow:   availableSet.has(userId ?? ''),

      //  From SessionType
      sessionTypes:  sessions,    // [{ name: "Standard", duration: 60, price: 150 }]
      sessionFee:    lowestFee,   // 150 → "$150 / Session" on card
    };
  });

  return { data, meta };
};



const getPublicProviderById = async (providerId: string) => {

  // ── 1. Profile + SessionTypes + upcoming slots in parallel ────
  const now           = new Date();
  const todayStart    = new Date(new Date().setHours(0, 0, 0, 0));
  const sevenDaysEnd  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [profile, sessionTypes, upcomingSlots] = await Promise.all([

    ProviderProfile.findOne({
      user:              new Types.ObjectId(providerId),
      applicationStatus: APPLICATION_STATUS.APPROVED,
    })
      .populate('user', 'email isActive name')
      .select(
        '-cvDocument -licenseDocument -applicationSubmittedAt ' +
        '-reviewedBy -rejectionReason -sessionFees', // exclude stale empty array
      )
      .lean(),

    // ✅ Real session pricing from SessionType
    SessionType.find({
      provider: new Types.ObjectId(providerId),
      isActive: true,
    })
      .select('name duration price isActive')
      .lean(),

    // Next 7 days available slots — for "Book Now" date picker
    Slot.find({
      provider:  new Types.ObjectId(providerId),
      date:      { $gte: todayStart, $lte: sevenDaysEnd },
      isBooked:  false,
      isExpired: false,
    })
      .select('date startTime endTime duration sessionType sessionName price')
      .populate('sessionType', 'name duration price')
      .sort({ date: 1, startTime: 1 })
      .lean(),
  ]);

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Provider not found');
  }

  // ── 2. Compute lowestFee for the card display ─────────────────
  const lowestFee: number | null = sessionTypes.length
    ? (sessionTypes as any[]).reduce(
        (min: number, s: any) => (s.price < min ? s.price : min),
        (sessionTypes as any[])[0].price,
      )
    : null;

  // ── 3. Group available slots by date for the frontend ─────────
  const slotsByDate = (upcomingSlots as any[]).reduce(
    (acc: Record<string, any[]>, slot: any) => {
      const dateKey = new Date(slot.date).toISOString().split('T')[0]; // "2026-03-17"
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push({
        slotId:      slot._id,
        startTime:   slot.startTime,
        endTime:     slot.endTime,
        duration:    slot.duration,
        price:       slot.price,
        sessionName: slot.sessionName,
        sessionType: slot.sessionType,
      });
      return acc;
    },
    {},
  );

  // ── 4. Return full enriched profile ──────────────────────────
  return {
    ...profile,

    // ✅ Real session pricing — replaces empty sessionFees[]
    sessionTypes: sessionTypes,   // [{ name, duration, price, isActive }]
    sessionFee:   lowestFee,      // lowest price → "$100 / Session" on card

    // Available booking slots next 7 days
    availability: {
      slotsByDate,                            // { "2026-03-17": [{ slotId, startTime, ... }] }
      hasAvailability: upcomingSlots.length > 0,
    },
  };
};


// ─── Admin Endpoints ──────────────────────────────────────────────────────────

const getAllProviders = async (query: Record<string, unknown>) => {
  const providerQuery = new QueryBuilder(
    ProviderProfile.find({}, { licenseNumber: 1, applicationSubmittedAt: 1 })
      .populate(
        "user",
        "email name isEmailVerified isBlocked lastLogin createdAt",
      )
      .populate("reviewedBy", "email"),
    query,
  )
    .search(["fullName", "city", "licenseNumber", "providerType"])
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
  adminId: string,
  payload: TAdminReviewInput,
) => {
  const profile = await ProviderProfile.findOne({
    user: new Types.ObjectId(providerId),
  });

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Provider profile not found");
  }

  if (profile.applicationStatus !== APPLICATION_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Application is already ${profile.applicationStatus}. Only pending applications can be reviewed.`,
    );
  }

  const isApprove = payload.action === "approve";

  const updateData: Record<string, unknown> = {
    applicationStatus: isApprove
      ? APPLICATION_STATUS.APPROVED
      : APPLICATION_STATUS.REJECTED,
    reviewedBy: new Types.ObjectId(adminId),
    rejectionReason: isApprove ? "" : (payload.rejectionReason ?? ""),
    approvedAt: isApprove ? new Date() : null,
  };

  const updatedProfile = await ProviderProfile.findOneAndUpdate(
    { user: new Types.ObjectId(providerId) },
    { $set: updateData },
    { returnDocument: "after" },
  ).populate("user", "email role");

  if (isApprove) {
    // ── Activate user account ────────────────────────────────────────────────
    await User.findByIdAndUpdate(new Types.ObjectId(providerId), {
      $set: { isActive: true },
    });

    // ── F-5: Notify provider — PROVIDER_APPROVED ─────────────────────────────
    await sendNotification({
      recipientId: providerId,
      type: NOTIFICATION_TYPE.PROVIDER_APPROVED,
      title: "Profile Approved! 🎉",
      body: "Congratulations! Your provider profile has been approved. You can now set up your availability and start accepting bookings.",
      referenceId: profile._id,
      referenceModel: REFERENCE_MODEL.PROVIDER_PAYOUT, // closest ref — or add PROVIDER_PROFILE to enum
    });
  } else {
    // ── F-5: Notify provider — PROVIDER_REJECTED ─────────────────────────────
    await sendNotification({
      recipientId: providerId,
      type: NOTIFICATION_TYPE.PROVIDER_REJECTED,
      title: "Profile Not Approved",
      body: payload.rejectionReason
        ? `Your provider profile was not approved. Reason: ${payload.rejectionReason}`
        : "Your provider profile was not approved. Please contact support for more information.",
      referenceId: profile._id,
      referenceModel: REFERENCE_MODEL.PROVIDER_PAYOUT,
    });
  }

  return updatedProfile;
};

// ─── Internal — called from Review module ────────────────────────────────────

const updateRatingStats = async (
  userId: string,
  newAverageRating: number,
  newTotalReviews: number,
) => {
  const isTopProvider = newAverageRating >= 4.5 && newTotalReviews >= 10;

  await ProviderProfile.findOneAndUpdate(
    { user: new Types.ObjectId(userId) },
    {
      $set: {
        averageRating: newAverageRating,
        totalReviews: newTotalReviews,
        isTopProvider,
      },
    },
  );
};

const getProviderById = async (providerId: string) => {
  const profile = await ProviderProfile.findOne({
    user: new Types.ObjectId(providerId),
  })
    .populate(
      "user",
      "email role isEmailVerified isBlocked lastLogin createdAt",
    )
    .populate("reviewedBy", "email")
    .select(
      "applicationSubmittedAt fullName cvDocument licenseDocument licenseNumber licenseState officeAddress phone professionalPhoto professionalVideo",
    );

  if (!profile) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Provider profile not found");
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
  getProviderById,
};
