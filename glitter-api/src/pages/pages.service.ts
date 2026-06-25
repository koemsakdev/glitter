import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageEntity } from './entities/page.entity';
import {
  PageDetailResponse,
  PageListResponse,
  PageResponse,
} from './types/page-response.type';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(PageEntity)
    private readonly pageRepository: Repository<PageEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreatePageDto): Promise<PageDetailResponse> {
    const existing = await this.pageRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`A page with slug "${dto.slug}" exists`);
    }
    const entity = this.pageRepository.create({
      slug: dto.slug,
      titleEn: dto.titleEn,
      titleKm: dto.titleKm,
      bodyEn: dto.bodyEn ?? null,
      bodyKm: dto.bodyKm ?? null,
      isPublished: dto.isPublished ?? true,
    });
    const saved = await this.pageRepository.save(entity);
    this.realtime.publish('pages');
    return { data: this.toResponse(saved) };
  }

  async findAll(): Promise<PageListResponse> {
    const pages = await this.pageRepository.find({
      order: { createdAt: 'DESC' },
    });
    return { data: pages.map((p) => this.toResponse(p)) };
  }

  async findBySlug(slug: string): Promise<PageDetailResponse> {
    const page = await this.pageRepository.findOne({ where: { slug } });
    if (page === null) {
      throw new NotFoundException(`Page "${slug}" not found`);
    }
    return { data: this.toResponse(page) };
  }

  async update(id: string, dto: UpdatePageDto): Promise<PageDetailResponse> {
    const page = await this.pageRepository.findOne({ where: { id } });
    if (page === null) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }
    if (dto.slug !== undefined && dto.slug !== page.slug) {
      const clash = await this.pageRepository.findOne({
        where: { slug: dto.slug },
      });
      if (clash) {
        throw new ConflictException(`A page with slug "${dto.slug}" exists`);
      }
      page.slug = dto.slug;
    }
    if (dto.titleEn !== undefined) page.titleEn = dto.titleEn;
    if (dto.titleKm !== undefined) page.titleKm = dto.titleKm;
    if (dto.bodyEn !== undefined) page.bodyEn = dto.bodyEn ?? null;
    if (dto.bodyKm !== undefined) page.bodyKm = dto.bodyKm ?? null;
    if (dto.isPublished !== undefined) page.isPublished = dto.isPublished;

    const saved = await this.pageRepository.save(page);
    this.realtime.publish('pages');
    return { data: this.toResponse(saved) };
  }

  async delete(id: string): Promise<void> {
    const page = await this.pageRepository.findOne({ where: { id } });
    if (page === null) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }
    await this.pageRepository.remove(page);
    this.realtime.publish('pages');
  }

  private toResponse(entity: PageEntity): PageResponse {
    return {
      id: entity.id,
      slug: entity.slug,
      titleEn: entity.titleEn,
      titleKm: entity.titleKm,
      bodyEn: entity.bodyEn,
      bodyKm: entity.bodyKm,
      isPublished: entity.isPublished,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
