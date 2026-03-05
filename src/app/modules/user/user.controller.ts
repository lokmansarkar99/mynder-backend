import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { UserService } from "./user.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";

// ── Get My Profile ─────────────────────────────────
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
const userId = req.user?.id
const result = await UserService.getMyProfile(userId)

sendResponse(res, {
success: true,
message: "Profile fetched successfully",
statusCode: StatusCodes.OK,
data: result
})
})

// ── Update My Profile ──────────────────────────────
const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
const userId = req.user?.id
const payload = req.body
const files = req.files
const result = await UserService.updateMyProfile(userId, payload, files)

sendResponse(res, {
success: true,
message: "Profile updated successfully",
statusCode: StatusCodes.OK,
data: result
})
})

// ── Admin: Get All Users ───────────────────────────
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
const result = await UserService.getAllUsers(req.query)

sendResponse(res, {
success: true,
message: "Users fetched successfully",
statusCode: StatusCodes.OK,
data: result
})
})

// ── Admin: Get Single User ─────────────────────────
const getUserById = catchAsync(async (req: Request, res: Response) => {
const result = await UserService.getUserById(req.params.id as string)

sendResponse(res, {
success: true,
message: "User fetched successfully",
statusCode: StatusCodes.OK,
data: result
})
})

// ── Admin: Update User Status ──────────────────────
const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
const result = await UserService.updateUserStatus(req.params.id as string, req.body)

sendResponse(res, {
success: true,
message: "User status updated successfully",
statusCode: StatusCodes.OK,
data: result
})
})

// ── Admin: Block / Unblock User ───────────────────
const blockUnblockUser = catchAsync(async (req: Request, res: Response) => {
const result = await UserService.blockUnblockUser(req.params.id as string, req.body)

sendResponse(res, {
success: true,
message: result.message,
statusCode: StatusCodes.OK,
data: null
})
})

// ── Admin: Delete User ─────────────────────────────
const deleteUser = catchAsync(async (req: Request, res: Response) => {
const result = await UserService.deleteUser(req.params.id as string)

sendResponse(res, {
success: true,
message: result.message,
statusCode: StatusCodes.OK,
data: null
})
})

export const UserController = {
getMyProfile,
updateMyProfile,
getAllUsers,
getUserById,
updateUserStatus,
blockUnblockUser,
deleteUser,
}
