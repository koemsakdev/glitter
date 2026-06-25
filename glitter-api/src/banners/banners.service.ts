import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerEntity } from './entities/banner.entity';
import {
  BannerPlacementEntity,
  type BannerPlacement,
} from './entities/banner-placement.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  BannerListResponse,
  BannerResponse,
} from './types/banner-response.type';

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(BannerEntity)
    private readonly bannerRepo: Repository<BannerEntity>,
    @InjectRepository(BannerPlacementEntity)
    private readonly placementRepo: Repository<BannerPlacementEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateBannerDto): Promise<BannerResponse> {
    const order = dto.displayOrder ?? (await this.bannerRepo.count());
    const banner = this.bannerRepo.create({
      titleEn: dto.titleEn ?? null,
      titleKm: dto.titleKm ?? null,
      imageUrl: dto.imageUrl,
      imageAltText: dto.imageAltText ?? null,
      linkUrl: dto.linkUrl ?? null,
      descriptionEn: dto.descriptionEn ?? null,
      descriptionKm: dto.descriptionKm ?? null,
      buttonLabelEn: dto.buttonLabelEn ?? null,
      buttonLabelKm: dto.buttonLabelKm ?? null,
      bannerType: dto.bannerType ?? 'hero',
      bannerEvent: dto.bannerEvent ?? 'none',
      status: dto.status ?? 'active',
      startDate: toDate(dto.startDate),
      endDate: toDate(dto.endDate),
      displayOrder: order,
      placements: this.buildPlacements(dto.placements ?? ['home_hero']),
    });
    const saved = await this.bannerRepo.save(banner);
    this.realtime.publish('banners');
    return this.findOneOrThrow(saved.id);
  }

  async findAll(): Promise<BannerListResponse> {
    const [rows, total] = await this.bannerRepo.findAndCount({
      relations: ['placements'],
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
    return { data: rows.map((r) => this.toResponse(r)), total };
  }

  /** Active banners for a placement, within their date window, ordered. */
  async findActiveByPlacement(
    location: BannerPlacement,
  ): Promise<BannerResponse[]> {
    const now = new Date();
    const rows = await this.bannerRepo
      .createQueryBuilder('banner')
      .innerJoinAndSelect('banner.placements', 'placement')
      .where('placement.placement_location = :location', { location })
      .andWhere('banner.status = :status', { status: 'active' })
      .andWhere('(banner.start_date IS NULL OR banner.start_date <= :now)', {
        now,
      })
      .andWhere('(banner.end_date IS NULL OR banner.end_date >= :now)', { now })
      .orderBy('banner.display_order', 'ASC')
      .addOrderBy('banner.created_at', 'ASC')
      .getMany();
    return rows.map((r) => this.toResponse(r));
  }

  async update(id: string, dto: UpdateBannerDto): Promise<BannerResponse> {
    const banner = await this.bannerRepo.findOne({
      where: { id },
      relations: ['placements'],
    });
    if (banner === null) {
      throw new NotFoundException(`Banner ${id} not found`);
    }

    if (dto.titleEn !== undefined) banner.titleEn = dto.titleEn || null;
    if (dto.titleKm !== undefined) banner.titleKm = dto.titleKm || null;
    if (dto.imageUrl !== undefined) banner.imageUrl = dto.imageUrl;
    if (dto.imageAltText !== undefined)
      banner.imageAltText = dto.imageAltText ?? null;
    if (dto.linkUrl !== undefined) banner.linkUrl = dto.linkUrl ?? null;
    if (dto.descriptionEn !== undefined)
      banner.descriptionEn = dto.descriptionEn || null;
    if (dto.descriptionKm !== undefined)
      banner.descriptionKm = dto.descriptionKm || null;
    if (dto.buttonLabelEn !== undefined)
      banner.buttonLabelEn = dto.buttonLabelEn || null;
    if (dto.buttonLabelKm !== undefined)
      banner.buttonLabelKm = dto.buttonLabelKm || null;
    if (dto.bannerType !== undefined) banner.bannerType = dto.bannerType;
    if (dto.bannerEvent !== undefined) banner.bannerEvent = dto.bannerEvent;
    if (dto.status !== undefined) banner.status = dto.status;
    if (dto.startDate !== undefined) banner.startDate = toDate(dto.startDate);
    if (dto.endDate !== undefined) banner.endDate = toDate(dto.endDate);
    if (dto.displayOrder !== undefined) banner.displayOrder = dto.displayOrder;

    if (dto.placements !== undefined) {
      await this.placementRepo.delete({ bannerId: id });
      banner.placements = this.buildPlacements(dto.placements);
    }

    await this.bannerRepo.save(banner);
    this.realtime.publish('banners');
    return this.findOneOrThrow(id);
  }

  async delete(id: string): Promise<void> {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (banner === null) {
      throw new NotFoundException(`Banner ${id} not found`);
    }
    await this.bannerRepo.remove(banner);
    this.realtime.publish('banners');
  }

  private buildPlacements(
    locations: BannerPlacement[],
  ): BannerPlacementEntity[] {
    const unique = [...new Set(locations)];
    return unique.map((placementLocation, index) =>
      this.placementRepo.create({ placementLocation, displayOrder: index }),
    );
  }

  private async findOneOrThrow(id: string): Promise<BannerResponse> {
    const banner = await this.bannerRepo.findOne({
      where: { id },
      relations: ['placements'],
    });
    if (banner === null) {
      throw new NotFoundException(`Banner ${id} not found`);
    }
    return this.toResponse(banner);
  }

  private toResponse(entity: BannerEntity): BannerResponse {
    const placements = (entity.placements ?? [])
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((p) => p.placementLocation);
    return {
      id: entity.id,
      titleEn: entity.titleEn ?? '',
      titleKm: entity.titleKm ?? '',
      imageUrl: entity.imageUrl,
      imageAltText: entity.imageAltText,
      linkUrl: entity.linkUrl,
      descriptionEn: entity.descriptionEn,
      descriptionKm: entity.descriptionKm,
      buttonLabelEn: entity.buttonLabelEn,
      buttonLabelKm: entity.buttonLabelKm,
      bannerType: entity.bannerType,
      bannerEvent: entity.bannerEvent,
      status: entity.status,
      startDate: entity.startDate,
      endDate: entity.endDate,
      displayOrder: entity.displayOrder,
      placements,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
