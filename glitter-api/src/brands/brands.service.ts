import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandEntity, type BrandStatus } from './entities/brand.entity';
import {
  BrandDetailResponse,
  BrandListResponse,
  BrandResponse,
} from './types/brand-response.type';

const BRAND_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'brands');

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(BrandEntity)
    private readonly brandRepository: Repository<BrandEntity>,
  ) {}

  async create(
    dto: CreateBrandDto,
    logoFile?: Express.Multer.File,
  ): Promise<BrandDetailResponse> {
    const existingSlug = await this.brandRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existingSlug !== null) {
      throw new ConflictException(
        `Brand with slug "${dto.slug}" already exists`,
      );
    }

    const status: BrandStatus = dto.status ?? 'active';

    let logoUrl: string | null = null;
    if (logoFile) {
      logoUrl = `/upload/brands/${logoFile.filename}`;
    }

    const entity = this.brandRepository.create({
      slug: dto.slug,
      name: dto.name,
      logoUrl,
      websiteUrl: dto.websiteUrl ?? null,
      description: dto.description ?? null,
      status,
    });

    const saved = await this.brandRepository.save(entity);
    const brandData: BrandResponse = this.toResponse(saved);
    return {
      data: brandData,
    };
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
    status?: 'active' | 'inactive',
    sortBy: 'createdAt' | 'updatedAt' | 'name' = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<BrandListResponse> {
    const queryBuilder = this.brandRepository.createQueryBuilder('brand');

    // Search across name and slug
    if (search) {
      queryBuilder.andWhere(
        '(brand.name ILIKE :search OR brand.slug ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('brand.status = :status', { status });
    }

    // Validate sortBy against allowed columns (prevents SQL injection)
    const allowedSortFields: Array<'createdAt' | 'updatedAt' | 'name'> = [
      'createdAt',
      'updatedAt',
      'name',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Ordering
    queryBuilder.orderBy(`brand.${safeSortBy}`, safeSortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [brands, total] = await queryBuilder.getManyAndCount();

    const mappedData: BrandResponse[] = brands.map((brand: BrandEntity) =>
      this.toResponse(brand),
    );

    return {
      data: mappedData,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<BrandDetailResponse> {
    const brand = await this.brandRepository.findOne({ where: { id } });

    if (brand === null) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    const brandData: BrandResponse = this.toResponse(brand);
    return {
      data: brandData,
    };
  }

  async findBySlug(slug: string): Promise<BrandDetailResponse> {
    const brand = await this.brandRepository.findOne({
      where: { slug },
    });

    if (brand === null) {
      throw new NotFoundException(`Brand with slug "${slug}" not found`);
    }

    const brandData: BrandResponse = this.toResponse(brand);
    return {
      data: brandData,
    };
  }

  async findActive(): Promise<BrandListResponse> {
    const [brands, total] = await this.brandRepository.findAndCount({
      where: { status: 'active' },
      order: {
        name: 'ASC',
      },
    });

    const mappedData: BrandResponse[] = brands.map((brand: BrandEntity) =>
      this.toResponse(brand),
    );
    return {
      data: mappedData,
      total: Number(total),
      page: 1,
      limit: Number(total),
    };
  }

  async update(
    id: string,
    dto: UpdateBrandDto,
    logoFile?: Express.Multer.File,
  ): Promise<BrandDetailResponse> {
    const brand = await this.brandRepository.findOne({ where: { id } });

    if (brand === null) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    // Check if new slug is already in use
    if (
      dto.slug !== undefined &&
      dto.slug !== null &&
      dto.slug !== brand.slug
    ) {
      const existingSlug = await this.brandRepository.findOne({
        where: { slug: dto.slug },
      });

      if (existingSlug !== null) {
        throw new ConflictException(
          `Brand with slug "${dto.slug}" already exists`,
        );
      }
    }

    // Update only provided fields
    if (dto.slug !== undefined && dto.slug !== null) {
      brand.slug = dto.slug;
    }
    if (dto.name !== undefined && dto.name !== null) {
      brand.name = dto.name;
    }
    if (dto.websiteUrl !== undefined) {
      brand.websiteUrl = dto.websiteUrl ?? null;
    }
    if (dto.description !== undefined) {
      brand.description = dto.description ?? null;
    }
    if (dto.status !== undefined && dto.status !== null) {
      brand.status = dto.status;
    }

    // Handle logo upload
    if (logoFile) {
      if (brand.logoUrl) {
        await this.deleteLogoFile(brand.logoUrl);
      }
      brand.logoUrl = `/upload/brands/${logoFile.filename}`;
    } else if (dto.clearLogo === true) {
      if (brand.logoUrl) {
        await this.deleteLogoFile(brand.logoUrl);
      }
      brand.logoUrl = null;
    }

    const updated = await this.brandRepository.save(brand);

    const brandData: BrandResponse = this.toResponse(updated);
    return {
      data: brandData,
    };
  }

  async delete(id: string): Promise<void> {
    const brand = await this.brandRepository.findOne({ where: { id } });

    if (brand === null) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }

    // Delete logo file if exists
    if (brand.logoUrl) {
      await this.deleteLogoFile(brand.logoUrl);
    }

    await this.brandRepository.remove(brand);
  }

  /**
   * Helper method to delete logo file from disk
   */
  private async deleteLogoFile(logoUrl: string): Promise<void> {
    try {
      if (!logoUrl || !logoUrl.startsWith('/upload/brands/')) {
        return;
      }

      const filename = logoUrl.replace('/upload/brands/', '');
      const filePath = path.join(BRAND_UPLOAD_DIR, filename);

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
      console.error('Error deleting logo file:', error);
    }
  }

  private toResponse(entity: BrandEntity): BrandResponse {
    return {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      logoUrl: entity.logoUrl,
      websiteUrl: entity.websiteUrl,
      description: entity.description,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
