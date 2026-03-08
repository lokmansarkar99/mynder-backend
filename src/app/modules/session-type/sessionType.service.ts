import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiErrors';
import { StatusCodes } from 'http-status-codes';
import {
  CreateSessionTypePayload,
  UpdateSessionTypePayload,
  ToggleSessionTypePayload,
} from './session.validation';
import { SessionType } from './sessionType.model';

const createSessionType = async (
  providerId: string,
  payload:    CreateSessionTypePayload,
) => {
  return await SessionType.create({
    ...payload,
    provider: new Types.ObjectId(providerId),
  });
};


const getMyAllSession = async (providerId: string) => {
  return await SessionType.find({
    provider: new Types.ObjectId(providerId),
  }).sort({ createdAt: -1 });
};


const getProviderActiveSessions = async (providerId: string) => {
  return await SessionType.find({
    provider: new Types.ObjectId(providerId),
    isActive: true, 
  }).sort({ duration: 1 });
};

const updateSessionType = async (
  sessionTypeId: string,
  providerId:    string,
  payload:       UpdateSessionTypePayload,
) => {
  
  const session = await SessionType.findById(sessionTypeId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session type not found');
  }
  if (session.provider.toString() !== providerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to update this session type');
  }

  return await SessionType.findByIdAndUpdate(
    sessionTypeId,
    { $set: payload },
    { returnDocument: 'after' }, 
  );
};

const deleteSessionType = async (
  sessionTypeId: string,
  providerId:    string,
) => {

  const session = await SessionType.findById(sessionTypeId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session type not found');
  }
  if (session.provider.toString() !== providerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to delete this session type');
  }

  return await SessionType.findByIdAndDelete(sessionTypeId);
};

const toggleSessionType = async (
  sessionTypeId: string,
  providerId:    string,
  payload:       ToggleSessionTypePayload,
) => {
  
  const session = await SessionType.findById(sessionTypeId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session type not found');
  }
  if (session.provider.toString() !== providerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to toggle this session type');
  }

  return await SessionType.findByIdAndUpdate(
    sessionTypeId,
    { $set: { isActive: payload.isActive } },  
    { returnDocument: 'after' },
  );
};

export const SessionTypeServices = {
  createSessionType,
  getMyAllSession,
  getProviderActiveSessions, 
  updateSessionType,
  deleteSessionType,
  toggleSessionType,         
}; 
