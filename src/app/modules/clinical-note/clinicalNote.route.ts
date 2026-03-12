import express        from 'express';
import { checkAuth }   from '../../middlewares/checkAuth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES }  from '../../../enums/user';
import { ClinicalNoteController } from './clinicalNote.controller';
import { ClinicalNoteValidation } from './clinicalNote.validation';

const router = express.Router();
router
  .route('/')
  .post(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(ClinicalNoteValidation.createClinicalNoteSchema),
    ClinicalNoteController.createClinicalNote,
  );

router
  .route('/my')
  .get(
    checkAuth(USER_ROLES.PROVIDER),
    ClinicalNoteController.getMyNotes,
  );

router
  .route('/my-notes')
  .get(
    checkAuth(USER_ROLES.CLIENT),
    ClinicalNoteController.getMyClientNotes,
  );

router
  .route('/my-notes/:id')
  .get(
    checkAuth(USER_ROLES.CLIENT),
    validateRequest(ClinicalNoteValidation.noteParamSchema),
    ClinicalNoteController.getNoteById,
  );

router
  .route('/admin')
  .get(
    checkAuth(USER_ROLES.ADMIN),
    ClinicalNoteController.getAllNotesAdmin,
  );


router
  .route('/admin/:id')
  .get(
    checkAuth(USER_ROLES.ADMIN),
    validateRequest(ClinicalNoteValidation.noteParamSchema),
    ClinicalNoteController.getNoteById,
  );

router
  .route('/client/:clientId')
  .get(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(ClinicalNoteValidation.clientIdParamSchema),
    ClinicalNoteController.getClientNotes,
  );

router
  .route('/:id')
  .get(
    checkAuth(USER_ROLES.PROVIDER),                               
    validateRequest(ClinicalNoteValidation.noteParamSchema),
    ClinicalNoteController.getNoteById,
  )
  .patch(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(ClinicalNoteValidation.updateClinicalNoteSchema),
    ClinicalNoteController.updateNote,
  );


router
  .route('/:id/finalize')
  .patch(
    checkAuth(USER_ROLES.PROVIDER),
    validateRequest(ClinicalNoteValidation.noteParamSchema),
    ClinicalNoteController.finalizeNote,
  );

export const ClinicalNoteRoutes = router;
