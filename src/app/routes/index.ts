import express from "express"

import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.route";
import { ClientProfileRoutes } from "../modules/client-profile/clientProfile.route";
import { ProviderProfileRoutes } from "../modules/provider-profile/providerProfile.route";
import { SessionTypeRouter } from "../modules/session-type/sessionType.route";
import { AvailabilityRoutes } from "../modules/availability/availability.route";
import { SlotRoutes } from "../modules/slot/slot.route";
import { AppointmentRoutes } from "../modules/appointment/appointment.route";
import { StripeRoutes } from "../modules/stripe/stripe.route";
import { ProviderPayoutRoutes } from "../modules/provider-payout/providerPayout.route";
import { ConversationRoutes } from "../modules/conversation/conversation.route";
import { MessageRoutes } from "../modules/message/message.route";
import { NotificationRoutes } from "../modules/notification/notification.route";
import { FAQRoutes } from "../modules/faq/faq.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { BlogRoutes } from "../modules/blog/blog.route";
import { ClinicalNoteRoutes } from "../modules/clinical-note/clinicalNote.route";
import { InvoiceRoutes } from "../modules/invoice/invoice.route";
import { FormLibraryRoutes } from "../modules/form-library/form-library.route";
import { IntakeFormConfigRoutes } from "../modules/intake-form-field/intake-form-config.route";

const router = express.Router()

// Auth Routes
router.use("/auth", AuthRoutes)

router.use("/user", UserRoutes)

router.use("/client-profile", ClientProfileRoutes)

router.use("/provider", ProviderProfileRoutes)
router.use("/session-type", SessionTypeRouter)

router.use("/availability", AvailabilityRoutes)

router.use("/slot", SlotRoutes)

router.use("/appointments", AppointmentRoutes)

router.use("/stripe", StripeRoutes)

router.use("/payouts", ProviderPayoutRoutes)

router.use("/conversation", ConversationRoutes)

router.use("/message", MessageRoutes)

router.use("/notification", NotificationRoutes)

router.use("/faq", FAQRoutes)

router.use("/review", ReviewRoutes)

router.use("/blog", BlogRoutes)

router.use("/clinical-note", ClinicalNoteRoutes)

router.use("/invoice", InvoiceRoutes)
export default router;


router.use("/form-library", FormLibraryRoutes)

router.use("/intake-form-config", IntakeFormConfigRoutes)