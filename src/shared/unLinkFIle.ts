import fs from 'fs';
import path from 'path';

// ── Single file delete ───────────────────────────────────────────────────────
// filePath example:  "/user/profile-1741158600123.jpg"
//                    "user/profile-1741158600123.jpg"   (both work)
// resolves to:       /project-root/uploads/user/profile-1741158600123.jpg
const unlinkFile = (filePath: string): void => {
  if (!filePath) return;

  // Strip leading slash if present
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  const fullPath  = path.join(process.cwd(), 'uploads', cleanPath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

// ── Multiple files delete ────────────────────────────────────────────────────
// Messaging attachments, multiple insurance cards, etc.
export const unlinkMultipleFiles = (filePaths: string[]): void => {
  if (!Array.isArray(filePaths) || filePaths.length === 0) return;
  filePaths.forEach(filePath => unlinkFile(filePath));
};

export default unlinkFile;
