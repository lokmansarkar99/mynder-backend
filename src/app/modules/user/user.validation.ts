import { z } from 'zod';
import { STATUS } from '../../../enums/user';
import { checkValidID } from '../../../shared/chackValid';

// ── Update my profile ──────────────────────────────
const updateMyProfileSchema = z.object({
body: z.object({
name: z.string().min(3, 'Name must be at least 3 characters').optional(),
email: z.string().email('Invalid email').optional(),
// profileImage comes from multer → file, NOT body
}),
});

// ── Admin: change user status (active/inactive) ────
const updateUserStatusSchema = z.object({
params: z.object({
id: checkValidID('Invalid user ID'),
}),
body: z.object({
status: z.enum([STATUS.ACTIVE, STATUS.INACTIVE], {
message: 'Status must be active or inactive',
}),
}),
});

// ── Admin: block / unblock user ────────────────────
const blockUnblockUserSchema = z.object({
params: z.object({
id: checkValidID('Invalid user ID'),
}),
body: z.object({
isBlocked: z.boolean({
}),
}),
});

// ── Admin: get user by id ──────────────────────────
const getUserByIdSchema = z.object({
params: z.object({
id: checkValidID('Invalid user ID'),
}),
});

// ── Admin: delete user ─────────────────────────────
const deleteUserSchema = z.object({
params: z.object({
id: checkValidID('Invalid user ID'),
}),
});

export const UserValidation = {
updateMyProfileSchema,
updateUserStatusSchema,
blockUnblockUserSchema,
getUserByIdSchema,
deleteUserSchema,
};

// Payload types
export type UpdateMyProfilePayload = z.infer<typeof updateMyProfileSchema>['body'];
export type UpdateUserStatusPayload = z.infer<typeof updateUserStatusSchema>['body'];
export type BlockUnblockUserPayload = z.infer<typeof blockUnblockUserSchema>['body'];
