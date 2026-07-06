import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ProductEntity } from '../products/entities/product.entity';
import { BadgeEntity } from '../badges/entities/badge.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateProductBadgeDto } from './dto/create-product-badge.dto';
import { UpdateProductBadgeDto } from './dto/update-product-badge.dto';
import {
  ProductBadgeEntity,
  type BadgeType,
} from './entities/product-badge.entity';
import {
  ProductBadgeDetailResponse,
  ProductBadgeListResponse,
  ProductBadgeResponse,
} from './types/product-badge-response.type';

// Default labels shown in EN/KM when the admin doesn't set a custom one
const DEFAULT_LABELS: Record<BadgeType, { en: string; km: string }> = {
  new: { en: 'NEW', km: 'ថ្មី' },
  sale: { en: 'SALE', km: 'បញ្ចុះតម្លៃ' },
  bestseller: { en: 'BESTSELLER', km: 'លក់ដាច់' },
  limited: { en: 'LIMITED', km: 'មានកំណត់' },
  exclusive: { en: 'EXCLUSIVE', km: 'ផ្តាច់មុខ' },
  hot: { en: 'HOT', km: 'ពេញនិយម' },
  featured: { en: 'FEATURED', km: 'ពិសេស' },
  coming_soon: { en: 'COMING SOON', km: 'នឹងមកដល់ឆាប់ៗ' },
};

// Default colors per badge type
const DEFAULT_COLORS: Record<BadgeType, string> = {
  new: '#34C759',
  sale: '#FF3B30',
  bestseller: '#FFCC00',
  limited: '#AF52DE',
  exclusive: '#5856D6',
  hot: '#FF9500',
  featured: '#007AFF',
  coming_soon: '#8E8E93',
};

@Injectable()
export class ProductBadgesService {
  constructor(
    @InjectRepository(ProductBadgeEntity)
    private readonly badgeRepository: Repository<ProductBadgeEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(BadgeEntity)
    private readonly catalogRepository: Repository<BadgeEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  /** Resolve a badge type's label/colour: built-in default → catalog → fallback. */
  private async resolveBadgeMeta(
    badgeType: string,
  ): Promise<{ labelEn: string; labelKm: string; color: string }> {
    const def = DEFAULT_LABELS[badgeType];
    const defColor = DEFAULT_COLORS[badgeType];
    let labelEn = def?.en;
    let labelKm = def?.km;
    let color = defColor;
    if (labelEn == null || labelKm == null || color == null) {
      const catalog = await this.catalogRepository.findOne({
        where: { slug: badgeType },
      });
      labelEn = labelEn ?? catalog?.nameEn ?? badgeType.toUpperCase();
      labelKm = labelKm ?? catalog?.nameKm ?? badgeType;
      color = color ?? catalog?.color ?? '#64748b';
    }
    return { labelEn, labelKm, color };
  }

  /**
   * Replace a product's whole badge set in one shot. This is what the product
   * editor uses — it's atomic, so the stored badges always match exactly what
   * was selected (no stale leftovers from incremental add/remove).
   */
  async setForProduct(
    productId: string,
    badgeTypes: string[],
  ): Promise<ProductBadgeListResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (product === null) {
      throw new BadRequestException(`Product with ID ${productId} not found`);
    }

    const unique = [...new Set(badgeTypes)].slice(0, 2);
    const metas = await Promise.all(
      unique.map((badgeType) => this.resolveBadgeMeta(badgeType)),
    );

    // Replace the set inside a transaction so a concurrent storefront read
    // never sees the in-between state where the product has zero badges.
    await this.badgeRepository.manager.transaction(async (em) => {
      await em.delete(ProductBadgeEntity, { productId });
      if (unique.length > 0) {
        const rows = unique.map((badgeType, i) =>
          em.create(ProductBadgeEntity, {
            productId,
            badgeType,
            badgeLabelEn: metas[i].labelEn,
            badgeLabelKm: metas[i].labelKm,
            badgeIconColor: metas[i].color,
            badgeStartDate: null,
            badgeEndDate: null,
          }),
        );
        await em.save(rows);
      }
    });

    this.realtime.publish('products');
    return this.findByProduct(productId);
  }

