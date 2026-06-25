import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAppSettingDto } from './dto/create-app-setting.dto';
import { AppSettingEntity } from './entities/app-setting.entity';
import { AppSettingResponse } from './types/app-setting-response.type';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class AppSettingsService {
  constructor(
    @InjectRepository(AppSettingEntity)
    private readonly appSettingRepository: Repository<AppSettingEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateAppSettingDto): Promise<AppSettingResponse> {
    const existing = await this.appSettingRepository.findOne({
      where: {
        settingGroup: dto.settingGroup,
        settingKey: dto.settingKey,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Setting already exists: ${dto.settingGroup}.${dto.settingKey}`,
      );
    }

    const entity = this.appSettingRepository.create({
      settingGroup: dto.settingGroup,
      settingKey: dto.settingKey,
      settingValue: dto.settingValue,
      valueType: dto.valueType,
      description: dto.description ?? null,
      isPublic: dto.isPublic,
    });

    const saved = await this.appSettingRepository.save(entity);

    this.realtime.publish('store-config');
    return this.toResponse(saved);
  }

  async findAll(): Promise<AppSettingResponse[]> {
    const rows = await this.appSettingRepository.find({
      order: {
        settingGroup: 'ASC',
        settingKey: 'ASC',
      },
    });

    return rows.map((row: AppSettingEntity) => this.toResponse(row));
  }

  async update(
    id: string,
    dto: CreateAppSettingDto,
  ): Promise<AppSettingResponse> {
    const setting = await this.appSettingRepository.findOne({ where: { id } });

    if (!setting) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }

    setting.settingGroup = dto.settingGroup;
    setting.settingKey = dto.settingKey;
    setting.settingValue = dto.settingValue;
    setting.valueType = dto.valueType;
    setting.description = dto.description ?? null;
    setting.isPublic = dto.isPublic;

    const updatedSetting = await this.appSettingRepository.save(setting);

    this.realtime.publish('store-config');
    return this.toResponse(updatedSetting);
  }

  async delete(id: string): Promise<void> {
    const setting = await this.appSettingRepository.findOne({ where: { id } });

    if (!setting) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }

    await this.appSettingRepository.remove(setting);
  }

  async findByGroupAndKey(
    settingGroup: string,
    settingKey: string,
  ): Promise<AppSettingResponse> {
    const setting = await this.appSettingRepository.findOne({
      where: { settingGroup, settingKey },
    });

    if (!setting) {
      throw new NotFoundException(
        `Setting not found: ${settingGroup}.${settingKey}`,
      );
    }

    return this.toResponse(setting);
  }

  async findOne(id: string): Promise<AppSettingResponse> {
    const setting = await this.appSettingRepository.findOne({ where: { id } });
    if (!setting) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }
    return this.toResponse(setting);
  }

  private toResponse(entity: AppSettingEntity): AppSettingResponse {
    return {
      id: entity.id,
      settingGroup: entity.settingGroup,
      settingKey: entity.settingKey,
      settingValue: entity.settingValue,
      valueType: entity.valueType,
      description: entity.description,
      isPublic: entity.isPublic,
      updatedAt: entity.updatedAt,
    };
  }
}
