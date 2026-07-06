import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import * as path from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { createDiskStorage } from '../common/helpers/multer.helper';
import { ImageOptimizationService } from '../common/services/image-optimization.service';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';
import { ReviewsService } from './reviews.service';
import { ReviewDetailResponse } from './types/review-response.type';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'uploads');

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

/** Review submission for a logged-in customer (linked + verified). */
@ApiTags('Reviews (customer)')
@ApiBearerAuth()
@Controller('account/reviews')
export class ReviewsCustomerController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly optimizer: ImageOptimizationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Submit a review as a logged-in customer (auto verified if bought)',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomerReviewDto,
  ): Promise<ReviewDetailResponse> {
    return this.reviewsService.createAsCustomer(userId, dto);
  }

  /** Upload + optimize a single review photo; returns the served URL. */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a review photo (logged-in customer)' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const finalName = await this.optimizer.optimize(file.path);
    return { url: `/upload/uploads/${finalName}` };
  }
}
