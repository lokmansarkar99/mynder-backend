import { Types } from "mongoose";
import { CreateSessionTypePayload } from "./session.validation";
import { SessionType } from "./sessionType.model";



const createSessionType = async (providerId: string, payload: CreateSessionTypePayload) => {


    const sessionType = await SessionType.create({
        ...payload, provider: new Types.ObjectId(providerId)
    })


return sessionType



}




export const SessionTypeServices = {
    createSessionType
}