import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchEntity } from './entities/branch.entity';
import {
  BranchResponse,
  BranchListResponse,
  BranchDetailResponse,
} from './types/branch-response.type';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateBranchDto): Promise<BranchDetailResponse> {
    const branchCode =
      dto.branchCode?.trim().toUpperCase() ||
      (await this.nextBranchCode(dto.city));
    const existing = await this.branchRepository.findOne({
      where: { branchCode },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException(
        `Branch with code "${branchCode}" already exists`,
      );
    }

    if (dto.latitude < -90 || dto.latitude > 90) {
      throw new BadRequestException('Invalid latitude value');
    }
    if (dto.longitude < -180 || dto.longitude > 180) {
      throw new BadRequestException('Invalid longitude value');
    }

    const entity = this.branchRepository.create({
      branchCode,
      branchNameEn: dto.branchNameEn,
      branchNameKm: dto.branchNameKm,
      streetAddress: dto.streetAddress,
      city: dto.city,
      phoneNumber: dto.phoneNumber,
      email: dto.email?.trim() || null,
      latitude: dto.latitude,
      longitude: dto.longitude,
      openingHours: dto.openingHours ?? null,
      branchStatus: dto.branchStatus ?? 'active',
    });

    const saved = await this.branchRepository.save(entity);
    this.realtime.publish('branches');
    return { data: this.toResponse(saved) };
  }

  /**
   * Next free code for a city: "GS-" + city initials + running number.
   * Phnom Penh → GS-PP-001, GS-PP-002 … Siem Reap → GS-SR-001.
   * Deleted branches keep their codes, so codes are never reused.
   */
  private async nextBranchCode(city: string): Promise<string> {
    const words = (city || '')
      .normalize('NFKD')
      .replace(/[^A-Za-z\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const initials =
      (words.length > 1
        ? words.map((w) => w[0]).join('')
        : (words[0] ?? 'BR').slice(0, 3)
      )
        .toUpperCase()
        .slice(0, 4) || 'BR';
    const prefix = `GS-${initials}-`;
    const taken = await this.branchRepository
      .createQueryBuilder('b')
      .withDeleted()
      .select('b.branchCode', 'code')
      .where('b.branchCode LIKE :p', { p: `${prefix}%` })
      .getRawMany<{ code: string }>();
    const max = taken.reduce((n, r) => {
      const num = Number(r.code.slice(prefix.length));
      return Number.isFinite(num) ? Math.max(n, num) : n;
    }, 0);
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<BranchListResponse> {
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }

    const skip = (page - 1) * limit;

    const [branches, total] = await this.branchRepository.findAndCount({
      skip,
      take: limit,
      // Allow-listed sort column, newest first by default.
      order: ([
        'branchNameEn',
        'branchCode',
        'branchStatus',
        'city',
        'createdAt',
      ].includes(sortBy ?? '')
        ? {
            [sortBy as string]: sortOrder,
            ...(sortBy !== 'createdAt' ? { createdAt: 'DESC' } : {}),
          }
        : { createdAt: 'DESC' }) as never,
    });

    return {
      data: branches.map((branch: BranchEntity) => this.toResponse(branch)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<BranchDetailResponse> {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return { data: this.toResponse(branch) };
  }

  async findByCode(branchCode: string): Promise<BranchDetailResponse> {
    const branch = await this.branchRepository.findOne({
      where: { branchCode },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with code "${branchCode}" not found`);
    }

    return { data: this.toResponse(branch) };
  }

  async update(
    id: string,
    dto: UpdateBranchDto,
  ): Promise<BranchDetailResponse> {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    // If branchCode is being updated, check for conflicts
    if (dto.branchCode && dto.branchCode !== branch.branchCode) {
      const existing = await this.branchRepository.findOne({
        where: { branchCode: dto.branchCode },
      });

      if (existing) {
        throw new ConflictException(
          `Branch with code "${dto.branchCode}" already exists`,
        );
      }
    }

    // Validate coordinates if provided
    if (
      dto.latitude !== undefined &&
      (dto.latitude < -90 || dto.latitude > 90)
    ) {
      throw new BadRequestException('Invalid latitude value');
    }
    if (
      dto.longitude !== undefined &&
      (dto.longitude < -180 || dto.longitude > 180)
    ) {
      throw new BadRequestException('Invalid longitude value');
    }

    // Update only provided fields
    Object.assign(branch, {
      ...(dto.branchCode && { branchCode: dto.branchCode }),
      ...(dto.branchNameEn && { branchNameEn: dto.branchNameEn }),
      ...(dto.branchNameKm && { branchNameKm: dto.branchNameKm }),
      ...(dto.streetAddress && { streetAddress: dto.streetAddress }),
      ...(dto.city && { city: dto.city }),
      ...(dto.phoneNumber && { phoneNumber: dto.phoneNumber }),
      ...(dto.email && { email: dto.email }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      ...(dto.openingHours !== undefined && { openingHours: dto.openingHours }),
      ...(dto.branchStatus && { branchStatus: dto.branchStatus }),
    });

    const updated = await this.branchRepository.save(branch);
    this.realtime.publish('branches');

    return { data: this.toResponse(updated) };
  }

  async delete(id: string): Promise<void> {
    const branch = await this.branchRepository.findOne({ where: { id } });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    await this.branchRepository.softRemove(branch);
    this.realtime.publish('branches');
  }

  async findActive(): Promise<BranchListResponse> {
    const [branches, total] = await this.branchRepository.findAndCount({
      where: { branchStatus: 'active' },
      order: {
        branchNameEn: 'ASC',
      },
    });

    return {
      data: branches.map((branch: BranchEntity) => this.toResponse(branch)),
      total,
      page: 1,
      limit: total,
    };
  }

  private toResponse(entity: BranchEntity): BranchResponse {
    return {
      id: entity.id,
      branchCode: entity.branchCode,
      branchNameEn: entity.branchNameEn,
      branchNameKm: entity.branchNameKm,
      streetAddress: entity.streetAddress,
      city: entity.city,
      phoneNumber: entity.phoneNumber,
      email: entity.email,
      latitude: entity.latitude,
      longitude: entity.longitude,
      openingHours: entity.openingHours,
      branchStatus: entity.branchStatus,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
