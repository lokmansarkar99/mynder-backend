import express from "express"

import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.route";
import { ClientProfileRoutes } from "../modules/client-profile/clientProfile.route";
import { ProviderProfileRoutes } from "../modules/provider-profile/providerProfile.route";
import { SessionTypeRouter } from "../modules/session-type/sessionType.route";

const router = express.Router()

// Auth Routes
router.use("/auth", AuthRoutes)

router.use("/user", UserRoutes)

router.use("/client-profile", ClientProfileRoutes)

router.use("/provider", ProviderProfileRoutes)
router.use("/session-type", SessionTypeRouter)


export default router;