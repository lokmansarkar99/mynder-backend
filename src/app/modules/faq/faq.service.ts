import { StatusCodes } from 'http-status-codes';
import ApiError          from '../../../errors/ApiErrors';
import { FAQ }           from './faq.model';
import { QueryBuilder }  from '../../buillder/queryBuilder';
import {
  TCreateFAQPayload,
  TUpdateFAQPayload,
} from './faq.validation';

// ── 1. Create FAQ 
const createFAQ = async (
  adminId : string,
  payload : TCreateFAQPayload,
) => {
  const faq = await FAQ.create({
    ...payload,
    createdBy: adminId,
  });
  return faq;
};

// ── 2. Get All Published FAQs (Public) 
const getAllPublishedFAQs = async (
  query: Record<string, unknown>,
) => {
  const faqQuery = new QueryBuilder(
    FAQ.find({ isPublished: true }),
    query as Record<string, string>,
  )
    .filter()  
    .sort()     
    .paginate();

  const [data, meta] = await Promise.all([
    faqQuery.modelQuery,
    faqQuery.countTotal(),
  ]);

  return { data, meta };
};

// ── 3. Get All FAQs — Admin Panel 
const getAllFAQsAdmin = async (
  query: Record<string, unknown>,
) => {

const filter = {}


  const faqQuery = new QueryBuilder(
    FAQ.find().populate('createdBy', 'name email'),
    query as Record<string, string>,
  )
    .search(['question', 'answer'])   
    .filter()
    .sort()
    .paginate();

  const [data, meta] = await Promise.all([
    faqQuery.modelQuery,
    faqQuery.countTotal(),
  ]);

  return { data, meta };
};


const getSingleFAQ = async (faqId: string) => {
  const faq = await FAQ
    .findById(faqId)
    .populate('createdBy', 'name email');

  if (!faq) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }
  return faq;
};

// ── 5. Update FAQ 
const updateFAQ = async (
  faqId  : string,
  payload: TUpdateFAQPayload,
) => {
  const faq = await FAQ.findById(faqId);
  if (!faq) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }

  const updated = await FAQ.findByIdAndUpdate(
    faqId,
    { $set: payload },
    { new: true, runValidators: true },
  );
  return updated;
};

// ── 6. Toggle isPublished
const togglePublish = async (faqId: string) => {
  const faq = await FAQ.findById(faqId);
  if (!faq) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }

  const updated = await FAQ.findByIdAndUpdate(
    faqId,
    { $set: { isPublished: !faq.isPublished } },
    { new: true },
  );
  return updated;
};

// ── 7. Delete FAQ
const deleteFAQ = async (faqId: string) => {
  const faq = await FAQ.findById(faqId);
  if (!faq) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }

  await FAQ.findByIdAndDelete(faqId);
  return { deleted: true };
};

export const FAQService = {
  createFAQ,
  getAllPublishedFAQs,
  getAllFAQsAdmin,
  getSingleFAQ,
  updateFAQ,
  togglePublish,
  deleteFAQ,
};
