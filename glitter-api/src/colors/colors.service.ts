import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { ColorEntity } from './entities/color.entity';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(ColorEntity)
    private readonly colorRepo: Repository<ColorEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateColorDto): Promise<ColorEntity> {
    const hex = dto.hex.toLowerCase();
    const clash = await this.colorRepo.findOne({ where: { hex } });
    if (clash) {
      throw new ConflictException(`Color ${hex} already exists`);
    }
    const order = dto.displayOrder ?? (await this.colorRepo.count());
    const saved = await this.colorRepo.save(
      this.colorRepo.create({
        nameEn: dto.nameEn,
        nameKm: dto.nameKm,
        hex,
        displayOrder: order,
      }),
    );
    this.realtime.publish('colors');
    return saved;
  }

  findAll(): Promise<ColorEntity[]> {
    return this.colorRepo.find({
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateColorDto): Promise<ColorEntity> {
    const color = await this.colorRepo.findOne({ where: { id } });
    if (color === null) {
      throw new NotFoundException(`Color ${id} not found`);
    }
    if (dto.hex !== undefined) {
      const hex = dto.hex.toLowerCase();
      const clash = await this.colorRepo.findOne({
        where: { hex, id: Not(id) },
      });
      if (clash) {
        throw new ConflictException(`Color ${hex} already exists`);
      }
      color.hex = hex;
    }
    if (dto.nameEn !== undefined) color.nameEn = dto.nameEn;
    if (dto.nameKm !== undefined) color.nameKm = dto.nameKm;
    if (dto.displayOrder !== undefined) color.displayOrder = dto.displayOrder;
    const saved = await this.colorRepo.save(color);
    this.realtime.publish('colors');
    return saved;
  }

  async delete(id: string): Promise<void> {
    const color = await this.colorRepo.findOne({ where: { id } });
    if (color === null) {
      throw new NotFoundException(`Color ${id} not found`);
    }
    await this.colorRepo.remove(color);
    this.realtime.publish('colors');
  }
}
