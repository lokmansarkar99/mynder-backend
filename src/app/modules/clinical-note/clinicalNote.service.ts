import { Types }        from 'mongoose';
import { StatusCodes }   from 'http-status-codes';
import ApiError          from '../../../errors/ApiErrors';
import { ClinicalNote }  from './clinicalNote.model';
import { Appointment }   from '../appointment/appointment.model';
import { QueryBuilder }  from '../../buillder/queryBuilder';
import {
  TCreateClinicalNotePayload,
  TUpdateClinicalNotePayload,
} from './clinicalNote.validation';


// CREATE NOTE  (Provider)

const createClinicalNote = async (
  providerId: string,
  payload:    TCreateClinicalNotePayload,
) => {
 
  if (payload.appointment) {
    const appointment = await Appointment.findById(payload.appointment);

    if (!appointment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
    }

    if (appointment.provider.toString() !== providerId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'This appointment does not belong to you',
      );
    }

    if (appointment.client.toString() !== String(payload.client)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Appointment client does not match the provided client',
      );
    }
  }

  const note = await ClinicalNote.create({
    ...payload,
    provider: new Types.ObjectId(providerId),
    client:   new Types.ObjectId(String(payload.client)),
  });

  const populated = await ClinicalNote.findById(note._id)
    .populate('client',      'name profileImage')
    .populate('provider',    'name')
    .populate('appointment', 'scheduledAt sessionName status');

  return populated;
};


// GET ALL NOTES FOR A CLIENT  (Provider)

const getClientNotes = async (
  providerId: string,
  clientId:   string,
  query:      Record<string, unknown>,
) => {
  const notesQuery = new QueryBuilder(
    ClinicalNote.find({
      provider: new Types.ObjectId(providerId),
      client:   new Types.ObjectId(clientId),
    })
      .populate('appointment', 'scheduledAt sessionName status')
      .sort({ createdAt: -1 }),
    query as Record<string, string>,
  )
    .filter()   
    .paginate();

  const [data, meta] = await Promise.all([
    notesQuery.modelQuery,
    notesQuery.countTotal(),
  ]);

  return { data, meta };
};


//  3. GET SPECIFIC NOTE BY ID  

const getNoteById = async (
  noteId: string,
  userId: string,
  role:   string,
) => {
  // await lean — provider/client are raw ObjectIds, .toString() returns the id string
  const raw = await ClinicalNote.findById(noteId).lean();

  if (!raw) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Clinical note not found');
  }

  //  RBAC on raw (unpopulated) — ObjectId.toString() works correctly here
  if (role === 'PROVIDER' && raw.provider.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }
  if (role === 'CLIENT' && raw.client.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }
  // Admin: unrestricted

  
  const note = await ClinicalNote.findById(noteId)
    .populate('client',      'name profileImage')
    .populate('provider',    'name')
    .populate('appointment', 'scheduledAt sessionName status');

  return note;
};



//  UPDATE NOTE  (Provider — only if NOT finalized)

const updateNote = async (
  noteId:     string,
  providerId: string,
  payload:    TUpdateClinicalNotePayload,
) => {
  const note = await ClinicalNote.findById(noteId);

  if (!note) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Clinical note not found');
  }

  // ── Guard: only the authoring provider can update
  if (note.provider.toString() !== providerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only edit your own notes');
  }

  // ── Guard: finalized notes are immutable
  if (note.isFinalized) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Finalized notes cannot be edited',
    );
  }

  const updated = await ClinicalNote.findByIdAndUpdate(
    noteId,
    { $set: payload },
    { new: true, runValidators: true },
  )
    .populate('client',      'name profileImage')
    .populate('provider',    'name')
    .populate('appointment', 'scheduledAt sessionName');

  return updated;
};


//  5. FINALIZE & SIGN NOTE  (Provider)

const finalizeNote = async (noteId: string, providerId: string) => {
  const note = await ClinicalNote.findById(noteId);

  if (!note) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Clinical note not found');
  }

  // ── Guard: only the authoring provider can finalize
  if (note.provider.toString() !== providerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only finalize your own notes');
  }

  // ── Guard: already finalized
  if (note.isFinalized) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Note is already finalized');
  }

  // ── Guard: SOAP notes need at least subjective before finalization
  if (
    note.noteType !== 'quick' &&
    !note.subjective?.trim()
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Subjective field must be filled before finalizing a SOAP note',
    );
  }

  const now = new Date();

  const updated = await ClinicalNote.findByIdAndUpdate(
    noteId,
    {
      $set: {
        isFinalized: true,
        finalizedAt: now,
        isSigned:    true,
        signedAt:    now,
      },
    },
    { new: true },
  )
    .populate('client',      'name profileImage')
    .populate('provider',    'name')
    .populate('appointment', 'scheduledAt sessionName');

  return updated;
};


//  6. GET MY NOTES  (Provider — all notes they authored)

const getMyNotes = async (
  providerId: string,
  query:      Record<string, unknown>,
) => {
  const notesQuery = new QueryBuilder(
    ClinicalNote.find({ provider: new Types.ObjectId(providerId) })
      .populate('client',      'name profileImage')
      .populate('appointment', 'scheduledAt sessionName'),
    query as Record<string, string>,
  )
    .filter()   // ?noteType=soap&isFinalized=false
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    notesQuery.modelQuery,
    notesQuery.countTotal(),
  ]);

  return { data, meta };
};


//  7. GET MY NOTES  (Client — read-only, notes written about them)

const getMyClientNotes = async (
  clientId: string,
  query:    Record<string, unknown>,
) => {
  const notesQuery = new QueryBuilder(
    ClinicalNote.find({ client: new Types.ObjectId(clientId) })
      .populate('provider',    'name profileImage')
      .populate('appointment', 'scheduledAt sessionName'),
    query as Record<string, string>,
  )
    .filter()
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    notesQuery.modelQuery,
    notesQuery.countTotal(),
  ]);

  return { data, meta };
};


//  8. GET ALL NOTES — ADMIN

const getAllNotesAdmin = async (query: Record<string, unknown>) => {
  const notesQuery = new QueryBuilder(
    ClinicalNote.find()
      .populate('client',      'name profileImage')
      .populate('provider',    'name')
      .populate('appointment', 'scheduledAt sessionName'),
    query as Record<string, string>,
  )
    .filter()
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    notesQuery.modelQuery,
    notesQuery.countTotal(),
  ]);

  return { data, meta };
};

export const ClinicalNoteService = {
  createClinicalNote,
  getClientNotes,
  getNoteById,
  updateNote,
  finalizeNote,
  getMyNotes,
  getMyClientNotes,
  getAllNotesAdmin,
};
