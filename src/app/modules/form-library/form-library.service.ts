import { Types }       from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError        from '../../../errors/ApiErrors';
import { FormLibrary } from './form-library.model';
import { TCreateFormPayload, TUpdateFormPayload } from './form-library.validation';

// Default documents auto-created for every new provider
export const DEFAULT_FORM_TEMPLATES = [
  { title: 'Informed Consent',                  category: 'consent',    order: 0 },
  { title: 'Practice Policies',                 category: 'policy',     order: 1 },
  { title: 'Privacy Practices',                 category: 'privacy',    order: 2 },
  { title: 'Consent Forms',                     category: 'consent',    order: 3 },
  { title: 'Telehealth Informed Consent',       category: 'telehealth', order: 4 },
  { title: 'Consent to Treat & Guarantee of Payment', category: 'payment', order: 5 },
];

// ── 1. Seed default forms for a new provider ──────────────────────
// Call this when provider account is created
export const seedDefaultForms = async (providerId: string) => {
  const existing = await FormLibrary.countDocuments({
    provider: new Types.ObjectId(providerId),
  });

  // Only seed if provider has no forms yet
  if (existing > 0) return;

  const docs = DEFAULT_FORM_TEMPLATES.map(t => ({
    provider: new Types.ObjectId(providerId),
    title:    t.title,
    category: t.category,
    content:  '',           // empty — provider fills later
    order:    t.order,
    isActive: true,
  }));

  await FormLibrary.insertMany(docs);
};

// ── 2. Get all forms for provider ────────────────────────────────
const getAllForms = async (providerId: string) => {
  return FormLibrary.find({
    provider: new Types.ObjectId(providerId),
    isActive: true,
  })
    .sort({ order: 1 })
    .lean();
};

// ── 3. Get single form by ID ──────────────────────────────────────
const getFormById = async (formId: string, providerId: string) => {
  const form = await FormLibrary.findOne({
    _id:      new Types.ObjectId(formId),
    provider: new Types.ObjectId(providerId),
  }).lean();

  if (!form) throw new ApiError(StatusCodes.NOT_FOUND, 'Form not found');
  return form;
};

// ── 4. Create new form ────────────────────────────────────────────
const createForm = async (providerId: string, payload: TCreateFormPayload) => {
  // Auto-assign next order
  const last = await FormLibrary.findOne({
    provider: new Types.ObjectId(providerId),
  }).sort({ order: -1 }).lean();

  const order = payload.order ?? (last ? last.order + 1 : 0);

  return FormLibrary.create({
    provider: new Types.ObjectId(providerId),
    ...payload,
    order,
  });
};

// ── 5. Update form (title + rich text content) ────────────────────
const updateForm = async (
  formId:     string,
  providerId: string,
  payload:    TUpdateFormPayload,
) => {
  const form = await FormLibrary.findOne({
    _id:      new Types.ObjectId(formId),
    provider: new Types.ObjectId(providerId),
  });

  if (!form) throw new ApiError(StatusCodes.NOT_FOUND, 'Form not found');

  return FormLibrary.findByIdAndUpdate(
    formId,
    { $set: payload },
    { returnDocument: 'after' },
  );
};

// ── 6. Delete form ────────────────────────────────────────────────
const deleteForm = async (formId: string, providerId: string) => {
  const form = await FormLibrary.findOne({
    _id:      new Types.ObjectId(formId),
    provider: new Types.ObjectId(providerId),
  });

  if (!form) throw new ApiError(StatusCodes.NOT_FOUND, 'Form not found');

  await FormLibrary.findByIdAndDelete(formId);
  return { message: 'Form deleted successfully' };
};

// ── 7. Reorder forms (drag & drop) ───────────────────────────────
const reorderForms = async (
  providerId: string,
  forms: { id: string; order: number }[],
) => {
  const bulkOps = forms.map(({ id, order }) => ({
    updateOne: {
      filter: {
        _id:      new Types.ObjectId(id),
        provider: new Types.ObjectId(providerId),
      },
      update: { $set: { order } },
    },
  }));

  await FormLibrary.bulkWrite(bulkOps);
  return { message: 'Forms reordered successfully' };
};

export const FormLibraryService = {
  seedDefaultForms,
  getAllForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  reorderForms,
};
