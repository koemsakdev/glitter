import { diskStorage, StorageEngine } from 'multer';
import { extname } from 'path';

/**
 * Build a URL-safe filename: `<timestamp>-<sanitized-name>.<ext>`.
 * The original name often contains spaces or characters like `#` that break
 * the served URL, so we strip everything down to lowercase a–z, 0–9 and `-`.
 */
function safeFilename(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : '';
  const base = originalName
    .slice(0, originalName.length - ext.length)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${Date.now()}-${base || 'file'}${safeExt}`;
}

export function createDiskStorage(destination: string): StorageEngine {
  return diskStorage({
    destination,
    filename: (
      _req,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      callback(null, safeFilename(file.originalname));
    },
  });
}
