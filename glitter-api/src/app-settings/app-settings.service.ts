import {
  ConflictException,
  ForbiddenException,
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

  /**
   * The AI assistant's look (`assistant` in the storefront config) is
   * admin-only, even though other staff with "storefront" permission may save
   * the rest of the config. Throws if a non-admin tries to change it.
   */
  private assertAssistantUnchanged(
    actorRole: string | undefined,
    group: string,
    key: string,
    before: string | null,
    after: string,
  ): void {
    if (actorRole === 'admin' || actorRole === undefined) return;
    if (group !== 'storefront' || key !== 'home_config') return;
    const pick = (raw: string | null): string => {
      try {
        const a = (JSON.parse(raw ?? '{}') as { assistant?: unknown })
          .assistant as { icon?: string; color?: string } | undefined;
        return JSON.stringify({
          icon: a?.icon ?? 'buddy',
          color: a?.color ?? '',
        });
      } catch {
        return JSON.stringify({ icon: 'buddy', color: '' });
      }
    };
    if (pick(before) !== pick(after)) {
      throw new ForbiddenException(
        'Only an admin can change the AI assistant settings',
      );
    }
  }

  async create(
    dto: CreateAppSettingDto,
    actorRole?: string,
  ): Promise<AppSettingResponse> {
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
    this.assertAssistantUnchanged(
      actorRole,
      dto.settingGroup,
      dto.settingKey,
      null,
      dto.settingValue,
    );

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
    actorRole?: string,
  ): Promise<AppSettingResponse> {
    const setting = await this.appSettingRepository.findOne({ where: { id } });

    if (!setting) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }
    this.assertAssistantUnchanged(
      actorRole,
      setting.settingGroup,
      setting.settingKey,
      setting.settingValue,
      dto.settingValue,
    );

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
