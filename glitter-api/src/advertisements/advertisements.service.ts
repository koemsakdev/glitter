import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { AdvertisementEntity } from './entities/advertisement.entity';
import {
  AdPlacementEntity,
  type PlacementLocation,
} from './entities/ad-placement.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  AdvertisementListResponse,
  AdvertisementResponse,
} from './types/advertisement-response.type';

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class AdvertisementsService {
  constructor(
    @InjectRepository(AdvertisementEntity)
    private readonly adRepo: Repository<AdvertisementEntity>,
    @InjectRepository(AdPlacementEntity)
    private readonly placementRepo: Repository<AdPlacementEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateAdvertisementDto): Promise<AdvertisementResponse> {
    const ad = this.adRepo.create({
      titleEn: dto.titleEn,
      titleKm: dto.titleKm,
      contentEn: dto.contentEn ?? null,
      contentKm: dto.contentKm ?? null,
      imageUrl: dto.imageUrl ?? null,
      linkUrl: dto.linkUrl ?? null,
      adType: dto.adType ?? 'banner',
      displayFrequency: dto.displayFrequency ?? 1,
      status: dto.status ?? 'active',
      startDate: toDate(dto.startDate),
      endDate: toDate(dto.endDate),
      placements: this.buildPlacements(dto.placements ?? []),
    });
    const saved = await this.adRepo.save(ad);
    this.realtime.publish('advertisements');
    return this.findOneOrThrow(saved.id);
  }

  async findAll(): Promise<AdvertisementListResponse> {
    const [rows, total] = await this.adRepo.findAndCount({
      relations: ['placements'],
      order: { createdAt: 'DESC' },
    });
    return { data: rows.map((r) => this.toResponse(r)), total };
  }

  /** Active ads for a placement location, within their date window. */
  async findActiveByPlacement(
    location: PlacementLocation,
  ): Promise<AdvertisementResponse[]> {
    const now = new Date();
    const rows = await this.adRepo
      .createQueryBuilder('ad')
      .innerJoinAndSelect('ad.placements', 'placement')
      .where('placement.placement_location = :location', { location })
      .andWhere('ad.status = :status', { status: 'active' })
      .andWhere('(ad.start_date IS NULL OR ad.start_date <= :now)', { now })
      .andWhere('(ad.end_date IS NULL OR ad.end_date >= :now)', { now })
      .orderBy('placement.display_order', 'ASC')
      .addOrderBy('ad.created_at', 'DESC')
      .getMany();
    return rows.map((r) => this.toResponse(r));
  }

  async update(
    id: string,
    dto: UpdateAdvertisementDto,
  ): Promise<AdvertisementResponse> {
    const ad = await this.adRepo.findOne({
      where: { id },
      relations: ['placements'],
    });
    if (ad === null) {
      throw new NotFoundException(`Advertisement ${id} not found`);
    }

    if (dto.titleEn !== undefined) ad.titleEn = dto.titleEn;
    if (dto.titleKm !== undefined) ad.titleKm = dto.titleKm;
    if (dto.contentEn !== undefined) ad.contentEn = dto.contentEn ?? null;
    if (dto.contentKm !== undefined) ad.contentKm = dto.contentKm ?? null;
    if (dto.imageUrl !== undefined) ad.imageUrl = dto.imageUrl ?? null;
    if (dto.linkUrl !== undefined) ad.linkUrl = dto.linkUrl ?? null;
    if (dto.adType !== undefined) ad.adType = dto.adType;
    if (dto.displayFrequency !== undefined)
      ad.displayFrequency = dto.displayFrequency;
    if (dto.status !== undefined) ad.status = dto.status;
    if (dto.startDate !== undefined) ad.startDate = toDate(dto.startDate);
    if (dto.endDate !== undefined) ad.endDate = toDate(dto.endDate);

    if (dto.placements !== undefined) {
      await this.placementRepo.delete({ adId: id });
      ad.placements = this.buildPlacements(dto.placements);
    }

    await this.adRepo.save(ad);
    this.realtime.publish('advertisements');
    return this.findOneOrThrow(id);
  }

  async delete(id: string): Promise<void> {
    const ad = await this.adRepo.findOne({ where: { id } });
    if (ad === null) {
      throw new NotFoundException(`Advertisement ${id} not found`);
    }
    await this.adRepo.remove(ad);
    this.realtime.publish('advertisements');
  }

  async recordView(id: string): Promise<void> {
    await this.adRepo.increment({ id }, 'viewCount', 1);
  }

  async recordClick(id: string): Promise<void> {
    await this.adRepo.increment({ id }, 'clickCount', 1);
  }

  private buildPlacements(locations: PlacementLocation[]): AdPlacementEntity[] {
    const unique = [...new Set(locations)];
    return unique.map((placementLocation, index) =>
      this.placementRepo.create({ placementLocation, displayOrder: index }),
    );
  }

  private async findOneOrThrow(id: string): Promise<AdvertisementResponse> {
    const ad = await this.adRepo.findOne({
      where: { id },
      relations: ['placements'],
    });
    if (ad === null) {
      throw new NotFoundException(`Advertisement ${id} not found`);
    }
    return this.toResponse(ad);
  }

  private toResponse(entity: AdvertisementEntity): AdvertisementResponse {
    const placements = (entity.placements ?? [])
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((p) => p.placementLocation);
    return {
      id: entity.id,
      titleEn: entity.titleEn,
      titleKm: entity.titleKm,
      contentEn: entity.contentEn,
      contentKm: entity.contentKm,
      imageUrl: entity.imageUrl,
      linkUrl: entity.linkUrl,
      adType: entity.adType,
      displayFrequency: entity.displayFrequency,
      viewCount: entity.viewCount,
      clickCount: entity.clickCount,
      status: entity.status,
      startDate: entity.startDate,
      endDate: entity.endDate,
      placements,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
