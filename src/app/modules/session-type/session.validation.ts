import {z} from "zod";
import { checkValidID } from "../../../shared/chackValid";


const createSessionTypeSchema = z.object({
    body: z.object({
        name: z.string().min(3, 'Name must be at least 3 characters'),
        duration: z.number().positive('Duration must be a positive number'),
        price: z.number().nonnegative('Price must be a non-negative number'),
    })
})


const updateSessionTypeSchema = z.object({  
    params: z.object({
        id:checkValidID("Invalid User ID")
    }),
    body: z.object({
        name: z.string().min(3, 'Name must be at least 3 characters').optional(),
        duration: z.number().positive('Duration must be a positive number').optional(),
        price: z.number().nonnegative('Price must be a non-negative number').optional(),
    })
})      


const deleteSessionTypeSchema = z.object({
    params: z.object({
        id:checkValidID("Invalid User ID")
    }),
})


export const SessionTypeValidation = {
    createSessionTypeSchema,
    updateSessionTypeSchema,
    deleteSessionTypeSchema 
}


// Payload types
export type CreateSessionTypePayload = z.infer<typeof createSessionTypeSchema>['body'];

export type UpdateSessionTypePayload = z.infer<typeof updateSessionTypeSchema>['body']
