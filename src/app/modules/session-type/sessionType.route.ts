import express from 'express'
import { checkAuth } from '../../middlewares/checkAuth'
import { USER_ROLES } from '../../../enums/user'
import { SessionTypeController } from './sessionType.controller'
import validateRequest from '../../middlewares/validateRequest'
import { SessionTypeValidation } from './session.validation'

const router = express.Router()


router.route('/').post(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(SessionTypeValidation.createSessionTypeSchema), 
    SessionTypeController.createSessionType
)    


export const SessionTypeRouter = router