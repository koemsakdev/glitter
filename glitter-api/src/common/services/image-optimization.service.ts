import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const MAX_WIDTH = 1600;
const QUALITY = 85;

@Injectable()
export class ImageOptimizationService {
  private readonly logger = new Logger(ImageOptimizationService.name);

  async optimize(uploadedFilePath: string): Promise<string> {
    const dir = path.dirname(uploadedFilePath);
    const originalFilename = path.basename(uploadedFilePath);
    const originalExt = path.extname(uploadedFilePath); // ".jpg", ".png", etc
    const stem = path.basename(uploadedFilePath, originalExt);
    const targetFilename = `${stem}.webp`;
    const targetPath = path.join(dir, targetFilename);

    try {
      await sharp(uploadedFilePath)
        .rotate()
        .resize({
          width: MAX_WIDTH,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: QUALITY })
        .toFile(targetPath);

      // Delete the original if it wasn't already .webp
      const wasAlreadyWebp = originalExt.toLowerCase() === '.webp';
      if (!wasAlreadyWebp) {
        await this.tryUnlink(uploadedFilePath);
      }

      this.logger.log(`Optimized ${originalFilename} → ${targetFilename}`);
      return targetFilename;
    } catch (error) {
      this.logger.warn(
        `Optimization failed for ${originalFilename}: ${(error as Error).message}. Keeping original.`,
      );
      return originalFilename;
    }
  }

  /**
   * Try to delete a file. Silently ignores if it doesn't exist.
   */
  private async tryUnlink(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return;
      }
      this.logger.warn(
        `Failed to delete ${filePath}: ${(error as Error).message}`,
      );
    }
  }
}
