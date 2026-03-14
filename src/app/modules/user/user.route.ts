import express from "express";

const router = express.Router();

import { checkAuth } from "../../middlewares/checkAuth";
import { USER_ROLES } from "../../../enums/user";
import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import fileUploadHandler from "../../middlewares/fileUploadHandler";
import { UserValidation } from "./user.validation";

// ================= MY PROFILE =================
router
.route("/my-profile")
.get(
checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
UserController.getMyProfile,
)
.patch(
checkAuth(USER_ROLES.CLIENT, USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
fileUploadHandler(),
validateRequest(UserValidation.updateMyProfileSchema),
UserController.updateMyProfile,
);

// ================= ADMIN: ALL USERS =================
router
.route("/users")
.get(
checkAuth(USER_ROLES.ADMIN),
UserController.getAllUsers
);

// ================= ADMIN: SINGLE USER =================
router
.route("/users/:id")
.get(
checkAuth(USER_ROLES.ADMIN),
validateRequest(UserValidation.getUserByIdSchema),
UserController.getUserById
)
.delete(
checkAuth(USER_ROLES.ADMIN),
validateRequest(UserValidation.deleteUserSchema),
UserController.deleteUser
);

// ================= ADMIN: UPDATE USER STATUS =================
router
.route("/users/:id/status")
.patch(
checkAuth(USER_ROLES.ADMIN),
validateRequest(UserValidation.updateUserStatusSchema),
UserController.updateUserStatus
);

// ================= ADMIN: BLOCK / UNBLOCK USER =================
router
.route("/users/:id/block")
.patch(
checkAuth(USER_ROLES.ADMIN),
validateRequest(UserValidation.blockUnblockUserSchema),
UserController.blockUnblockUser
);





// CLIENT: browse all providers to start a new chat
router.get(
  '/providers',
  checkAuth(USER_ROLES.CLIENT, USER_ROLES.ADMIN),
  UserController.getAllProviders,
);

// PROVIDER: browse all clients
router.get(
  '/clients',
  checkAuth(USER_ROLES.PROVIDER, USER_ROLES.ADMIN),
  UserController.getAllClients,
);

// ADMIN: all users with optional role filter
router.get(
  '/all',
  checkAuth(USER_ROLES.ADMIN),
  UserController.getAllUsers,
);


// Admin Statistics
router.get("/stats", checkAuth(USER_ROLES.ADMIN), UserController.adminStats)


export const UserRoutes = router;
