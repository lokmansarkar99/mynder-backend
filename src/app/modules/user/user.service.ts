import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import unlinkFile from "../../../shared/unLinkFIle";
import { getSingleFilePath } from "../../../shared/getFilePath";
import { User } from "./user.model";
import type {
UpdateMyProfilePayload,
UpdateUserStatusPayload,
BlockUnblockUserPayload,
} from "./user.validation";
import { STATUS, USER_ROLES } from "../../../enums/user";

// ── Get My Profile ─────────────────────────────────
const getMyProfile = async (userId: string) => {
const user = await User.findById(userId)

if (!user) {
throw new ApiError(StatusCodes.NOT_FOUND, "User not found")
}

if (user.isDeleted) {
throw new ApiError(StatusCodes.FORBIDDEN, "User is deleted")
}

return user
}

// ── Update My Profile ──────────────────────────────
const updateMyProfile = async (
userId: string,
payload: UpdateMyProfilePayload,
files: any
) => {
const user = await User.findById(userId);
if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
if (user.isDeleted) throw new ApiError(StatusCodes.FORBIDDEN, 'Account deleted');

const newImagePath = getSingleFilePath(files, 'profileImage');

if (newImagePath) {
if (user.profileImage) {
unlinkFile(user.profileImage);
}
(payload as any).profileImage = newImagePath;
}

const updated = await User.findByIdAndUpdate(
userId,
{ $set: payload },
{ new: true, runValidators: true }
).lean();

return updated;
};


// ── Admin: Get Single User ─────────────────────────
const getUserById = async (userId: string) => {
const user = await User.findById(userId)

if (!user || user.isDeleted) {
throw new ApiError(StatusCodes.NOT_FOUND, "User not found")
}

return user
}

// ── Admin: Update User Status (active/inactive) ────
const updateUserStatus = async (userId: string, payload: UpdateUserStatusPayload) => {
const user = await User.findById(userId)

if (!user || user.isDeleted) {
throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
}

user.status = payload.status as STATUS
await user.save()

return { message: `User status updated to ${payload.status}` }
}

// ── Admin: Block / Unblock User ───────────────────
const blockUnblockUser = async (userId: string, payload: BlockUnblockUserPayload) => {
const user = await User.findById(userId)

if (!user || user.isDeleted) {
throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
}

user.isBlocked = payload.isBlocked
await user.save()

return { message: `User ${payload.isBlocked ? 'blocked' : 'unblocked'} successfully` }
}

// ── Admin: Delete User (soft delete) ──────────────
const deleteUser = async (userId: string) => {
const user = await User.findById(userId)

if (!user || user.isDeleted) {
throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
}

user.isDeleted = true
await user.save()

return { message: 'User deleted successfully' }
}
// ─── CLIENT Dashboard — Browse all active Providers ──────────────────────────
const getAllProviders = async (
  search?: string,
  page:    number = 1,
  limit:   number = 20,
) => {
  const filter: any = {
    role:     USER_ROLES.PROVIDER,
    status:   STATUS.ACTIVE,
    verified: true,
  };

  if (search?.trim()) {
    filter.$or = [
      { name:  { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const skip  = (page - 1) * limit;
  const total = await User.countDocuments(filter);

  const providers = await User.find(filter)
    .select('name email profileImage role')
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  return {
    providers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore:    page * limit < total,
    },
  };
};

// ─── PROVIDER Dashboard — Browse all active Clients ──────────────────────────
const getAllClients = async (
  search?: string,
  page:    number = 1,
  limit:   number = 20,
) => {
  const filter: any = {
    role:     USER_ROLES.CLIENT,
    status:   STATUS.ACTIVE,
    verified: true,
  };

  if (search?.trim()) {
    filter.$or = [
      { name:  { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const skip  = (page - 1) * limit;
  const total = await User.countDocuments(filter);

  const clients = await User.find(filter)
    .select('name email profileImage role')
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  return {
    clients,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore:    page * limit < total,
    },
  };
};

const getAllUsers = async (
  search?: string,
  role?:   string,
  page:    number = 1,
  limit:   number = 20,
) => {
  const filter: any = {
    role: { $in: [USER_ROLES.CLIENT, USER_ROLES.PROVIDER] },
  };

  // Optional role filter: ?role=CLIENT or ?role=PROVIDER
  if (role && [USER_ROLES.CLIENT, USER_ROLES.PROVIDER].includes(role as USER_ROLES)) {
    filter.role = role;
  }

  if (search?.trim()) {
    filter.$or = [
      { name:  { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const skip  = (page - 1) * limit;
  const total = await User.countDocuments(filter);

  const users = await User.find(filter)
    .select('name email profileImage role status verified createdAt')
    .populate('providerProfile', 'licenseNumber createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore:    page * limit < total,
    },
  };
};



export const UserService = {
getMyProfile,
updateMyProfile,
getUserById,
updateUserStatus,
blockUnblockUser,
deleteUser,
getAllProviders,
getAllClients,
getAllUsers
}