  async create(
    dto: CreateProductBadgeDto,
  ): Promise<ProductBadgeDetailResponse> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (product === null) {
      throw new BadRequestException(
        `Product with ID ${dto.productId} not found`,
      );
    }

    // Enforce uniqueness: one badge of each type per product
    const existing = await this.badgeRepository.findOne({
      where: { productId: dto.productId, badgeType: dto.badgeType },
    });
    if (existing !== null) {
      throw new ConflictException(
        `Product already has a "${dto.badgeType}" badge. Update or delete the existing one first.`,
      );
    }

    // Validate date range
    if (
      dto.badgeStartDate &&
      dto.badgeEndDate &&
      dto.badgeStartDate > dto.badgeEndDate
    ) {
      throw new BadRequestException(
        'badgeStartDate must be before badgeEndDate',
      );
    }

    // Resolve label/color. Built-in types have defaults; custom badge slugs
    // are looked up in the badge catalog; anything else falls back gracefully
    // (so an unknown type never crashes the create).
    const def = DEFAULT_LABELS[dto.badgeType];
    const defColor = DEFAULT_COLORS[dto.badgeType];
    let labelEn = dto.badgeLabelEn ?? def?.en;
    let labelKm = dto.badgeLabelKm ?? def?.km;
    let color = dto.badgeIconColor ?? defColor;
    if (labelEn == null || labelKm == null || color == null) {
      const catalog = await this.catalogRepository.findOne({
        where: { slug: dto.badgeType },
      });
      labelEn = labelEn ?? catalog?.nameEn ?? dto.badgeType.toUpperCase();
      labelKm = labelKm ?? catalog?.nameKm ?? dto.badgeType;
      color = color ?? catalog?.color ?? '#64748b';
    }

    const entity = this.badgeRepository.create({
      productId: dto.productId,
      badgeType: dto.badgeType,
      badgeLabelEn: labelEn,
      badgeLabelKm: labelKm,
      badgeIconColor: color,
      badgeStartDate: dto.badgeStartDate ?? null,
      badgeEndDate: dto.badgeEndDate ?? null,
    });

