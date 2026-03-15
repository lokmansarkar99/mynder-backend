import {Schema, model} from "mongoose"
import { IUser , UserModal} from "./user.interface"
import { STATUS, USER_ROLES } from "../../../enums/user"
import bcrypt from 'bcrypt';
import config from "../../../config";

const userSchema = new Schema(
{
name: {
type: String,
},

role: {
type:String,
enum: Object.values(USER_ROLES),
required: true,
default: USER_ROLES.CLIENT
},

email: {
type: String,
required: true,
unique:true,
lowercase: true,
},

profileImage: {
type: String,
required: false,
default: ""
},

isDeleted: { type: Boolean, default: false },

isBlocked: { type: Boolean, default: false },

intakeCompleted: { type: Boolean, default: false },

lastLogin: { type: Date, default: null },

googleId: { type: String, default: null, select: false },

password: {
type: String,
required: true,
select: false,
minlength: 8
},

status: {
type: String,
enum: Object.values(STATUS),
default: STATUS.ACTIVE
},

verified: {
type: Boolean,
default: false
},

authentication: {
type: {
isResetPassword: {
type: Boolean,
default:false
},
oneTimeCode: {
type: Number,
default: null
},
expiredAt: {
type: Date,
default: null
}
},
default: {
isResetPassword: false,
oneTimeCode: null,
expiredAt: null
}, 
select: false
}

}, {
timestamps: true,
toJSON: {virtuals: true},
toObject: {virtuals: true}
})

// exist user check

userSchema.statics.isExistUserById = async (id:string) => {
const isExist = User.findById(id)
return isExist
}

userSchema.statics.isExistUserByEmail = async (email: string) => {
const isExist = User.findOne({email}) 
return isExist
}

userSchema.statics.isAccountCreated = async (id: string) => {
const isExist = User.findById(id)
return isExist
}

userSchema.statics.isMatchPassword = async (pasword: string, hashPassword: string) => {
return await bcrypt.compare(pasword, hashPassword)
}

// Middlewares

userSchema.pre("save", async function () {
if(this.isNew) {

if(this.password) {
this.password = await bcrypt.hash(this.password,Number(config.bcrypt_salt_rounds),)

}
}

else{
if(this.isModified("password") && this.password ) {
this.password = await bcrypt.hash(this.password, Number(config.bcrypt_salt_rounds))
}
}

})

userSchema.virtual('providerProfile', {
  ref:        'ProviderProfile',  // model name
  localField: '_id',              // User._id
  foreignField: 'user',           // ProviderProfile.user
  justOne:    true,
});

export const User = model<IUser, UserModal>("User", userSchema)
