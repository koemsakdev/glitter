import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type FindOptionsWhere } from 'typeorm';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { ReorderMenuDto } from './dto/reorder-menu.dto';
import { MenuItemEntity, type MenuLocation } from './entities/menu-item.entity';
import {
  MenuDetailResponse,
  MenuItemResponse,
  MenuListResponse,
} from './types/menu-response.type';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly menuRepository: Repository<MenuItemEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateMenuItemDto): Promise<MenuDetailResponse> {
    const entity = this.menuRepository.create({
      labelEn: dto.labelEn,
      labelKm: dto.labelKm,
      url: dto.url,
      location: dto.location ?? 'header',
      parentId: dto.parentId ?? null,
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive ?? true,
      openInNewTab: dto.openInNewTab ?? false,
    });
    const saved = await this.menuRepository.save(entity);
    this.realtime.publish('menu');
    return { data: this.toResponse(saved) };
  }

  async findAll(
    location?: MenuLocation,
    isActive?: boolean,
  ): Promise<MenuListResponse> {
    const where: FindOptionsWhere<MenuItemEntity> = {};
    if (location) where.location = location;
    if (isActive !== undefined) where.isActive = isActive;

    const items = await this.menuRepository.find({
      where,
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
    return { data: items.map((i) => this.toResponse(i)) };
  }

  async findOne(id: string): Promise<MenuDetailResponse> {
    const item = await this.menuRepository.findOne({ where: { id } });
    if (item === null) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }
    return { data: this.toResponse(item) };
  }

  async update(
    id: string,
    dto: UpdateMenuItemDto,
  ): Promise<MenuDetailResponse> {
    const item = await this.menuRepository.findOne({ where: { id } });
    if (item === null) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    if (dto.labelEn !== undefined) item.labelEn = dto.labelEn;
    if (dto.labelKm !== undefined) item.labelKm = dto.labelKm;
    if (dto.url !== undefined) item.url = dto.url;
    if (dto.location !== undefined) item.location = dto.location;
    if (dto.parentId !== undefined) item.parentId = dto.parentId ?? null;
    if (dto.displayOrder !== undefined) item.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) item.isActive = dto.isActive;
    if (dto.openInNewTab !== undefined) item.openInNewTab = dto.openInNewTab;

    const saved = await this.menuRepository.save(item);
    this.realtime.publish('menu');
    return { data: this.toResponse(saved) };
  }

  async reorder(dto: ReorderMenuDto): Promise<MenuListResponse> {
    const ids = dto.items.map((i) => i.id);
    if (ids.length > 0) {
      const existing = await this.menuRepository.find({
        where: { id: In(ids) },
      });
      const byId = new Map(existing.map((e) => [e.id, e]));
      const toSave: MenuItemEntity[] = [];
      for (const change of dto.items) {
        const entity = byId.get(change.id);
        if (!entity) continue;
        entity.displayOrder = change.displayOrder;
        if (change.parentId !== undefined) {
          entity.parentId = change.parentId ?? null;
        }
        toSave.push(entity);
      }
      if (toSave.length > 0) await this.menuRepository.save(toSave);
    }
    this.realtime.publish('menu');
    return this.findAll();
  }

  async delete(id: string): Promise<void> {
    const item = await this.menuRepository.findOne({ where: { id } });
    if (item === null) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }
    // Remove any sub-items first to avoid orphans.
    const children = await this.menuRepository.find({
      where: { parentId: id },
    });
    if (children.length > 0) await this.menuRepository.remove(children);
    await this.menuRepository.remove(item);
    this.realtime.publish('menu');
  }

  private toResponse(entity: MenuItemEntity): MenuItemResponse {
    return {
      id: entity.id,
      labelEn: entity.labelEn,
      labelKm: entity.labelKm,
      url: entity.url,
      location: entity.location,
      parentId: entity.parentId,
      displayOrder: entity.displayOrder,
      isActive: entity.isActive,
      openInNewTab: entity.openInNewTab,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