    const saved = await this.badgeRepository.save(entity);
    this.realtime.publish('products');
    return { data: this.toResponse(saved) };
  }

  /**
   * Get all badges for a product, ordered by priority (most important first).
   * Priority: sale > new > bestseller > limited > hot > exclusive > featured > coming_soon
   */
  async findByProduct(productId: string): Promise<ProductBadgeListResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (product === null) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const badges = await this.badgeRepository.find({
      where: { productId },
      order: { createdAt: 'ASC' },
    });

    const sorted = this.sortByPriority(badges);

    return {
      data: sorted.map((b: ProductBadgeEntity) => this.toResponse(b)),
      total: sorted.length,
    };
  }

  /**
   * Get only currently ACTIVE badges for a product (respecting start/end dates).
   * This is what the storefront uses.
   */
  async findActiveByProduct(
    productId: string,
  ): Promise<ProductBadgeListResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (product === null) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const now = new Date();
    const badges = await this.badgeRepository.find({
      where: { productId },
    });

    const active = badges.filter((b) => this.isBadgeActive(b, now));
    const sorted = this.sortByPriority(active);

    return {
      data: sorted.map((b: ProductBadgeEntity) => this.toResponse(b)),
      total: sorted.length,
    };
  }

  async findOne(id: string): Promise<ProductBadgeDetailResponse> {
    const badge = await this.badgeRepository.findOne({ where: { id } });

    if (badge === null) {
      throw new NotFoundException(`Badge with ID ${id} not found`);
    }

    return { data: this.toResponse(badge) };
  }

  async update(
    id: string,
    dto: UpdateProductBadgeDto,
  ): Promise<ProductBadgeDetailResponse> {
    const badge = await this.badgeRepository.findOne({ where: { id } });

    if (badge === null) {
      throw new NotFoundException(`Badge with ID ${id} not found`);
    }

    // If changing badgeType, check for conflicts with other badges on same product
    if (dto.badgeType && dto.badgeType !== badge.badgeType) {
      const conflict = await this.badgeRepository.findOne({
        where: { productId: badge.productId, badgeType: dto.badgeType },
      });
      if (conflict !== null) {
        throw new ConflictException(
          `Product already has a "${dto.badgeType}" badge`,
        );
      }
      badge.badgeType = dto.badgeType;
    }

    if (dto.badgeLabelEn !== undefined) badge.badgeLabelEn = dto.badgeLabelEn;
    if (dto.badgeLabelKm !== undefined) badge.badgeLabelKm = dto.badgeLabelKm;
    if (dto.badgeIconColor !== undefined)
      badge.badgeIconColor = dto.badgeIconColor;
    if (dto.badgeStartDate !== undefined)
      badge.badgeStartDate = dto.badgeStartDate;
    if (dto.badgeEndDate !== undefined) badge.badgeEndDate = dto.badgeEndDate;

    // Re-validate date range after updates
    if (
      badge.badgeStartDate &&
      badge.badgeEndDate &&
      badge.badgeStartDate > badge.badgeEndDate
    ) {
      throw new BadRequestException(
        'badgeStartDate must be before badgeEndDate',
      );
    }

    const updated = await this.badgeRepository.save(badge);
    this.realtime.publish('products');
    return { data: this.toResponse(updated) };
  }

  async delete(id: string): Promise<void> {
    const badge = await this.badgeRepository.findOne({ where: { id } });

    if (badge === null) {
      throw new NotFoundException(`Badge with ID ${id} not found`);
    }

    await this.badgeRepository.remove(badge);
    this.realtime.publish('products');
  }

  /**
   * Remove all expired badges (where badgeEndDate < now).
   * Useful for nightly cleanup jobs.
   */
  async cleanupExpired(): Promise<{ removed: number }> {
    const now = new Date();

    const expired = await this.badgeRepository.find({
      where: {
        badgeEndDate: LessThanOrEqual(now),
      },
    });

    if (expired.length === 0) {
      return { removed: 0 };
    }

    await this.badgeRepository.remove(expired);
    return { removed: expired.length };
  }

  // --- Helpers ---

  private isBadgeActive(
    badge: ProductBadgeEntity,
    now: Date = new Date(),
  ): boolean {
    if (badge.badgeStartDate && badge.badgeStartDate > now) {
      return false; // hasn't started yet
    }
    if (badge.badgeEndDate && badge.badgeEndDate < now) {
      return false; // already ended
    }
    return true;
  }

  /**
   * Sort badges by display priority. Higher-impact badges appear first.
   * Example: A product with both "sale" and "new" shows "sale" to the left.
   */
  private sortByPriority(badges: ProductBadgeEntity[]): ProductBadgeEntity[] {
    const priority: Record<BadgeType, number> = {
      sale: 1,
      new: 2,
      bestseller: 3,
      limited: 4,
      hot: 5,
      exclusive: 6,
      featured: 7,
      coming_soon: 8,
    };

    return badges
      .slice()
      .sort((a, b) => priority[a.badgeType] - priority[b.badgeType]);
  }

  private toResponse(entity: ProductBadgeEntity): ProductBadgeResponse {
    return {
      id: entity.id,
      productId: entity.productId,
      badgeType: entity.badgeType,
      badgeLabelEn: entity.badgeLabelEn,
      badgeLabelKm: entity.badgeLabelKm,
      badgeIconColor: entity.badgeIconColor,
      badgeStartDate: entity.badgeStartDate,
      badgeEndDate: entity.badgeEndDate,
      isActive: this.isBadgeActive(entity),
      createdAt: entity.createdAt,
    };
  }
}
