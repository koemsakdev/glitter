import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { CategoryEntity, type CategoryType } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ImageOptimizationService } from '../common/services/image-optimization.service';

const CATEGORY_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'categories');

export interface CategoryResponse {
  id: string;
  slug: string;
  nameEn: string;
  nameKm: string;
  descriptionEn: string | null;
  descriptionKm: string | null;
  iconUrl: string | null;
  displayOrder: number;
  categoryType: CategoryType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryListResponse {
  data: CategoryResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoryDetailResponse {
  data: CategoryResponse;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    private readonly optimizer: ImageOptimizationService,
  ) {}

  async create(
    dto: CreateCategoryDto,
    iconFile?: Express.Multer.File,
  ): Promise<CategoryDetailResponse> {
    const existing = await this.categoryRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing !== null) {
      throw new ConflictException(
        `Category with slug "${dto.slug}" already exists`,
      );
    }

    let iconUrl: string | null = null;
    if (iconFile) {
      const optimizedFilename = await this.optimizer.optimize(iconFile.path);
      iconUrl = `/upload/categories/${optimizedFilename}`;
    }

    const entity = this.categoryRepository.create({
      slug: dto.slug,
      nameEn: dto.nameEn,
      nameKm: dto.nameKm,
      descriptionEn: dto.descriptionEn ?? null,
      descriptionKm: dto.descriptionKm ?? null,
      iconUrl,
      displayOrder: dto.displayOrder ?? 0,
      categoryType: dto.categoryType ?? 'main',
    });

    const saved = await this.categoryRepository.save(entity);
    return { data: this.toResponse(saved) };
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
    categoryType?: CategoryType,
    sortBy:
      | 'createdAt'
      | 'updatedAt'
      | 'nameEn'
      | 'nameKm'
      | 'displayOrder' = 'displayOrder',
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ): Promise<CategoryListResponse> {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    // Search across slug, nameEn, nameKm
    if (search) {
      queryBuilder.andWhere(
        '(category.slug ILIKE :search OR category.nameEn ILIKE :search OR category.nameKm ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by category type
    if (categoryType) {
      queryBuilder.andWhere('category.categoryType = :categoryType', {
        categoryType,
      });
    }

    // Whitelist sortBy to prevent SQL injection
    const allowedSortFields: Array<
      'createdAt' | 'updatedAt' | 'nameEn' | 'nameKm' | 'displayOrder'
    > = ['createdAt', 'updatedAt', 'nameEn', 'nameKm', 'displayOrder'];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'displayOrder';
    const safeSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`category.${safeSortBy}`, safeSortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [categories, total] = await queryBuilder.getManyAndCount();

    return {
      data: categories.map((c) => this.toResponse(c)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<CategoryDetailResponse> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (category === null) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return { data: this.toResponse(category) };
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    iconFile?: Express.Multer.File,
  ): Promise<CategoryDetailResponse> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (category === null) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Slug uniqueness check
    if (dto.slug !== undefined && dto.slug !== category.slug) {
      const existing = await this.categoryRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existing !== null) {
        throw new ConflictException(
          `Category with slug "${dto.slug}" already exists`,
        );
      }
    }

    // Update only provided fields
    if (dto.slug !== undefined) category.slug = dto.slug;
    if (dto.nameEn !== undefined) category.nameEn = dto.nameEn;
    if (dto.nameKm !== undefined) category.nameKm = dto.nameKm;
    if (dto.descriptionEn !== undefined) {
      category.descriptionEn = dto.descriptionEn ?? null;
    }
    if (dto.descriptionKm !== undefined) {
      category.descriptionKm = dto.descriptionKm ?? null;
    }
    if (dto.displayOrder !== undefined) {
      category.displayOrder = dto.displayOrder;
    }
    if (dto.categoryType !== undefined) {
      category.categoryType = dto.categoryType;
    }

    // Handle icon: 3 cases
    // 1. New icon file uploaded → delete old, save new
    // 2. clearIcon=true → delete existing, set null
    // 3. Neither → leave unchanged
    if (iconFile) {
      if (category.iconUrl) {
        await this.deleteIconFile(category.iconUrl);
      }
      const optimizedFilename = await this.optimizer.optimize(iconFile.path);
      category.iconUrl = `/upload/categories/${optimizedFilename}`;
    } else if (dto.clearIcon === true) {
      if (category.iconUrl) {
        await this.deleteIconFile(category.iconUrl);
      }
      category.iconUrl = null;
    }

    const updated = await this.categoryRepository.save(category);
    return { data: this.toResponse(updated) };
  }

  async delete(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (category === null) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (category.iconUrl) {
      await this.deleteIconFile(category.iconUrl);
    }

    await this.categoryRepository.remove(category);
  }

  /**
   * Delete an icon file from disk.
   */
  private async deleteIconFile(iconUrl: string): Promise<void> {
    try {
      if (!iconUrl || !iconUrl.startsWith('/upload/categories/')) {
        return;
      }
      const filename = iconUrl.replace('/upload/categories/', '');
      const filePath = path.join(CATEGORY_UPLOAD_DIR, filename);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        ) {
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error deleting icon file:', error);
    }
  }

  private toResponse(entity: CategoryEntity): CategoryResponse {
    return {
      id: entity.id,
      slug: entity.slug,
      nameEn: entity.nameEn,
      nameKm: entity.nameKm,
      descriptionEn: entity.descriptionEn,
      descriptionKm: entity.descriptionKm,
      iconUrl: entity.iconUrl,
      displayOrder: entity.displayOrder,
      categoryType: entity.categoryType,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
