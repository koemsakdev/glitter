/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import * as path from 'path';
import { createDiskStorage } from '../common/helpers/multer.helper';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandsService } from './brands.service';
import {
  BrandDetailResponseDto,
  BrandListResponseDto,
} from './dto/brand-response.dto';
import {
  BrandListResponse,
  BrandDetailResponse,
} from './types/brand-response.type';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

// Define upload destination
const BRAND_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'brands');
const brandStorage = createDiskStorage(BRAND_UPLOAD_DIR);

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// File validation
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

@ApiTags('Brands')
@ApiBearerAuth()
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  /**
   * Create a new brand with logo upload
   * POST /brands
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: brandStorage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new brand',
    description: 'Creates a new brand with optional logo upload',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          example: 'gucci',
          description: 'URL-friendly slug (unique)',
        },
        name: {
          type: 'string',
          example: 'Gucci',
          description: 'Brand name',
        },
        websiteUrl: {
          type: 'string',
          example: 'https://www.gucci.com',
          description: 'Brand website URL (optional)',
        },
        description: {
          type: 'string',
          example: 'Italian luxury fashion house founded in 1921',
          description: 'Brand description (optional)',
        },
        logo: {
          type: 'string',
          format: 'binary',
          description:
            'Brand logo image file (PNG, JPEG, WebP, SVG) - optional, max 5MB',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          example: 'active',
          description: 'Brand status (optional, default: active)',
        },
      },
      required: ['slug', 'name'],
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Brand created successfully with logo stored in /uploads/brands/',
    type: BrandDetailResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiResponse({ status: 400, description: 'Invalid input data or file' })
  @ApiResponse({ status: 409, description: 'Brand slug already exists' })
  async create(
    @Body() dto: CreateBrandDto,
    @UploadedFile() logo?: Express.Multer.File,
  ): Promise<BrandDetailResponse> {
    // Validate file size
    if (logo && logo.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    return this.brandsService.create(dto, logo);
  }

  /**
   * Get all brands with pagination, search, status filter, and sorting
   * GET /brands?page=1&limit=10&search=Gucci&status=active&sortBy=createdAt&sortOrder=DESC
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all brands',
    description:
      'Retrieves paginated list of brands with optional search, status filter, and sorting',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Items per page (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Search by name or slug',
    example: 'gucci',
  })
  @ApiQuery({
    name: 'status',
    enum: ['active', 'inactive'],
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'sortBy',
    enum: ['createdAt', 'updatedAt', 'name'],
    required: false,
    description: 'Field to sort by (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    enum: ['ASC', 'DESC'],
    required: false,
    description: 'Sort order (default: DESC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Brands retrieved successfully',
    type: BrandListResponseDto,
  })
  @Public()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('sortBy') sortBy: 'createdAt' | 'updatedAt' | 'name' = 'createdAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<BrandListResponse> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return this.brandsService.findAll(
      pageNum,
      limitNum,
      search,
      status,
      sortBy,
      sortOrder,
    );
  }

  /**
   * Get active brands only
   * GET /brands/status/active
   */
  @Get('status/active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get active brands',
    description: 'Retrieves all active brands with logo URLs',
  })
  @ApiResponse({
    status: 200,
    description: 'Active brands retrieved successfully',
    type: BrandListResponseDto,
  })
  @Public()
  async findActive(): Promise<BrandListResponse> {
    return this.brandsService.findActive();
  }

  /**
   * Get a specific brand by ID
   * GET /brands/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get brand by ID',
    description: 'Retrieves a specific brand with logo URL',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Brand UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Brand retrieved successfully',
    type: BrandDetailResponseDto,
  })
  @Public()
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async findOne(@Param('id') id: string): Promise<BrandDetailResponse> {
    return this.brandsService.findOne(id);
  }

  /**
   * Get a specific brand by slug
   * GET /brands/slug/:slug
   */
  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get brand by slug',
    description: 'Retrieves a specific brand with logo URL',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'Brand slug',
    example: 'gucci',
  })
  @ApiResponse({
    status: 200,
    description: 'Brand retrieved successfully',
    type: BrandDetailResponseDto,
  })
  @Public()
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async findBySlug(@Param('slug') slug: string): Promise<BrandDetailResponse> {
    return this.brandsService.findBySlug(slug);
  }

  /**
   * Update a brand with optional logo upload
   * PATCH /brands/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: brandStorage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update a brand',
    description: 'Updates specific fields of a brand with optional logo upload',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Brand UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          example: 'gucci',
          description: 'Brand slug (optional)',
        },
        name: {
          type: 'string',
          example: 'Gucci',
          description: 'Brand name (optional)',
        },
        websiteUrl: {
          type: 'string',
          example: 'https://www.gucci.com',
          description: 'Brand website URL (optional)',
        },
        description: {
          type: 'string',
          description: 'Brand description (optional)',
        },
        logo: {
          type: 'string',
          format: 'binary',
          description: 'New brand logo image file (optional)',
        },
        clearLogo: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'Set to "true" to remove the existing logo',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          example: 'active',
          description: 'Brand status (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Brand updated successfully',
    type: BrandDetailResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiResponse({ status: 400, description: 'Invalid input data or file' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({ status: 409, description: 'Brand slug already exists' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @UploadedFile() logo?: Express.Multer.File,
  ): Promise<BrandDetailResponse> {
    // Validate file size
    if (logo && logo.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    return this.brandsService.update(id, dto, logo);
  }

  /**
   * Delete a brand
   * DELETE /brands/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a brand',
    description: 'Permanently deletes a brand and its logo from the system',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Brand UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiResponse({ status: 204, description: 'Brand deleted successfully' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.brandsService.delete(id);
  }
}
