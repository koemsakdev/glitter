import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as path from 'path';
import { createDiskStorage } from '../common/helpers/multer.helper';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ReorderImagesDto } from './dto/reorder-images.dto';
import { ProductImagesService } from './product-image.service';
import {
  ProductImageBulkResponseDto,
  ProductImageDetailResponseDto,
  ProductImageListResponseDto,
} from './dto/product-image-response.dto';
import {
  ProductImageBulkResponse,
  ProductImageDetailResponse,
  ProductImageListResponse,
} from './types/product-image-response.type';
import type { ImageType } from './entities/product-image.entity';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

// Upload destination
const PRODUCT_IMAGE_UPLOAD_DIR = path.join(
  process.cwd(),
  'uploads',
  'products',
);
const productImageStorage = createDiskStorage(PRODUCT_IMAGE_UPLOAD_DIR);

// Allowed file types (images only)
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per image (larger than categories/brands for product photos)
const MAX_BULK_FILES = 10;

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      ),
      false,
    );
  }
  callback(null, true);
};

@ApiTags('Product Images')
@ApiBearerAuth()
@Controller('product-images')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  /**
   * Upload a single product image
   * POST /api/product-images
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: productImageStorage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a single product image',
    description:
      'Uploads one image for a product. Only one primary image is allowed per product — if set to primary, any existing primary image is demoted to gallery.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          format: 'uuid',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (PNG, JPEG, WebP) - max 10MB',
        },
        imageAltTextEn: {
          type: 'string',
          example: 'Front view of Gucci GG Marmont shoulder bag',
        },
        imageAltTextKm: {
          type: 'string',
          example: 'រូបភាពផ្នែកខាងមុខនៃកាបូប Gucci GG Marmont',
        },
        imageType: {
          type: 'string',
          enum: ['primary', 'gallery', 'thumbnail', 'zoom'],
          default: 'gallery',
        },
        displayOrder: {
          type: 'number',
          example: 0,
        },
      },
      required: ['productId', 'image'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: ProductImageDetailResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiResponse({
    status: 400,
    description: 'Invalid input or product not found',
  })
  async create(
    @Body() dto: CreateProductImageDto,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<ProductImageDetailResponse> {
    if (!image) {
      throw new BadRequestException('Image file is required');
    }
    if (image.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      );
    }

    return this.productImagesService.create(dto, image);
  }

  /**
   * Upload multiple images at once
   * POST /api/product-images/bulk
   */
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('images', MAX_BULK_FILES, {
      storage: productImageStorage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload multiple product images at once',
    description: `Bulk upload up to ${MAX_BULK_FILES} images for a single product. All uploaded images will share the same imageType (default: gallery). displayOrder is auto-assigned sequentially.`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: {
          type: 'string',
          format: 'uuid',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: `Multiple image files (max ${MAX_BULK_FILES}, 10MB each)`,
        },
        imageType: {
          type: 'string',
          enum: ['primary', 'gallery', 'thumbnail', 'zoom'],
          default: 'gallery',
        },
      },
      required: ['productId', 'images'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    type: ProductImageBulkResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  async createBulk(
    @Body('productId') productId: string,
    @Body('imageType') imageType: ImageType = 'gallery',
    @UploadedFiles() images: Express.Multer.File[],
  ): Promise<ProductImageBulkResponse> {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }
    if (!images || images.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }

    return this.productImagesService.createBulk(productId, images, imageType);
  }

  /**
   * Get all images for a specific product
   * GET /api/product-images/product/:productId
   */
  @Get('product/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all images for a product',
    description:
      'Retrieves all images for a product, ordered by displayOrder (ascending)',
  })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'Product UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Images retrieved successfully',
    type: ProductImageListResponseDto,
  })
  @Public()
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findByProduct(
    @Param('productId') productId: string,
  ): Promise<ProductImageListResponse> {
    return this.productImagesService.findByProduct(productId);
  }

  /**
   * Get the primary image for a product
   * GET /api/product-images/product/:productId/primary
   */
  @Get('product/:productId/primary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get primary image for a product',
    description:
      'Retrieves the designated primary image for a product (useful for product cards / listing)',
  })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'Product UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Primary image retrieved successfully',
    type: ProductImageDetailResponseDto,
  })
  @Public()
  @ApiResponse({ status: 404, description: 'No primary image found' })
  async findPrimary(
    @Param('productId') productId: string,
  ): Promise<ProductImageDetailResponse> {
    return this.productImagesService.findPrimary(productId);
  }

  /**
   * Get a specific image by ID
   * GET /api/product-images/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get image by ID',
    description: 'Retrieves a specific product image by its UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Image UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Image retrieved successfully',
    type: ProductImageDetailResponseDto,
  })
  @Public()
  @ApiResponse({ status: 404, description: 'Image not found' })
  async findOne(@Param('id') id: string): Promise<ProductImageDetailResponse> {
    return this.productImagesService.findOne(id);
  }

  /**
   * Update an image (replace file and/or metadata)
   * PATCH /api/product-images/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: productImageStorage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update an image',
    description:
      'Updates image metadata and optionally replaces the image file. Old file is deleted from disk if replaced.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Image UUID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'New image file (optional)',
        },
        imageAltTextEn: { type: 'string' },
        imageAltTextKm: { type: 'string' },
        imageType: {
          type: 'string',
          enum: ['primary', 'gallery', 'thumbnail', 'zoom'],
        },
        displayOrder: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Image updated successfully',
    type: ProductImageDetailResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiResponse({ status: 404, description: 'Image not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductImageDto,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<ProductImageDetailResponse> {
    if (image && image.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      );
    }

    return this.productImagesService.update(id, dto, image);
  }

  /**
   * Reorder images for a product (drag-and-drop gallery)
   * PUT /api/product-images/product/:productId/reorder
   */
  @Put('product/:productId/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reorder images for a product',
    description:
      'Updates the displayOrder of multiple images at once. Use this for drag-and-drop gallery management in the admin dashboard.',
  })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'Product UUID',
  })
  @ApiBody({ type: ReorderImagesDto })
  @ApiResponse({
    status: 200,
    description: 'Images reordered successfully',
    type: ProductImageListResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiResponse({ status: 400, description: 'Invalid image IDs' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async reorder(
    @Param('productId') productId: string,
    @Body() dto: ReorderImagesDto,
  ): Promise<ProductImageListResponse> {
    return this.productImagesService.reorder(productId, dto);
  }

  /**
   * Delete an image
   * DELETE /api/product-images/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an image',
    description: 'Permanently deletes an image from the database and disk',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Image UUID',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiResponse({ status: 204, description: 'Image deleted successfully' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.productImagesService.delete(id);
  }

  /**
   * Delete all images for a product
   * DELETE /api/product-images/product/:productId
   */
  @Delete('product/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete all images for a product',
    description:
      'Removes all images associated with a product from DB and disk',
  })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'Product UUID',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiResponse({ status: 204, description: 'All images deleted successfully' })
  async deleteByProduct(@Param('productId') productId: string): Promise<void> {
    return this.productImagesService.deleteByProduct(productId);
  }
}
