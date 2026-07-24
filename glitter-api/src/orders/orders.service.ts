import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, MoreThan, Repository } from 'typeorm';
import { BranchEntity } from '../branch/entities/branch.entity';
import { ProductImageEntity } from '../product-images/entities/product-image.entity';
import { ProductVariantEntity } from '../product-variants/entities/product-variant.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AppSettingEntity } from '../app-settings/entities/app-setting.entity';
import { InventoryBranchService } from '../inventory-branch/inventory-branch.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationsService } from '../notifications/notification.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderEntity,
  OrderStatus,
  type DeliveryMethod,
  type DeliveryRegion,
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

/**
 * Statuses that are NOT real, fulfillable orders: an `awaiting_payment` KHQR
 * checkout that hasn't been paid yet, and an `expired` one that never was.
 * Hidden from the dashboard list, customer history and KPI counts.
 */
const HIDDEN_STATUSES: OrderStatus[] = ['awaiting_payment', 'expired'];

/** Payment options that must be paid up-front (before the order is "real"). */
const PREPAY_METHODS = new Set(['khqr', 'aba_khqr', 'aba_ecommerce']);
function isPrepayMethod(method: string | null | undefined): boolean {
  return !!method && PREPAY_METHODS.has(method);
}

/** Allowed status transitions per source. */
const TRANSITIONS: Record<
  string,
  Partial<Record<OrderStatus, OrderStatus[]>>
