import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import { Secret } from "jsonwebtoken";

import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelper } from "../../../helpers/jwtHelper";
import { User } from "../user/user.model";

import generateOTP from "../../../utils/generateOTP";
import { STATUS } from "../../../enums/user";

import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";

import type {
RegisterPayload,
LoginPayload,
RefreshTokenPayload,
SendOtpPayload,
VerifyUserPayload,
ResetPasswordWithOtpPayload,
} from "./auth.validation";

const OTP_EXPIRE_MINUTES = 5;

// =====================================================
// REGISTER
// =====================================================
const registerToDB = async (payload: RegisterPayload) => {
const { email } = payload;

const isExistUser = await User.findOne({ email });
if (isExistUser) {
throw new ApiError(
StatusCodes.CONFLICT,
"User already exists with this email"
);
}

const user = await User.create(payload);

const otp = generateOTP();

await User.updateOne(
{ email },
{
$set: {
"authentication.oneTimeCode": otp,
"authentication.expiredAt": new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000),
"authentication.isResetPassword": false,
},
}
);

const emailData = emailTemplate.createAccount({
name: email.split("@")[0],
email: user.email,
otp,
});

await emailHelper.sendEmail({
to: user.email,
subject: "Verify your account",
html: emailData.html,
});

return {
message: "User registered successfully. Please verify your email.",
user: {
id: user._id,
email: user.email,
role: user.role,
},
};
};

// =====================================================
// LOGIN
// =====================================================
const logintoDB = async (payload: LoginPayload) => {
const { email, password } = payload;

const user = await User.findOne({ email }).select("+password");
if (!user) {
throw new ApiError(StatusCodes.NOT_FOUND, "User not found with this email");
}

if (!user.verified) {
throw new ApiError(
StatusCodes.BAD_REQUEST,
"Verify your account before login"
);
}

if (user.isBlocked) {
throw new ApiError(
StatusCodes.FORBIDDEN,
"Your account has been blocked. Please contact support."
);
}

if (user.status === STATUS.INACTIVE) {
throw new ApiError(StatusCodes.BAD_REQUEST, "You are an inactive user");
}

const isPasswordMatched = await bcrypt.compare(password, user.password);
if (!isPasswordMatched) {
throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
}

await User.updateOne({ email }, { $set: { lastLogin: new Date() } });

const userData = {
id: user._id,
email: user.email,
role: user.role,
};

const accessToken = jwtHelper.createToken(
userData,
config.jwt.jwt_secret as Secret,
config.jwt.jwt_expire_in as string
);

const refreshToken = jwtHelper.createToken(
userData,
(config.jwt as any).jwt_refresh_secret as Secret,
(config.jwt as any).jwt_refresh_expire_in as string
);

return {
accessToken,
refreshToken,
user: {
id: user._id,
email: user.email,
role: user.role,
intakeCompleted: user.intakeCompleted,
},
};
};

// =====================================================
// REFRESH TOKEN
// =====================================================
const refreshToken = async (payload: RefreshTokenPayload) => {
const { refreshToken } = payload;

if (!refreshToken) {
throw new ApiError(StatusCodes.BAD_REQUEST, "Refresh token is required");
}

const newAccessToken = await (jwtHelper as any).createNewAccessTokenWithRefeshToken(
refreshToken
);

return { accessToken: newAccessToken };
};

// =====================================================
// SEND OTP (Verify or Reset Password)
// =====================================================
const sendOtp = async ({ email, isResetPassword = false }: SendOtpPayload) => {
const user = await User.findOne({ email });
if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

if (!isResetPassword && user.verified) {
throw new ApiError(StatusCodes.BAD_REQUEST, "User already verified");
}

const otp = generateOTP();
const expiredAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

await User.updateOne(
{ email },
{
$set: {
"authentication.oneTimeCode": otp,
"authentication.expiredAt": expiredAt,
"authentication.isResetPassword": isResetPassword,
},
}
);

const emailData = isResetPassword
? emailTemplate.resetPassword({ otp, email: user.email })
: emailTemplate.createAccount({ name: email.split("@")[0], email: user.email, otp });

await emailHelper.sendEmail({
to: user.email,
subject: isResetPassword ? "Reset password OTP" : "Account verification OTP",
html: emailData.html,
});

return { message: "OTP sent successfully" };
};

// =====================================================
// VERIFY USER (OTP)
// =====================================================
const userVerify = async (payload: VerifyUserPayload) => {
const { email, otp } = payload;

const user = await User.findOne({ email }).select("+authentication");
if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

if (user.verified) {
throw new ApiError(StatusCodes.BAD_REQUEST, "User already verified");
}

const savedOtp = user.authentication?.oneTimeCode;
const expiredAt = (user.authentication as any)?.expiredAt;

if (!savedOtp || !expiredAt) {
throw new ApiError(StatusCodes.BAD_REQUEST, "OTP expired or invalid");
}

if (expiredAt.getTime() < Date.now()) {
throw new ApiError(StatusCodes.BAD_REQUEST, "OTP expired or invalid");
}

if (String(savedOtp) !== String(otp)) {
throw new ApiError(StatusCodes.BAD_REQUEST, "Wrong OTP");
}

await User.updateOne(
{ email },
{
$set: { verified: true },
$unset: {
"authentication.oneTimeCode": 1,
"authentication.expiredAt": 1,
"authentication.isResetPassword": 1,
},
}
);

return {
message: "OTP verified successfully",
user: {
id: user._id,
email: user.email,
role: user.role,
intakeCompleted: user.intakeCompleted,
},
};
};

// =====================================================
// RESET PASSWORD (OTP based)
// =====================================================
const resetPasswordWithOtp = async (payload: ResetPasswordWithOtpPayload) => {
const { email, otp, password } = payload;

const user = await User.findOne({ email }).select("+authentication +password");
if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

const savedOtp = user.authentication?.oneTimeCode;
const expiredAt = (user.authentication as any)?.expiredAt;
const isResetPassword = user.authentication?.isResetPassword;

if (!savedOtp || !expiredAt || !isResetPassword) {
throw new ApiError(StatusCodes.BAD_REQUEST, "OTP expired or invalid");
}

if (expiredAt.getTime() < Date.now()) {
throw new ApiError(StatusCodes.BAD_REQUEST, "OTP expired or invalid");
}

if (String(savedOtp) !== String(otp)) {
throw new ApiError(StatusCodes.BAD_REQUEST, "Wrong OTP");
}

const hashedPassword = await bcrypt.hash(
password,
Number(config.bcrypt_salt_rounds)
);

await User.updateOne(
{ email },
{
$set: { password: hashedPassword },
$unset: {
"authentication.oneTimeCode": 1,
"authentication.expiredAt": 1,
"authentication.isResetPassword": 1,
},
}
);

return { message: "Password reset successfully" };
};

export const AuthService = {
registerToDB,
logintoDB,
refreshToken,
sendOtp,
userVerify,
resetPasswordWithOtp,
};
