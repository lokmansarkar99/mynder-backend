import { Request } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import ApiError from '../../errors/ApiErrors';

// ── Per-field upload folder map ──────────────────────────────────────────────
const FIELD_FOLDER_MAP: Record<string, string> = {
  profileImage:        'user',            // User & intake profile photo
  professionalPhoto:   'provider',        // Provider Step 1 professional photo
  professionalVideo:   'provider-video',  // Provider Step 1 optional video
  cvDocument:          'documents',       // Provider Step 2 CV (PDF)
  licenseDocument:     'documents',       // Provider Step 2 license (PDF/Image)
  insuranceCardFront:  'insurance',       // Client Step 3 insurance card front
  insuranceCardBack:   'insurance',       // Client Step 3 insurance card back
  blogImage:           'blog',            // Blog module cover image
  attachment:          'attachments',     // Messaging module file attachment
};

// ── Per-field size limits (bytes) ────────────────────────────────────────────
const FIELD_SIZE_LIMIT: Record<string, number> = {
  profileImage:        2  * 1024 * 1024,  //  2MB — UI spec: max 2MB
  professionalPhoto:   5  * 1024 * 1024,  //  5MB — UI spec: max 5MB
  professionalVideo:   50 * 1024 * 1024,  // 50MB — video upload
  cvDocument:          10 * 1024 * 1024,  // 10MB — UI spec: max 10MB
  licenseDocument:     10 * 1024 * 1024,  // 10MB — UI spec: max 10MB
  insuranceCardFront:  5  * 1024 * 1024,  //  5MB
  insuranceCardBack:   5  * 1024 * 1024,  //  5MB
  blogImage:           5  * 1024 * 1024,  //  5MB
  attachment:          10 * 1024 * 1024,  // 10MB — messaging attachment
};

// ── Allowed MIME types per field ─────────────────────────────────────────────
const IMAGE_MIMES   = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const VIDEO_MIMES   = ['video/mp4'];
const PDF_MIME      = 'application/pdf';
const DOC_MIMES     = ['application/pdf', 'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const FIELD_MIME_MAP: Record<string, string[]> = {
  profileImage:        IMAGE_MIMES,
  professionalPhoto:   IMAGE_MIMES,
  professionalVideo:   VIDEO_MIMES,
  cvDocument:          DOC_MIMES,                      // PDF or Word
  licenseDocument:     [...IMAGE_MIMES, PDF_MIME],     // PDF or Image
  insuranceCardFront:  IMAGE_MIMES,
  insuranceCardBack:   IMAGE_MIMES,
  blogImage:           IMAGE_MIMES,
  attachment:          [...IMAGE_MIMES, PDF_MIME, ...VIDEO_MIMES], // all types
};

// ── Helper: create folder if not exists ──────────────────────────────────────
const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

// ── Main handler ─────────────────────────────────────────────────────────────
const fileUploadHandler = () => {
  const baseUploadDir = path.join(process.cwd(), 'uploads');
  ensureDir(baseUploadDir);

  // ── Storage ───────────────────────────────────────────────────────────────
  const storage = multer.diskStorage({
    destination: (_req, file, cb) => {
      const folder = FIELD_FOLDER_MAP[file.fieldname];

      if (!folder) {
        return cb(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            `File field "${file.fieldname}" is not supported`
          ),
          ''
        );
      }

      const uploadDir = path.join(baseUploadDir, folder);
      ensureDir(uploadDir);
      cb(null, uploadDir);
    },

    filename: (_req, file, cb) => {
      const fileExt  = path.extname(file.originalname);
      const baseName = file.originalname
        .replace(fileExt, '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''); // strip special chars
      cb(null, `${baseName}-${Date.now()}${fileExt}`);
    },
  });

  // ── File filter ───────────────────────────────────────────────────────────
  const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    const allowedMimes = FIELD_MIME_MAP[file.fieldname];

    // Unknown field
    if (!allowedMimes) {
      return cb(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          `File field "${file.fieldname}" is not supported`
        )
      );
    }

    // MIME type check
    if (!allowedMimes.includes(file.mimetype)) {
      const readable = allowedMimes
        .map(m => m.split('/')[1].toUpperCase())
        .join(', ');
      return cb(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          `"${file.fieldname}" only accepts: ${readable}`
        )
      );
    }

    cb(null, true);
  };

  // ── Return multer instance ────────────────────────────────────────────────
  // Global limit = 50MB (covers video). Per-field size validation handled
  // in service layer using FIELD_SIZE_LIMIT map (exported below).
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 },
  }).fields([
    // ── User ────────────────────────────────
    { name: 'profileImage',       maxCount: 1 },

    // ── Provider Intake ─────────────────────
    { name: 'professionalPhoto',  maxCount: 1 },
    { name: 'professionalVideo',  maxCount: 1 },
    { name: 'cvDocument',         maxCount: 1 },
    { name: 'licenseDocument',    maxCount: 1 },

    // ── Client Intake ───────────────────────
    { name: 'insuranceCardFront', maxCount: 1 },
    { name: 'insuranceCardBack',  maxCount: 1 },

    // ── Blog ────────────────────────────────
    { name: 'blogImage',          maxCount: 1 },

    // ── Messaging attachment ─────────────────
    { name: 'attachment',         maxCount: 3 },
  ]);
};

export default fileUploadHandler;
export { FIELD_SIZE_LIMIT };
