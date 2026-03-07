import { Request, Response } from "express";

import { SessionTypeServices } from "./sessionType.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";


const createSessionType = catchAsync(async (req: Request, res: Response) => {

    const result = await SessionTypeServices.createSessionType(req.user.id , req.body)


sendResponse( res, {
    message: "SessionType Created Successfully",
    success: true,
    statusCode: StatusCodes.CREATED,
    data: result

} )

})



const getMyAllSession = catchAsync(async (req: Request,  res: Response) => {
    const result = await SessionTypeServices.getMyAllSession(req.user.id)

    sendResponse( res, {
        message: "SessionType Retrieved Successfully",
        success: true,
        statusCode: StatusCodes.OK,
        data: result
    })
})

export const SessionTypeController = {
    createSessionType,
    getMyAllSession
}       