> = {
  online: {
    // Pay-first (KHQR): paid on ABA confirmation, else expires (or cancelled).
    awaiting_payment: ['paid', 'expired', 'cancelled'],
    // A late payment can still revive an expired hold into a real order.
    expired: ['paid'],
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

/** Shape of a configured delivery method read from the store config JSON. */
interface ConfiguredMethod {
  id: string;
  enabled?: boolean;
  fee?: number;
  regionId?: string;
}


/** Built-in method config used when the store config row is missing. */
const DEFAULT_METHOD_CONFIG: ConfiguredMethod[] = [
  { id: 'cod', enabled: true, fee: 1.5, regionId: 'phnom_penh' },
  { id: 'grab', enabled: true, fee: 0, regionId: 'phnom_penh' },
  { id: 'pickup', enabled: true, fee: 0, regionId: 'phnom_penh' },
  { id: 'vet_express', enabled: true, fee: 1.5, regionId: 'province' },
];

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
    @InjectRepository(AppSettingEntity)
    private readonly appSettingRepository: Repository<AppSettingEntity>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryBranchService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
    private readonly vouchers: VouchersService,
  ) {}

  /**
   * Resolve a region + delivery method into a server-trusted fee (and validate
   * it's enabled) by reading the storefront delivery config. Never trust a
   * client-supplied shipping cost.
   */
  /**
   * Read the admin-configured delivery methods from the store config JSON
   * (best-effort). Falls back to built-in defaults so an order can still be
   * placed if the config row is missing.
   */
  private async loadDeliveryConfig(): Promise<{
    methods: ConfiguredMethod[];
  }> {
    try {
      const row = await this.appSettingRepository.findOne({
        where: { settingGroup: 'storefront', settingKey: 'home_config' },
      });
      if (row?.settingValue) {
        const cfg = JSON.parse(row.settingValue) as {
          delivery?: { methods?: ConfiguredMethod[] };
        };
        const methods = Array.isArray(cfg.delivery?.methods)
          ? cfg.delivery!.methods!
          : DEFAULT_METHOD_CONFIG;
        return { methods };
      }
    } catch {
      // fall through to defaults
    }
    return { methods: DEFAULT_METHOD_CONFIG };
  }

  /**
   * Minutes an unpaid pay-first (KHQR) order holds its reserved stock before it
   * auto-cancels. Admin-configurable via `delivery.holdMinutes` (default 30).
   */
  private async loadHoldMinutes(): Promise<number> {
    try {
      const row = await this.appSettingRepository.findOne({
        where: { settingGroup: 'storefront', settingKey: 'home_config' },
      });
      if (row?.settingValue) {
        const cfg = JSON.parse(row.settingValue) as {
          delivery?: { holdMinutes?: number };
        };
        const m = cfg.delivery?.holdMinutes;
        if (typeof m === 'number' && m > 0) return m;
      }
    } catch {
      // fall through to default
    }
    return 30;
  }

  /** Minutes an unpaid pay-first hold survives before it may expire — exposed
   *  for the ABA reconciler (see AbaReconciliationService). */
  async getPrepaidHoldMinutes(): Promise<number> {
    return this.loadHoldMinutes();
  }

  /**
   * Open pay-first (KHQR) holds still awaiting payment. The reconciler checks
   * each against ABA before deciding to confirm or expire it — a hold is NEVER
   * expired on a timer alone, so a real payment can't be lost if the client's
   * poll dropped or ABA confirmed late.
   */
  async listOpenPrepaidHolds(): Promise<
    { id: string; abaTranId: string | null; createdAt: Date }[]
  > {
    return this.orderRepository.find({
      where: {
        source: 'online',
        status: 'awaiting_payment',
        paymentStatus: 'unpaid',
      },
      select: ['id', 'abaTranId', 'createdAt'],
    });
  }

  /**
   * Recently expired holds that could still settle late at ABA. Re-checked for
   * a grace window so a payment that lands AFTER expiry still becomes a real
   * paid order (expired → paid), rather than money taken with no order.
   */
  async listRecentlyExpiredHolds(
    withinMs: number,
  ): Promise<{ id: string; abaTranId: string | null }[]> {
    return this.orderRepository.find({
      where: {
        source: 'online',
        status: 'expired',
        paymentStatus: 'unpaid',
        updatedAt: MoreThan(new Date(Date.now() - withinMs)),
      },
      select: ['id', 'abaTranId'],
    });
  }

  /** Mark an unpaid pay-first hold expired (silent: no stock, no notice). */
  async expireHold(id: string): Promise<void> {
    await this.updateStatus(id, 'expired');
  }

  /**
   * Resolve a region + method into a server-trusted fee, validating that the
   * method is enabled and offered in the submitted region. Never trust a
   * client-supplied shipping cost or region.
   */
  private resolveOnlineDelivery(
    methods: ConfiguredMethod[],
    region: DeliveryRegion | undefined,
    method: DeliveryMethod | undefined,
  ): number {
    if (!region || !method) {
      throw new BadRequestException(
        'deliveryRegion and deliveryMethod are required for online orders',
      );
    }

    const conf = methods.find((m) => m.id === method);
    if (!conf) {
      throw new BadRequestException(`Unknown delivery method "${method}"`);
    }
    if (conf.enabled === false) {
      throw new BadRequestException(
        `Delivery method "${method}" is currently disabled`,
      );
    }
    if (conf.regionId && conf.regionId !== region) {
      throw new BadRequestException(
        `Delivery method "${method}" is not available for the selected region`,
      );
    }
    return round2(typeof conf.fee === 'number' ? conf.fee : 0);
  }

  /** First active branch — used to fulfil delivery (non-pickup) online orders. */
  private async primaryBranchId(manager: EntityManager): Promise<string> {
    const branch = await manager.getRepository(BranchEntity).findOne({
      where: { branchStatus: 'active' },
      order: { createdAt: 'ASC' },
    });
    if (!branch) {
      throw new BadRequestException('No active branch is configured');
    }
    return branch.id;
  }

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

    const isOnline = dto.source === 'online';

    // Online: validate the delivery choice + compute the fee server-side. KHQR
    // orders are confirmed against ABA PayWay (real API), so no manual proof is
    // required here.
    let onlineShipping = 0;
    if (isOnline) {
      const { methods } = await this.loadDeliveryConfig();
      onlineShipping = this.resolveOnlineDelivery(
        methods,
        dto.deliveryRegion,
        dto.deliveryMethod,
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      // Pickup uses the chosen branch; delivery (and in-store) resolve a branch.
      let branchId = dto.branchId ?? null;
      if (isOnline && dto.deliveryMethod !== 'pickup') {
        branchId = await this.primaryBranchId(manager);
      }
      if (!branchId) {
        throw new BadRequestException('A branch is required for this order');
      }
      const branch = await manager
        .getRepository(BranchEntity)
        .findOne({ where: { id: branchId } });
      if (branch === null) {
        throw new BadRequestException(`Branch ${branchId} not found`);
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
      // Online delivery fee is computed from config; in-store trusts the POS.
      const shippingCost = isOnline
        ? round2(onlineShipping)
        : round2(dto.shippingCost ?? 0);
      // Discount is computed server-side from a voucher/promo (never trusted
      // from the client). A code must be valid; otherwise the best automatic
      // promo (if any) applies. Delivery promos discount the shipping fee.
      const { discountTotal: voucherDiscount, voucher } =
        await this.vouchers.resolveDiscount(
          manager,
          subtotal,
          shippingCost,
          dto.voucherCode,
          dto.customerId ?? null,
        );
      const discountTotal = Math.min(
        round2(voucherDiscount),
        subtotal + shippingCost,
      );
      const taxAmount = round2(dto.taxAmount ?? 0);
      const grandTotal = round2(
        subtotal - discountTotal + shippingCost + taxAmount,
      );

      // A pay-first (KHQR) online order isn't a real order until it's paid, so
      // it holds NO stock at checkout — the units are only reserved once ABA
      // confirms payment (see applyStatusStock: awaiting_payment → paid).
      const isInStore = dto.source === 'in_store';
      const isPrepay = isOnline && isPrepayMethod(dto.paymentMethod);

      // Move stock: in-store sells now; online (COD/pickup) reserves a hold;
      // pay-first holds nothing until paid.
      for (const vid of variantIds) {
        const quantity = qtyByVariant.get(vid)!;
        if (isInStore) {
          await this.inventoryService.sellStockTx(
            manager,
            vid,
            branchId,
            quantity,
          );
        } else if (!isPrepay) {
          await this.inventoryService.reserveStockTx(
            manager,
            vid,
            branchId,
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
        status: isInStore
          ? 'completed'
          : isPrepay
            ? 'awaiting_payment'
            : 'pending',
        branchId,
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
        deliveryRegion: dto.deliveryRegion ?? null,
        deliveryRegionName: dto.deliveryRegionName ?? null,
        deliveryMethod: dto.deliveryMethod ?? null,
        deliveryMethodName: dto.deliveryMethodName ?? null,
        deliveryAddress: dto.deliveryAddress ?? null,
        deliveryLat: dto.deliveryLat ?? null,
        deliveryLng: dto.deliveryLng ?? null,
        paymentMethod: dto.paymentMethod ?? null,
        paymentMethodName: dto.paymentMethodName ?? null,
        paymentProofUrl: dto.paymentProofUrl ?? null,
        voucherCode: voucher?.code ?? null,
        note: dto.note ?? null,
      });
      const savedOrder = await orderRepo.save(order);

      // Count the redemption once the order is persisted.
      if (voucher) {
        await this.vouchers.markUsedTx(manager, voucher.id);
      }

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

    // Notify staff of a new online order (after the transaction commits). A
    // pay-first (KHQR) order isn't announced until it's actually paid — staff
    // are notified then via "payment received" (see updatePaymentStatus).
    if (isOnline && !isPrepayMethod(dto.paymentMethod)) {
      const o = result.data;
      await this.notifications.notifyStaff(
        'order_new',
        {
          orderNumber: o.orderNumber,
          orderId: o.id,
          hasProof: Boolean(o.paymentProofUrl),
        },
        '/dashboard/orders',
      );
    }

    return result;
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
    } else {
      // Hide pay-first holds that aren't real orders yet (unpaid / expired).
      qb.andWhere('order.status NOT IN (:...hidden)', {
        hidden: HIDDEN_STATUSES,
      });
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
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['branch', 'items'],
    });
    if (order === null) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    const wasPaid = order.paymentStatus === 'paid';
    order.paymentStatus = paymentStatus;
    await this.orderRepository.save(order);
    this.realtime.publish('orders');

    // On first transition to "paid": confirm to the customer and give staff a
    // clear message of what sold and from which branch (stock is deducted from
    // this branch's hold when the order is fulfilled).
    if (paymentStatus === 'paid' && !wasPaid) {
      const items = order.items ?? [];
      const itemCount = items.reduce((n, it) => n + it.quantity, 0);
      const summary = items
        .map((it) => `${it.quantity}× ${it.productName}`)
        .join(', ');

      await this.notifications.notifyStaff(
        'payment_received',
        {
          orderNumber: order.orderNumber,
          orderId: order.id,
          branchName: order.branch?.branchNameEn ?? '',
          customerName: order.customerName ?? '',
          itemCount,
          summary,
        },
        `/dashboard/orders/${order.id}`,
      );

      if (order.customerId) {
        await this.notifications.notifyUser(
          order.customerId,
          'payment_confirmed',
          { orderNumber: order.orderNumber, orderId: order.id },
          `/account/orders/${order.id}`,
        );
      }
    }

    return this.findOne(id);
  }

  /**
   * Prepare an online order for a KHQR payment: derive a stable ABA tran id
   * from the order number, persist it (for webhook/poll lookup), and return the
   * amount to charge. Rejects already-paid or non-online orders.
   */
  async getKhqrPayable(orderId: string): Promise<{
    tranId: string;
    amount: string;
    currency: string;
    firstName: string;
    phone: string;
  }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (order === null) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    if (order.source !== 'online') {
      throw new BadRequestException('Not an online order');
    }
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid');
    }
    const tranId = order.orderNumber
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 20);
    if (order.abaTranId !== tranId) {
      order.abaTranId = tranId;
      await this.orderRepository.save(order);
    }
    return {
      tranId,
      amount: Number(order.grandTotal).toFixed(2),
      currency: order.currency || 'USD',
      firstName: order.customerName ?? '',
      phone: order.customerPhone ?? '',
    };
  }

  /**
   * Mark the order behind an ABA tran id as paid (idempotent). Moves a pending
   * order to `paid` (stock stays reserved for fulfilment) and flips the payment
   * status, which notifies staff + customer. Returns the order id when found.
   */
  async confirmAbaPayment(
    tranId: string,
  ): Promise<{ paid: boolean; orderId: string | null }> {
    const order = await this.orderRepository.findOne({
      where: { abaTranId: tranId },
    });
    if (order === null) return { paid: false, orderId: null };
    if (order.paymentStatus === 'paid') {
      return { paid: true, orderId: order.id };
    }
    // Move a pay-first (awaiting_payment) or COD (pending) order to paid; for a
    // pay-first order this is where its stock is finally reserved. A late
    // payment on an already-expired hold is still honoured — it becomes a real
    // paid order rather than losing the customer's money.
    if (
      order.status === 'awaiting_payment' ||
      order.status === 'pending' ||
      order.status === 'expired'
    ) {
      await this.updateStatus(order.id, 'paid');
    }
    await this.updatePaymentStatus(order.id, 'paid');
    return { paid: true, orderId: order.id };
  }

  async findByCustomer(customerId: string): Promise<OrderListResponse> {
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.branch', 'branch')
      .loadRelationCountAndMap('order.itemCount', 'order.items')
      .where('order.customerId = :customerId', { customerId })
      .andWhere('order.status NOT IN (:...hidden)', { hidden: HIDDEN_STATUSES })
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
    )
      .andWhere('o.status NOT IN (:...hidden)', { hidden: HIDDEN_STATUSES })
      .getCount();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayRow = await applyBranch(
      this.orderRepository
        .createQueryBuilder('o')
        .andWhere('o.createdAt >= :start', { start: startOfDay })
        .andWhere('o.status NOT IN (:...hidden)', { hidden: HIDDEN_STATUSES }),
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
      awaiting_payment: 0,
      pending: 0,
      paid: 0,
      processing: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
      expired: 0,
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
    // Set only when the status actually changes, so we notify once (post-commit).
    let notify: { customerId: string; orderNumber: string } | null = null;
    const result = await this.dataSource.transaction(async (manager) => {
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

      if (order.customerId) {
        notify = {
          customerId: order.customerId,
          orderNumber: order.orderNumber,
        };
      }

      this.realtime.publish('orders');
      return { data: await this.buildDetail(manager, id) };
    });

    // Notify the customer of the status change (after the transaction commits).
    // Silent for hidden states (an abandoned pay-first hold expiring).
    if (notify && !HIDDEN_STATUSES.includes(newStatus)) {
      const n: { customerId: string; orderNumber: string } = notify;
      await this.notifications.notifyUser(
        n.customerId,
        'order_status',
        { orderNumber: n.orderNumber, status: newStatus, orderId: id },
        `/account/orders/${id}`,
      );
    }

    return result;
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
      if (
        (from === 'awaiting_payment' || from === 'expired') &&
        to === 'paid'
      ) {
        // Pay-first order just got paid — reserve its stock now (deferred from
        // checkout). If stock ran out during the payment window we keep the
        // paid order anyway (it's real); staff reconciles the shortfall.
        for (const item of items) {
          try {
            await this.inventoryService.reserveStockTx(
              manager,
              item.productVariantId,
              order.branchId,
              item.quantity,
            );
          } catch {
            // insufficient stock — leave unreserved, the order stays paid.
          }
        }
      } else if (to === 'cancelled' && RESERVED_STATUSES.includes(from)) {
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

    // Attach each line item's product image (first by display order) so the
    // storefront order detail can show a thumbnail. Works for old orders too.
    const productIds = [...new Set((order.items ?? []).map((i) => i.productId))];
    const imageByProduct = new Map<string, string>();
    if (productIds.length > 0) {
      const images = await manager.getRepository(ProductImageEntity).find({
        where: { productId: In(productIds) },
        order: { displayOrder: 'ASC' },
      });
      for (const img of images) {
        if (!imageByProduct.has(img.productId)) {
          imageByProduct.set(img.productId, img.imageUrl);
        }
      }
    }
    return this.toResponse(order, imageByProduct);
  }

  private toResponse(
    order: OrderEntity,
    imageByProduct?: Map<string, string>,
  ): OrderResponse {
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
      deliveryRegion: order.deliveryRegion,
      deliveryRegionName: order.deliveryRegionName,
      deliveryMethod: order.deliveryMethod,
      deliveryMethodName: order.deliveryMethodName,
      deliveryAddress: order.deliveryAddress,
      deliveryLat: order.deliveryLat,
      deliveryLng: order.deliveryLng,
      paymentMethod: order.paymentMethod,
      paymentMethodName: order.paymentMethodName,
      paymentProofUrl: order.paymentProofUrl,
      voucherCode: order.voucherCode,
      note: order.note,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productVariantId: i.productVariantId,
        productName: i.productName,
        productImageUrl: imageByProduct?.get(i.productId) ?? null,
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
      deliveryRegion: order.deliveryRegion,
      deliveryRegionName: order.deliveryRegionName,
      deliveryMethod: order.deliveryMethod,
      deliveryMethodName: order.deliveryMethodName,
      deliveryAddress: order.deliveryAddress,
      deliveryLat: order.deliveryLat,
      deliveryLng: order.deliveryLng,
      paymentMethod: order.paymentMethod,
      paymentMethodName: order.paymentMethodName,
      paymentProofUrl: order.paymentProofUrl,
      voucherCode: order.voucherCode,
      note: order.note,
      itemCount: order.itemCount ?? 0,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
