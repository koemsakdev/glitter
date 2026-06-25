import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { BranchEntity } from '../branch/entities/branch.entity';
import { ProductVariantEntity } from '../product-variants/entities/product-variant.entity';
import { UserEntity } from '../users/entities/user.entity';
import { InventoryBranchService } from '../inventory-branch/inventory-branch.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderEntity,
  OrderStatus,
  type OrderPaymentStatus,
} from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { PaymentEntity } from './entities/payment.entity';
import {
  OrderDetailResponse,
  OrderListItem,
  OrderListResponse,
  OrderResponse,
  OrderStatsResponse,
} from './types/order-response.type';

const RESERVED_STATUSES: OrderStatus[] = ['pending', 'paid', 'processing'];
const COMMITTED_STATUSES: OrderStatus[] = ['shipped', 'completed'];

/** Allowed status transitions per source. */
const TRANSITIONS: Record<
  string,
  Partial<Record<OrderStatus, OrderStatus[]>>
> = {
  online: {
    pending: ['paid', 'processing', 'cancelled'],
    paid: ['processing', 'shipped', 'completed', 'cancelled'],
    processing: ['shipped', 'completed', 'cancelled'],
    shipped: ['completed', 'refunded'],
    completed: ['refunded'],
  },
  in_store: {
    completed: ['refunded'],
  },
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  source?: string;
  status?: string;
  branchId?: string;
  search?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryBranchService,
    private readonly realtime: RealtimeService,
  ) {}

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(
    dto: CreateOrderDto,
    currentUserId: string,
  ): Promise<OrderDetailResponse> {
    if (!dto.items?.length) {
      throw new BadRequestException('An order must have at least one item');
    }

    return this.dataSource.transaction(async (manager) => {
      const branch = await manager
        .getRepository(BranchEntity)
        .findOne({ where: { id: dto.branchId } });
      if (branch === null) {
        throw new BadRequestException(`Branch ${dto.branchId} not found`);
      }

      // Merge duplicate variant lines so stock is locked/moved once per variant.
      const qtyByVariant = new Map<string, number>();
      for (const item of dto.items) {
        qtyByVariant.set(
          item.productVariantId,
          (qtyByVariant.get(item.productVariantId) ?? 0) + item.quantity,
        );
      }
      const variantIds = [...qtyByVariant.keys()];

      const variants = await manager.getRepository(ProductVariantEntity).find({
        where: { id: In(variantIds) },
        relations: ['product'],
      });
      const variantById = new Map(variants.map((v) => [v.id, v]));
      for (const id of variantIds) {
        if (!variantById.has(id)) {
          throw new BadRequestException(`Variant ${id} not found`);
        }
      }

      // Build line items with prices snapshotted at sale time.
      let subtotal = 0;
      const itemsData = variantIds.map((vid) => {
        const variant = variantById.get(vid)!;
        const product = variant.product!;
        const quantity = qtyByVariant.get(vid)!;
        const unitPrice = Number(variant.priceOverride ?? product.price);
        const lineTotal = round2(unitPrice * quantity);
        subtotal += lineTotal;
        return {
          productId: product.id,
          productVariantId: vid,
          productName: product.nameEn,
          variantSku: variant.variantSku,
          size: variant.size ?? null,
          color: variant.color ?? null,
          colorHex: variant.colorHex ?? null,
          unitPrice,
          quantity,
          lineTotal,
        };
      });

      subtotal = round2(subtotal);
      const discountTotal = Math.min(round2(dto.discountTotal ?? 0), subtotal);
      const shippingCost = round2(dto.shippingCost ?? 0);
      const taxAmount = round2(dto.taxAmount ?? 0);
      const grandTotal = round2(
        subtotal - discountTotal + shippingCost + taxAmount,
      );

      // Move stock: in-store sells now; online reserves a hold.
      const isInStore = dto.source === 'in_store';
      for (const vid of variantIds) {
        const quantity = qtyByVariant.get(vid)!;
        if (isInStore) {
          await this.inventoryService.sellStockTx(
            manager,
            vid,
            dto.branchId,
            quantity,
          );
        } else {
          await this.inventoryService.reserveStockTx(
            manager,
            vid,
            dto.branchId,
            quantity,
          );
        }
      }

      // Resolve the customer snapshot.
      let customerName = dto.customerName ?? null;
      let customerPhone = dto.customerPhone ?? null;
      const customerId = dto.customerId ?? null;
      if (customerId) {
        const customer = await manager
          .getRepository(UserEntity)
          .findOne({ where: { id: customerId } });
        if (customer === null) {
          throw new BadRequestException(`Customer ${customerId} not found`);
        }
        customerName = customerName ?? customer.fullName;
        customerPhone = customerPhone ?? customer.phoneNumber;
      }

      // Payments taken now (in-store defaults to a single cash payment).
      const payments: {
        method: 'cash' | 'khqr' | 'aba';
        amount: number;
        reference?: string;
      }[] =
        isInStore && (dto.payments ?? []).length === 0
          ? [{ method: 'cash', amount: grandTotal }]
          : (dto.payments ?? []);
      const totalPaid = round2(payments.reduce((sum, p) => sum + p.amount, 0));
      const paymentStatus: OrderPaymentStatus =
        totalPaid <= 0
          ? 'unpaid'
          : totalPaid >= grandTotal
            ? 'paid'
            : 'partial';

      const orderRepo = manager.getRepository(OrderEntity);
      const order = orderRepo.create({
        orderNumber: await this.generateOrderNumber(orderRepo),
        source: dto.source,
        status: isInStore ? 'completed' : 'pending',
        branchId: dto.branchId,
        customerId,
        cashierId: isInStore ? currentUserId : null,
        customerName,
        customerPhone,
        subtotal,
        discountTotal,
        shippingCost,
        taxAmount,
        grandTotal,
        paymentStatus,
        currency: 'USD',
        note: dto.note ?? null,
      });
      const savedOrder = await orderRepo.save(order);

      const itemRepo = manager.getRepository(OrderItemEntity);
      await itemRepo.save(
        itemsData.map((d) => itemRepo.create({ ...d, orderId: savedOrder.id })),
      );

      if (payments.length > 0) {
        const paymentRepo = manager.getRepository(PaymentEntity);
        await paymentRepo.save(
          payments.map((p) =>
            paymentRepo.create({
              orderId: savedOrder.id,
              method: p.method,
              status: 'paid',
              amount: round2(p.amount),
              reference: p.reference ?? null,
              paidAt: new Date(),
            }),
          ),
        );
      }

      this.realtime.publish('orders');
      return { data: await this.buildDetail(manager, savedOrder.id) };
    });
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async findAll(params: OrderListParams): Promise<OrderListResponse> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const skip = (page - 1) * limit;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.branch', 'branch')
      .loadRelationCountAndMap('order.itemCount', 'order.items');

    if (params.source) {
      qb.andWhere('order.source = :source', { source: params.source });
    }
    if (params.status) {
      qb.andWhere('order.status = :status', { status: params.status });
    }
    if (params.branchId) {
      qb.andWhere('order.branchId = :branchId', { branchId: params.branchId });
    }
    const term = params.search?.trim();
    if (term) {
      qb.andWhere(
        '(order.orderNumber ILIKE :s OR order.customerName ILIKE :s OR order.customerPhone ILIKE :s)',
        { s: `%${term}%` },
      );
    }

    qb.orderBy('order.createdAt', 'DESC').skip(skip).take(limit);

    const [orders, total] = await qb.getManyAndCount();

    return {
      data: orders.map((o) => this.toListItem(o)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<OrderDetailResponse> {
    return { data: await this.buildDetail(this.dataSource.manager, id) };
  }

  /** A customer's own orders, most recent first. */
  async updatePaymentStatus(
    id: string,
    paymentStatus: OrderPaymentStatus,
  ): Promise<OrderDetailResponse> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (order === null) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    order.paymentStatus = paymentStatus;
    await this.orderRepository.save(order);
    this.realtime.publish('orders');
    return this.findOne(id);
  }

  async findByCustomer(customerId: string): Promise<OrderListResponse> {
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.branch', 'branch')
      .loadRelationCountAndMap('order.itemCount', 'order.items')
      .where('order.customerId = :customerId', { customerId })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
    return {
      data: orders.map((o) => this.toListItem(o)),
      total: orders.length,
      page: 1,
      limit: orders.length,
    };
  }

  /** A single order, but only if it belongs to this customer. */
  async findOneForCustomer(
    id: string,
    customerId: string,
  ): Promise<OrderDetailResponse> {
    const data = await this.buildDetail(this.dataSource.manager, id);
    if (data.customerId !== customerId) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return { data };
  }

  async getStats(branchId?: string): Promise<OrderStatsResponse> {
    const applyBranch = (
      qb: ReturnType<Repository<OrderEntity>['createQueryBuilder']>,
    ) => (branchId ? qb.andWhere('o.branchId = :branchId', { branchId }) : qb);

    const totalOrders = await applyBranch(
      this.orderRepository.createQueryBuilder('o'),
    ).getCount();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayRow = await applyBranch(
      this.orderRepository
        .createQueryBuilder('o')
        .andWhere('o.createdAt >= :start', { start: startOfDay }),
    )
      .select('COUNT(*)', 'count')
      .addSelect(
        "COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled','refunded') THEN o.grand_total ELSE 0 END), 0)",
        'revenue',
      )
      .getRawOne<{ count: string; revenue: string }>();

    const statusRows = await applyBranch(
      this.orderRepository.createQueryBuilder('o'),
    )
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany<{ status: OrderStatus; count: string }>();

    const statusCounts: Record<OrderStatus, number> = {
      pending: 0,
      paid: 0,
      processing: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
      refunded: 0,
    };
    for (const row of statusRows) {
      statusCounts[row.status] = Number(row.count);
    }

    return {
      totalOrders,
      todayOrders: Number(todayRow?.count ?? 0),
      todayRevenue: Number(todayRow?.revenue ?? 0),
      statusCounts,
    };
  }

  // ---------------------------------------------------------------------------
  // Update status (with stock side effects)
  // ---------------------------------------------------------------------------

  async updateStatus(
    id: string,
    newStatus: OrderStatus,
  ): Promise<OrderDetailResponse> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(OrderEntity);
      const order = await orderRepo.findOne({
        where: { id },
        relations: ['items'],
      });
      if (order === null) {
        throw new NotFoundException(`Order ${id} not found`);
      }

      const from = order.status;
      if (from === newStatus) {
        return { data: await this.buildDetail(manager, id) };
      }

      const allowed = TRANSITIONS[order.source]?.[from] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new BadRequestException(
          `Cannot change a ${order.source} order from "${from}" to "${newStatus}"`,
        );
      }

      await this.applyStatusStock(manager, order, from, newStatus);

      order.status = newStatus;
      await orderRepo.save(order);

      this.realtime.publish('orders');
      return { data: await this.buildDetail(manager, id) };
    });
  }

  private async applyStatusStock(
    manager: EntityManager,
    order: OrderEntity,
    from: OrderStatus,
    to: OrderStatus,
  ): Promise<void> {
    const items = order.items ?? [];
    const each = async (
      fn: (variantId: string, branchId: string, qty: number) => Promise<void>,
    ) => {
      for (const item of items) {
        await fn(item.productVariantId, order.branchId, item.quantity);
      }
    };

    if (order.source === 'online') {
      if (to === 'cancelled' && RESERVED_STATUSES.includes(from)) {
        await each((v, b, q) =>
          this.inventoryService.releaseStockTx(manager, v, b, q),
        );
      } else if (
        COMMITTED_STATUSES.includes(to) &&
        RESERVED_STATUSES.includes(from)
      ) {
        await each((v, b, q) =>
          this.inventoryService.commitStockTx(manager, v, b, q),
        );
      } else if (to === 'refunded' && COMMITTED_STATUSES.includes(from)) {
        await each((v, b, q) =>
          this.inventoryService.returnStockTx(manager, v, b, q),
        );
      }
      // pending→paid, paid→processing, shipped→completed: no stock change.
    } else if (to === 'refunded') {
      // in-store sale refunded → goods return to the shelf.
      await each((v, b, q) =>
        this.inventoryService.returnStockTx(manager, v, b, q),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async generateOrderNumber(
    repo: Repository<OrderEntity>,
  ): Promise<string> {
    const count = await repo.count();
    return `ORD-${String(count + 1).padStart(6, '0')}`;
  }

  private async buildDetail(
    manager: EntityManager,
    id: string,
  ): Promise<OrderResponse> {
    const order = await manager.getRepository(OrderEntity).findOne({
      where: { id },
      relations: ['branch', 'items', 'payments'],
    });
    if (order === null) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return this.toResponse(order);
  }

  private toResponse(order: OrderEntity): OrderResponse {
    const items = order.items ?? [];
    const payments = order.payments ?? [];
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      source: order.source,
      status: order.status,
      branchId: order.branchId,
      branchName: order.branch?.branchNameEn ?? null,
      customerId: order.customerId,
      cashierId: order.cashierId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      shippingCost: order.shippingCost,
      taxAmount: order.taxAmount,
      grandTotal: order.grandTotal,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      note: order.note,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productVariantId: i.productVariantId,
        productName: i.productName,
        variantSku: i.variantSku,
        size: i.size,
        color: i.color,
        colorHex: i.colorHex,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        method: p.method,
        status: p.status,
        amount: p.amount,
        reference: p.reference,
        paidAt: p.paidAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private toListItem(
    order: OrderEntity & { itemCount?: number },
  ): OrderListItem {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      source: order.source,
      status: order.status,
      branchId: order.branchId,
      branchName: order.branch?.branchNameEn ?? null,
      customerId: order.customerId,
      cashierId: order.cashierId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      shippingCost: order.shippingCost,
      taxAmount: order.taxAmount,
      grandTotal: order.grandTotal,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      note: order.note,
      itemCount: order.itemCount ?? 0,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
