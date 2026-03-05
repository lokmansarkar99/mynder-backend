// ── Field → folder mapping (must match fileUploadHandler) ───────────────────
const FIELD_TO_FOLDER: Record<string, string> = {
  profileImage:        'user',
  professionalPhoto:   'provider',
  professionalVideo:   'provider-video',
  cvDocument:          'documents',
  licenseDocument:     'documents',
  insuranceCardFront:  'insurance',
  insuranceCardBack:   'insurance',
  blogImage:           'blog',
  attachment:          'attachments',
};

// ── Union type of all supported field names ──────────────────────────────────
export type IFolderName =
  // User
  | 'profileImage'
  // Provider Intake
  | 'professionalPhoto'
  | 'professionalVideo'
  | 'cvDocument'
  | 'licenseDocument'
  // Client Intake
  | 'insuranceCardFront'
  | 'insuranceCardBack'
  // Blog
  | 'blogImage'
  // Messaging
  | 'attachment';

// ── Single file path ─────────────────────────────────────────────────────────
// Returns: "/user/filename.jpg" — leading slash for URL construction
export const getSingleFilePath = (
  files: any,
  fieldName: IFolderName
): string | undefined => {
  const fileField = files?.[fieldName];

  if (Array.isArray(fileField) && fileField.length > 0) {
    const folder = FIELD_TO_FOLDER[fieldName] ?? fieldName;
    return `/${folder}/${fileField[0].filename}`;
  }

  return undefined;
};

// ── Multiple file paths ──────────────────────────────────────────────────────
// Returns: ["/attachments/file1.jpg", "/attachments/file2.pdf"]
export const getMultipleFilesPath = (
  files: any,
  fieldName: IFolderName
): string[] | undefined => {
  const fileField = files?.[fieldName];

  if (Array.isArray(fileField) && fileField.length > 0) {
    const folder = FIELD_TO_FOLDER[fieldName] ?? fieldName;
    return fileField.map((f: Express.Multer.File) => `/${folder}/${f.filename}`);
  }

  return undefined;
};

// ── Usage reference ──────────────────────────────────────────────────────────
// const profileImg     = getSingleFilePath(files, 'profileImage');
// const proPhoto       = getSingleFilePath(files, 'professionalPhoto');
// const proVideo       = getSingleFilePath(files, 'professionalVideo');
// const cv             = getSingleFilePath(files, 'cvDocument');
// const license        = getSingleFilePath(files, 'licenseDocument');
// const cardFront      = getSingleFilePath(files, 'insuranceCardFront');
// const cardBack       = getSingleFilePath(files, 'insuranceCardBack');
// const cover          = getSingleFilePath(files, 'blogImage');
// const attachments    = getMultipleFilesPath(files, 'attachment');
