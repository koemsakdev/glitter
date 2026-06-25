import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ImageOptimizationService } from '../common/services/image-optimization.service';
import { createDiskStorage } from '../common/helpers/multer.helper';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'uploads');
const DEFAULT_MIN_WIDTH = 800;

const storage = createDiskStorage(UPLOAD_DIR);
const fileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      ),
      false,
    );
  }
  callback(null, true);
};

interface UploadResult {
  url: string;
  width: number;
  height: number;
}

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly optimizer: ImageOptimizationService) {}

  /** List previously uploaded images (most recent first) for re-use pickers. */
  @Roles('admin', 'super_admin')
  @Get('images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List previously uploaded images (admin only)' })
  async listImages(): Promise<{ data: { url: string; name: string }[] }> {
    let names: string[] = [];
    try {
      names = await fs.readdir(UPLOAD_DIR);
    } catch {
      return { data: [] };
    }
    const withTimes = await Promise.all(
      names
        .filter((n) => /\.(webp|jpe?g|png|avif)$/i.test(n))
        .map(async (name) => {
          const stat = await fs
            .stat(path.join(UPLOAD_DIR, name))
            .catch(() => null);
          return stat ? { name, mtime: stat.mtimeMs } : null;
        }),
    );
    const data = withTimes
      .filter((f): f is { name: string; mtime: number } => f !== null)
      .sort((a, b) => b.mtime - a.mtime)
      .map((f) => ({ url: `/upload/uploads/${f.name}`, name: f.name }));
    return { data };
  }

  /**
   * Upload + optimize a single image (admin only). Validates a minimum width
   * so storefront banners/icons look sharp. Returns the served URL + final
   * dimensions so the UI can preview / validate aspect ratio.
   */
  @Roles('admin', 'super_admin')
  @Post('image')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and optimize an image (admin only)' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('minWidth') minWidthRaw?: string,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const minWidth = minWidthRaw
      ? Math.max(0, parseInt(minWidthRaw, 10) || 0)
      : DEFAULT_MIN_WIDTH;

    const meta = await sharp(file.path).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    if (width < minWidth) {
      await fs.unlink(file.path).catch(() => undefined);
      throw new BadRequestException(
        `Image is too small. It should be at least ${minWidth}px wide (got ${width}px).`,
      );
    }

    const finalName = await this.optimizer.optimize(file.path);
    const finalMeta = await sharp(
      path.join(UPLOAD_DIR, finalName),
    ).metadata();

    return {
      url: `/upload/uploads/${finalName}`,
      width: finalMeta.width ?? width,
      height: finalMeta.height ?? height,
    };
  }
}
