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
import { STATUS } from "../../../enums/user";

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

// ── Admin: Get All Users ───────────────────────────
const getAllUsers = async (query: Record<string, any>) => {
const page = Number(query.page) || 1
const limit = Number(query.limit) || 10
const skip = (page - 1) * limit;

const filter: Record<string, any> = { isDeleted: false }

if (query.role) filter.role = query.role
if (query.status) filter.status = query.status
if (query.isBlocked) filter.isBlocked = query.isBlocked === 'true'

if (query.search) {
filter.$or = [
{ email: { $regex: query.search, $options: "i" } },
{ name: { $regex: query.search, $options: "i" } },
]
}

const [users, total] = await Promise.all([
User.find(filter).skip(skip).limit(limit).lean(),
User.countDocuments(filter)
])

return {
users,
meta: {
page,
limit,
total,
totalPages: Math.ceil(total / limit)
}
}
}

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

export const UserService = {
getMyProfile,
updateMyProfile,
getAllUsers,
getUserById,
updateUserStatus,
blockUnblockUser,
deleteUser,
}
