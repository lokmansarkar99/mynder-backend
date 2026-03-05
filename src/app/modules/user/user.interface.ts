import { Model, Document } from "mongoose"
import { USER_ROLES, STATUS } from "../../../enums/user"

export type IUser = {
  name?: string
  role: USER_ROLES
  email: string
  profileImage?: string
  password: string
  status: STATUS
  verified: boolean
  intakeCompleted: boolean
  isBlocked: boolean
  isDeleted: boolean
  lastLogin: Date | null
  googleId?: string | null
  authentication?: {
    isResetPassword: boolean
    oneTimeCode: number | null
    expiredAt: Date | null
  }
}

export type UserModal = Model<IUser> & {
  isExistUserById(id: string): Promise<IUser | null>
  isExistUserByEmail(email: string): Promise<IUser | null>
  isAccountCreated(id: string): Promise<IUser | null>
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>
}
