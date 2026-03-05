import express from "express"

import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.route";
import { ClientProfileRoutes } from "../modules/client-profile/clientProfile.route";

const router = express.Router()

// Auth Routes
router.use("/auth", AuthRoutes)

router.use("/user", UserRoutes)

router.use("/client-profile", ClientProfileRoutes)


export default router;