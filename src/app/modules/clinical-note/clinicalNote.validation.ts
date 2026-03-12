import { z } from 'zod';
import { checkValidID } from '../../../shared/chackValid';

const NOTE_TYPES = ['soap', 'progress', 'intake', 'quick'] as const;
const noteIdParam = z.object({ id: checkValidID('Invalid clinical note ID') });

// ── 1. Create Note ────────────────────────────────────────────────
const createClinicalNoteSchema = z.object({
  body: z
    .object({
      client:      checkValidID('Invalid client ID'),
      appointment: checkValidID('Invalid appointment ID').optional(),

      noteType: z.enum(NOTE_TYPES).default('soap'),

      // SOAP fields (required when noteType is soap/progress/intake)
      subjective: z.string().max(5000).optional().default(''),
      objective:  z.string().max(5000).optional().default(''),
      assessment: z.string().max(5000).optional().default(''),
      plan:       z.string().max(5000).optional().default(''),

      // Quick note (required when noteType is quick)
      quickNote: z.string().max(2000).optional().default(''),
    })
    .refine(
      (data) => {
        // For quick notes, quickNote must have content
        if (data.noteType === 'quick' && !data.quickNote?.trim()) return false;
        return true;
      },
      { message: 'quickNote is required for noteType "quick"', path: ['quickNote'] },
    ),
});

// ── 2. Update Note ────────────────────────────────────────────────
const updateClinicalNoteSchema = z.object({
  params: noteIdParam,
  body: z.object({
    subjective: z.string().max(5000).optional(),
    objective:  z.string().max(5000).optional(),
    assessment: z.string().max(5000).optional(),
    plan:       z.string().max(5000).optional(),
    quickNote:  z.string().max(2000).optional(),
  }),
});

// ── 3. Single ID param ────────────────────────────────────────────
const noteParamSchema = z.object({ params: noteIdParam });

// ── 4. Client ID param ────────────────────────────────────────────
const clientIdParamSchema = z.object({
  params: z.object({ clientId: checkValidID('Invalid client ID') }),
});

export const ClinicalNoteValidation = {
  createClinicalNoteSchema,
  updateClinicalNoteSchema,
  noteParamSchema,
  clientIdParamSchema,
};

export type TCreateClinicalNotePayload = z.infer<typeof createClinicalNoteSchema>['body'];
export type TUpdateClinicalNotePayload = z.infer<typeof updateClinicalNoteSchema>['body'];
