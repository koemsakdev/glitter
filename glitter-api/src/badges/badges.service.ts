import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { BadgeEntity } from './entities/badge.entity';
import { ProductBadgeEntity } from '../product-badges/entities/product-badge.entity';
import { RealtimeService } from '../realtime/realtime.service';

/** The original built-in badges, seeded once so existing products keep theirs. */
const DEFAULT_BADGES: Array<Omit<BadgeEntity, 'id' | 'createdAt' | 'updatedAt'>> =
  [
    { slug: 'new', nameEn: 'New', nameKm: 'ថ្មី', color: '#ec4899', active: true, displayOrder: 0 },
    { slug: 'sale', nameEn: 'Sale', nameKm: 'បញ្ចុះតម្លៃ', color: '#ef4444', active: true, displayOrder: 1 },
    { slug: 'bestseller', nameEn: 'Bestseller', nameKm: 'លក់ដាច់', color: '#f59e0b', active: true, displayOrder: 2 },
    { slug: 'limited', nameEn: 'Limited', nameKm: 'មានកំណត់', color: '#a855f7', active: true, displayOrder: 3 },
    { slug: 'exclusive', nameEn: 'Exclusive', nameKm: 'ផ្តាច់មុខ', color: '#eab308', active: true, displayOrder: 4 },
    { slug: 'hot', nameEn: 'Hot', nameKm: 'ក្តៅ', color: '#f97316', active: true, displayOrder: 5 },
    { slug: 'featured', nameEn: 'Featured', nameKm: 'លេចធ្លោ', color: '#ec4899', active: true, displayOrder: 6 },
    { slug: 'coming_soon', nameEn: 'Coming Soon', nameKm: 'មកដល់', color: '#64748b', active: true, displayOrder: 7 },
  ];

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

@Injectable()
export class BadgesService implements OnModuleInit {
  constructor(
    @InjectRepository(BadgeEntity)
    private readonly badgeRepo: Repository<BadgeEntity>,
    @InjectRepository(ProductBadgeEntity)
    private readonly productBadgeRepo: Repository<ProductBadgeEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  /** Seed the built-in badges on first run so nothing is lost in the migration. */
  async onModuleInit(): Promise<void> {
    const count = await this.badgeRepo.count();
    if (count === 0) {
      await this.badgeRepo.save(
        DEFAULT_BADGES.map((b) => this.badgeRepo.create(b)),
      );
    }
  }

  findAll(): Promise<BadgeEntity[]> {
    return this.badgeRepo.find({
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(dto: CreateBadgeDto): Promise<BadgeEntity> {
    const baseSlug = dto.slug ? slugify(dto.slug) : slugify(dto.nameEn);
    const slug = await this.uniqueSlug(baseSlug || 'badge');
    const order = dto.displayOrder ?? (await this.badgeRepo.count());
    const saved = await this.badgeRepo.save(
      this.badgeRepo.create({
        slug,
        nameEn: dto.nameEn,
        nameKm: dto.nameKm,
        color: dto.color.toLowerCase(),
        active: dto.active ?? true,
        displayOrder: order,
      }),
    );
    this.realtime.publish('badges');
    return saved;
  }

  async update(id: string, dto: UpdateBadgeDto): Promise<BadgeEntity> {
    const badge = await this.badgeRepo.findOne({ where: { id } });
    if (badge === null) {
      throw new NotFoundException(`Badge ${id} not found`);
    }
    if (dto.nameEn !== undefined) badge.nameEn = dto.nameEn;
    if (dto.nameKm !== undefined) badge.nameKm = dto.nameKm;
    if (dto.color !== undefined) badge.color = dto.color.toLowerCase();
    if (dto.active !== undefined) badge.active = dto.active;
    if (dto.displayOrder !== undefined) badge.displayOrder = dto.displayOrder;
    const saved = await this.badgeRepo.save(badge);
    this.realtime.publish('badges');
    return saved;
  }

  async delete(id: string): Promise<void> {
    const badge = await this.badgeRepo.findOne({ where: { id } });
    if (badge === null) {
      throw new NotFoundException(`Badge ${id} not found`);
    }
    // Detach this badge from any products that use it, then remove it.
    await this.productBadgeRepo.delete({ badgeType: badge.slug });
    await this.badgeRepo.remove(badge);
    this.realtime.publish('badges');
    this.realtime.publish('products');
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let n = 1;
    while (await this.badgeRepo.findOne({ where: { slug } })) {
      slug = `${base}_${n++}`.slice(0, 50);
    }
    return slug;
  }
}
