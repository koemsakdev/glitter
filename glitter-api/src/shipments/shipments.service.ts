import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import {
  ShipmentEntity,
  type ShipmentStatus,
} from './entities/shipment.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  ShipmentListResponse,
  ShipmentResponse,
} from './types/shipment-response.type';

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepo: Repository<ShipmentEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateShipmentDto): Promise<ShipmentResponse> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (order === null) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }
    const entity = this.shipmentRepo.create({
      orderId: dto.orderId,
      branchId: dto.branchId ?? order.branchId ?? null,
      trackingNumber: dto.trackingNumber ?? null,
      carrierName: dto.carrierName ?? null,
      status: dto.status ?? 'pending',
      shippedDate: toDate(dto.shippedDate),
      estimatedDeliveryDate: toDate(dto.estimatedDeliveryDate),
      actualDeliveryDate: toDate(dto.actualDeliveryDate),
    });
    const saved = await this.shipmentRepo.save(entity);
    this.realtime.publish('shipments');
    this.realtime.publish('orders');
    return this.findOneOrThrow(saved.id);
  }

  async findAll(status?: ShipmentStatus): Promise<ShipmentListResponse> {
    const [rows, total] = await this.shipmentRepo.findAndCount({
      where: status ? { status } : {},
      relations: ['order', 'branch'],
      order: { createdAt: 'DESC' },
    });
    return { data: rows.map((r) => this.toResponse(r)), total };
  }

  async findByOrder(orderId: string): Promise<ShipmentResponse | null> {
    const row = await this.shipmentRepo.findOne({
      where: { orderId },
      relations: ['order', 'branch'],
      order: { createdAt: 'DESC' },
    });
    return row ? this.toResponse(row) : null;
  }

  async update(id: string, dto: UpdateShipmentDto): Promise<ShipmentResponse> {
    const row = await this.shipmentRepo.findOne({ where: { id } });
    if (row === null) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    if (dto.branchId !== undefined) row.branchId = dto.branchId;
    if (dto.trackingNumber !== undefined)
      row.trackingNumber = dto.trackingNumber ?? null;
    if (dto.carrierName !== undefined)
      row.carrierName = dto.carrierName ?? null;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.shippedDate !== undefined)
      row.shippedDate = toDate(dto.shippedDate);
    if (dto.estimatedDeliveryDate !== undefined)
      row.estimatedDeliveryDate = toDate(dto.estimatedDeliveryDate);
    if (dto.actualDeliveryDate !== undefined)
      row.actualDeliveryDate = toDate(dto.actualDeliveryDate);

    await this.shipmentRepo.save(row);
    this.realtime.publish('shipments');
    this.realtime.publish('orders');
    return this.findOneOrThrow(id);
  }

  async delete(id: string): Promise<void> {
    const row = await this.shipmentRepo.findOne({ where: { id } });
    if (row === null) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    await this.shipmentRepo.remove(row);
    this.realtime.publish('shipments');
    this.realtime.publish('orders');
  }

  private async findOneOrThrow(id: string): Promise<ShipmentResponse> {
    const row = await this.shipmentRepo.findOne({
      where: { id },
      relations: ['order', 'branch'],
    });
    if (row === null) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    return this.toResponse(row);
  }

  private toResponse(entity: ShipmentEntity): ShipmentResponse {
    return {
      id: entity.id,
      orderId: entity.orderId,
      orderNumber: entity.order?.orderNumber ?? null,
      branchId: entity.branchId,
      branchName: entity.branch?.branchNameEn ?? null,
      trackingNumber: entity.trackingNumber,
      carrierName: entity.carrierName,
      status: entity.status,
      shippedDate: entity.shippedDate,
      estimatedDeliveryDate: entity.estimatedDeliveryDate,
      actualDeliveryDate: entity.actualDeliveryDate,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
