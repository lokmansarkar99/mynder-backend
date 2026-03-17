import { Types }       from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError        from '../../../errors/ApiErrors';
import { IntakeFormConfig } from './intake-form-config.model';

// ── PUBLIC: Get active fields for a form (grouped by step) ────────
// Used by CLIENT and PROVIDER to render their intake form
const getPublicFormConfig = async (formType: 'CLIENT' | 'PROVIDER') => {
  const fields = await IntakeFormConfig
    .find({ formType, isActive: true })
    .sort({ step: 1, order: 1 })
    .lean();

  // Group by step → { step1: [...], step2: [...] }
  return fields.reduce((acc: any, field) => {
    const key = `step${field.step}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(field);
    return acc;
  }, {});
};

// ── ADMIN: Get ALL fields (active + inactive) grouped by step ─────
// Admin sees everything including hidden fields
const getAdminFormConfig = async (formType: 'CLIENT' | 'PROVIDER') => {
  const fields = await IntakeFormConfig
    .find({ formType })
    .sort({ step: 1, order: 1 })
    .lean();

  return fields.reduce((acc: any, field) => {
    const key = `step${field.step}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(field);
    return acc;
  }, {});
};

// ── ADMIN: Add new CUSTOM field ───────────────────────────────────
const addField = async (payload: {
  formType:   'CLIENT' | 'PROVIDER';
  step:       number;
  label:      string;
  fieldType:  string;
  isRequired: boolean;
  options?:   string[];
}) => {
  // Auto-generate unique fieldKey
  const fieldKey = `custom_${Date.now()}`;

  const last = await IntakeFormConfig
    .findOne({ formType: payload.formType, step: payload.step })
    .sort({ order: -1 })
    .lean();

  const order = last ? last.order + 1 : 0;

  return IntakeFormConfig.create({
    ...payload,
    fieldKey,
    isCore:   false,  // custom → can be deleted
    isActive: true,
    order,
  });
};

// ── ADMIN: Update field ───────────────────────────────────────────
// Core fields: label, isRequired, options only
// Custom fields: all fields
const updateField = async (
  fieldId: string,
  payload: {
    label?:      string;
    isRequired?: boolean;
    options?:    string[];
    isActive?:   boolean;
    order?:      number;
    step?:       number;
  },
) => {
  const field = await IntakeFormConfig.findById(fieldId);
  if (!field) throw new ApiError(StatusCodes.NOT_FOUND, 'Field not found');

  // Core fields — only allow safe edits
  if (field.isCore) {
    const allowedKeys = ['label', 'isRequired', 'options', 'isActive', 'order'];
    const blockedKeys = Object.keys(payload).filter(k => !allowedKeys.includes(k));
    if (blockedKeys.length > 0) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        `Core fields cannot update: ${blockedKeys.join(', ')}`,
      );
    }
  }

  return IntakeFormConfig.findByIdAndUpdate(
    fieldId,
    { $set: payload },
    { returnDocument: 'after' },
  );
};

// ── ADMIN: Delete field ───────────────────────────────────────────
const deleteField = async (fieldId: string) => {
  const field = await IntakeFormConfig.findById(fieldId);
  if (!field) throw new ApiError(StatusCodes.NOT_FOUND, 'Field not found');

  if (field.isCore) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Core fields cannot be deleted. Use toggle to hide instead.',
    );
  }

  await IntakeFormConfig.findByIdAndDelete(fieldId);
  return { message: 'Field deleted successfully' };
};

// ── ADMIN: Toggle active/inactive ────────────────────────────────
const toggleField = async (fieldId: string) => {
  const field = await IntakeFormConfig.findById(fieldId);
  if (!field) throw new ApiError(StatusCodes.NOT_FOUND, 'Field not found');

  return IntakeFormConfig.findByIdAndUpdate(
    fieldId,
    { $set: { isActive: !field.isActive } },
    { returnDocument: 'after' },
  );
};

// ── ADMIN: Reorder fields within a step ──────────────────────────
const reorderFields = async (
  fields: { id: string; order: number }[],
) => {
  const bulkOps = fields.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(id) },
      update: { $set: { order } },
    },
  }));

  await IntakeFormConfig.bulkWrite(bulkOps);
  return { message: 'Fields reordered successfully' };
};

export const IntakeFormConfigService = {
  // Public
  getPublicFormConfig,
  // Admin
  getAdminFormConfig,
  addField,
  updateField,
  deleteField,
  toggleField,
  reorderFields,
};
