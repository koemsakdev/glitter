/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as path from 'path';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createDiskStorage } from '../common/helpers/multer.helper';
import { CategoriesService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// Upload destination
const CATEGORY_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'categories');
const categoryStorage = createDiskStorage(CATEGORY_UPLOAD_DIR);

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`),
      false,
    );
  }
  callback(null, true);
};

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoryService: CategoriesService) {}

  /**
   * Create a new category with icon upload
   * POST /categories
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: categoryStorage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        slug: { type: 'string', example: 'designer-bags' },
        nameEn: { type: 'string', example: 'Designer Bags' },
        nameKm: { type: 'string', example: 'កាបូបលម្អប្រដាប់' },
        descriptionEn: { type: 'string' },
        descriptionKm: { type: 'string' },
        icon: { type: 'string', format: 'binary' },
        displayOrder: { type: 'integer', example: 1 },
        categoryType: {
          type: 'string',
          enum: ['main', 'sub', 'featured'],
          example: 'main',
        },
      },
      required: ['slug', 'nameEn', 'nameKm'],
    },
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreateCategoryDto,
    @UploadedFile() icon?: Express.Multer.File,
  ) {
    if (icon && icon.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
    return this.categoryService.create(dto, icon);
  }

  /**
   * List categories with pagination, search, type filter, and sorting
   * GET /categories
   */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List categories' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({
    name: 'categoryType',
    enum: ['main', 'sub', 'featured'],
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    enum: ['createdAt', 'updatedAt', 'nameEn', 'nameKm', 'displayOrder'],
    required: false,
  })
  @ApiQuery({ name: 'sortOrder', enum: ['ASC', 'DESC'], required: false })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('categoryType') categoryType?: 'main' | 'sub' | 'featured',
    @Query('sortBy')
    sortBy:
      | 'createdAt'
      | 'updatedAt'
      | 'nameEn'
      | 'nameKm'
      | 'displayOrder' = 'displayOrder',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    return this.categoryService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
      categoryType,
      sortBy,
      sortOrder,
    );
  }

  /**
   * Get a category by ID
   */
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  /**
   * Update a category with optional icon upload
   * PATCH /categories/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('icon', {
      storage: categoryStorage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        nameEn: { type: 'string' },
        nameKm: { type: 'string' },
        descriptionEn: { type: 'string' },
        descriptionKm: { type: 'string' },
        icon: { type: 'string', format: 'binary' },
        clearIcon: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'Set to "true" to remove the existing icon',
        },
        displayOrder: { type: 'integer' },
        categoryType: {
          type: 'string',
          enum: ['main', 'sub', 'featured'],
        },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @UploadedFile() icon?: Express.Multer.File,
  ) {
    if (icon && icon.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
    return this.categoryService.update(id, dto, icon);
  }

  /**
   * Delete a category
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', type: String })
  async delete(@Param('id') id: string): Promise<void> {
    return this.categoryService.delete(id);
  }
}
