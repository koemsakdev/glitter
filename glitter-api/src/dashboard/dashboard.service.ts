import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BrandEntity } from '../brands/entities/brand.entity';
import { CategoryEntity } from '../category/entities/category.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { ProductVariantEntity } from '../product-variants/entities/product-variant.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity } from '../users/entities/user.entity';
import type { DashboardStatsResponse } from './types/dashboard.type';

/** Orders in these states never count toward revenue. */
const REVENUE_EXCLUDED = ['cancelled', 'refunded'];
const RECENT_ORDERS_LIMIT = 6;

const LOW_STOCK_THRESHOLD = 10;
const RECENT_PRODUCTS_LIMIT = 5;
const LOW_STOCK_VARIANTS_LIMIT = 5;
const TOP_BRANDS_LIMIT = 5;
const TOP_CATEGORIES_LIMIT = 5;
const RECENTLY_UPDATED_LIMIT = 5;
const RECENT_UPDATE_WINDOW_DAYS = 7;
const TOP_PRODUCTS_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(BrandEntity)
    private readonly brandRepo: Repository<BrandEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepo: Repository<ProductVariantEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * The stats are ~12 aggregate queries. Admins revisit the dashboard often and
   * the client polls in the background, so we memoize each date-range's payload
   * for a short window — turning most requests into a single in-memory read. A
   * concurrent burst also shares one in-flight computation (no thundering herd).
   */
  private static readonly CACHE_TTL_MS = 20_000;
  private cache = new Map<string, { at: number; data: DashboardStatsResponse }>();
  private inFlight = new Map<string, Promise<DashboardStatsResponse>>();

  async getStats(range?: {
    from?: string;
    to?: string;
  }): Promise<DashboardStatsResponse> {
    const win = this.resolveWindow(range);
    const key = `${win.from.getTime()}|${win.to.getTime()}`;
    const now = Date.now();

    const cached = this.cache.get(key);
    if (cached && now - cached.at < DashboardService.CACHE_TTL_MS) {
      return cached.data;
    }
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const p = this.computeStats(win)
      .then((data) => {
        this.cache.set(key, { at: Date.now(), data });
        return data;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, p);
    return p;
  }

  /** Resolve a from/to range into concrete bounds + a sensible chart step. */
  private resolveWindow(range?: { from?: string; to?: string }): {
    from: Date;
    to: Date;
    granularity: 'day' | 'week' | 'month';
  } {
    const now = new Date();
    const to = range?.to
      ? new Date(`${range.to}T23:59:59.999`)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let from: Date;
    if (range?.from) {
      from = new Date(`${range.from}T00:00:00`);
    } else {
      from = new Date(now);
      from.setDate(now.getDate() - 29);
      from.setHours(0, 0, 0, 0);
    }
    if (from > to) from = new Date(to.getTime() - 86_400_000);

    const dayCount = Math.max(
      1,
      Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1,
    );
    const granularity =
      dayCount <= 45 ? 'day' : dayCount <= 240 ? 'week' : 'month';
    return { from, to, granularity };
  }

  private async computeStats(win: {
    from: Date;
    to: Date;
    granularity: 'day' | 'week' | 'month';
  }): Promise<DashboardStatsResponse> {
    const { from, to, granularity } = win;
    const [
      productCounts,
      brandCounts,
      categoryTotal,
      variantStats,
      recentProducts,
      lowStockVariants,
      recentlyUpdated,
      topBrands,
      topCategories,
      inventory,
      bestSelling,
      mostBought,
      sales,
      ordersByStatus,
      salesSeries,
      recentOrders,
    ] = await Promise.all([
      this.getProductCounts(),
      this.getBrandCounts(),
      this.categoryRepo.count(),
      this.getVariantStats(),
      this.getRecentProducts(),
      this.getLowStockVariants(),
      this.getRecentlyUpdatedProducts(),
      this.getTopBrands(),
      this.getTopCategories(),
      this.getInventoryStats(),
      this.getTopProducts('SUM(oi.quantity)', from, to),
      this.getTopProducts('COUNT(DISTINCT oi.order_id)', from, to),
      this.getSales(from, to),
      this.getOrdersByStatus(from, to),
      this.getSalesSeries(from, to, granularity),
      this.getRecentOrders(),
    ]);

    return {
      products: productCounts,
      brands: brandCounts,
      categories: { total: categoryTotal },
      variants: variantStats,
      recentProducts,
      lowStockVariants,
      recentlyUpdated,
      topBrands,
      topCategories,
      inventory,
      bestSelling,
      mostBought,
      sales,
      ordersByStatus,
      salesSeries,
      recentOrders,
      range: {
        from: this.localDay(from),
        to: this.localDay(to),
        granularity,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Sales analytics — the headline of the dashboard
  // ---------------------------------------------------------------------------

  /** Local 'YYYY-MM-DD' so day buckets line up with the admin's calendar. */
  private localDay(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Revenue + orders in the window, with the preceding equal-length window. */
  private async getSales(from: Date, to: Date) {
    const spanMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(from.getTime() - spanMs - 1);

    const sumBetween = async (a: Date, b: Date) => {
      const row = await this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.grand_total), 0)', 'revenue')
        .addSelect('COUNT(*)', 'orders')
        .where('o.status NOT IN (:...ex)', { ex: REVENUE_EXCLUDED })
        .andWhere('o.created_at BETWEEN :a AND :b', { a, b })
        .getRawOne<{ revenue: string; orders: string }>();
      return {
        revenue: parseFloat(row?.revenue ?? '0'),
        orders: parseInt(row?.orders ?? '0', 10),
      };
    };

    const [cur, prev, pendingOrders, customers] = await Promise.all([
      sumBetween(from, to),
      sumBetween(prevFrom, prevTo),
      this.orderRepo.count({ where: { status: 'pending' } }),
      this.userRepo.count({ where: { role: 'customer' } }),
    ]);

    return {
      revenue: cur.revenue,
      orders: cur.orders,
      avgOrderValue: cur.orders > 0 ? cur.revenue / cur.orders : 0,
      prevRevenue: prev.revenue,
      prevOrders: prev.orders,
      pendingOrders,
      customers,
    };
  }

  private async getOrdersByStatus(from: Date, to: Date) {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.created_at BETWEEN :from AND :to', { from, to })
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    const counts = {
      pending: 0,
      paid: 0,
      processing: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
      refunded: 0,
    };
    rows.forEach((r) => {
      if (r.status in counts) {
        counts[r.status as keyof typeof counts] = parseInt(r.count, 10);
      }
    });
    return counts;
  }

  /** Revenue + order count per bucket across the window (zero-filled). */
  private async getSalesSeries(
    from: Date,
    to: Date,
    granularity: 'day' | 'week' | 'month',
  ) {
    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.created_at', 'createdAt')
      .addSelect('o.grand_total', 'grandTotal')
      .where('o.status NOT IN (:...ex)', { ex: REVENUE_EXCLUDED })
      .andWhere('o.created_at BETWEEN :from AND :to', { from, to })
      .getRawMany<{ createdAt: Date; grandTotal: string }>();

    const bucketKey = (d: Date): string => {
      if (granularity === 'day') return this.localDay(d);
      if (granularity === 'week') {
        const s = new Date(d);
        const dow = (s.getDay() + 6) % 7; // Monday-start
        s.setDate(s.getDate() - dow);
        s.setHours(0, 0, 0, 0);
        return this.localDay(s);
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    };

    const map = new Map<string, { orders: number; revenue: number }>();
    for (const r of rows) {
      const k = bucketKey(new Date(r.createdAt));
      const b = map.get(k) ?? { orders: 0, revenue: 0 };
      b.orders += 1;
      b.revenue += parseFloat(r.grandTotal ?? '0');
      map.set(k, b);
    }

    // Walk buckets from the window start to its end so gaps show as zero.
    const cursor = new Date(from);
    if (granularity === 'day') {
      cursor.setHours(0, 0, 0, 0);
    } else if (granularity === 'week') {
      const dow = (cursor.getDay() + 6) % 7;
      cursor.setDate(cursor.getDate() - dow);
      cursor.setHours(0, 0, 0, 0);
    } else {
      cursor.setDate(1);
      cursor.setHours(0, 0, 0, 0);
    }

    const series: Array<{ day: string; orders: number; revenue: number }> = [];
    let guard = 0;
    while (cursor <= to && guard < 400) {
      const k = bucketKey(cursor);
      const b = map.get(k) ?? { orders: 0, revenue: 0 };
      series.push({ day: k, orders: b.orders, revenue: b.revenue });
      if (granularity === 'day') cursor.setDate(cursor.getDate() + 1);
      else if (granularity === 'week') cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
      guard++;
    }

    // For very long windows (e.g. "all time"), drop the empty run before the
    // first real sale so the chart starts where the data does — keeps fixed
    // short ranges (7/30 days) intact.
    if (series.length > 60) {
      const first = series.findIndex((p) => p.revenue > 0 || p.orders > 0);
      if (first > 1) return series.slice(first - 1);
    }
    return series;
  }

  private async getRecentOrders() {
    const orders = await this.orderRepo.find({
      order: { createdAt: 'DESC' },
      take: RECENT_ORDERS_LIMIT,
    });
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      grandTotal: Number(o.grandTotal),
      status: o.status,
      source: o.source,
      createdAt: o.createdAt,
    }));
  }

  /**
   * Top products ranked by an order_items aggregate. `metricSql` is a fixed,
   * code-controlled expression (e.g. SUM(oi.quantity) for units sold, or
   * COUNT(DISTINCT oi.order_id) for how many orders bought it).
   */
  private async getTopProducts(
    metricSql: string,
    from?: Date,
    to?: Date,
  ): Promise<
    Array<{
      id: string;
      nameEn: string;
      nameKm: string;
      sku: string;
      price: number;
      primaryImageUrl: string | null;
      count: number;
    }>
  > {
    const scoped = from && to;
    const rows: Array<{ product_id: string; metric: string }> =
      await this.productRepo.query(
        `SELECT oi.product_id, ${metricSql} AS metric
         FROM order_items oi
         ${scoped ? 'JOIN orders o ON o.id = oi.order_id' : ''}
         ${scoped ? 'WHERE o.created_at BETWEEN $2 AND $3' : ''}
         GROUP BY oi.product_id
         ORDER BY metric DESC
         LIMIT $1`,
        scoped ? [TOP_PRODUCTS_LIMIT, from, to] : [TOP_PRODUCTS_LIMIT],
      );
    const ids = rows.map((r) => r.product_id);
    if (ids.length === 0) return [];

    const products = await this.productRepo.find({ where: { id: In(ids) } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const primaryImages = await this.productRepo.manager
      .createQueryBuilder()
      .select('img.image_url', 'imageUrl')
      .addSelect('img.product_id', 'productId')
      .from('product_images', 'img')
      .where('img.product_id IN (:...ids)', { ids })
      .andWhere(`img.image_type = 'primary'`)
      .getRawMany<{ imageUrl: string; productId: string }>();
    const imageByProductId = new Map<string, string>();
    primaryImages.forEach((row) =>
      imageByProductId.set(row.productId, row.imageUrl),
    );

    return rows
      .map((r) => {
        const p = byId.get(r.product_id);
        if (!p) return null;
        return {
          id: p.id,
          nameEn: p.nameEn,
          nameKm: p.nameKm,
          sku: p.sku,
          price: parseFloat(p.price),
          primaryImageUrl: imageByProductId.get(p.id) ?? null,
          count: Number(r.metric),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  private async getProductCounts() {
    // Group by status in a single query
    const rows = await this.productRepo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.status')
      .getRawMany<{ status: string; count: string }>();

    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      counts[r.status] = parseInt(r.count, 10);
    });

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return {
      total,
      active: counts['active'] ?? 0,
      draft: counts['draft'] ?? 0,
      outOfStock: counts['out_of_stock'] ?? 0,
      archived: counts['archived'] ?? 0,
      discontinued: counts['discontinued'] ?? 0,
    };
  }

  private async getBrandCounts() {
    const [total, active] = await Promise.all([
      this.brandRepo.count(),
      this.brandRepo.count({ where: { status: 'active' } }),
    ]);
    return { total, active };
  }

  private async getVariantStats() {
    // Use raw aggregates for efficiency
    const result = await this.variantRepo
      .createQueryBuilder('v')
      .select('COALESCE(SUM(v.quantity_in_stock), 0)', 'total')
      .addSelect(
        `SUM(CASE WHEN v.quantity_in_stock = 0 THEN 1 ELSE 0 END)`,
        'out_of_stock_count',
      )
      .addSelect(
        `SUM(CASE WHEN v.quantity_in_stock > 0 AND v.quantity_in_stock < :threshold THEN 1 ELSE 0 END)`,
        'low_stock_count',
      )
      .setParameter('threshold', LOW_STOCK_THRESHOLD)
      .getRawOne<{
        total: string;
        out_of_stock_count: string;
        low_stock_count: string;
      }>();

    return {
      totalStockUnits: parseInt(result?.total ?? '0', 10),
      outOfStockCount: parseInt(result?.out_of_stock_count ?? '0', 10),
      lowStockCount: parseInt(result?.low_stock_count ?? '0', 10),
    };
  }

  private async getRecentProducts() {
    const products = await this.productRepo.find({
      order: { createdAt: 'DESC' },
      take: RECENT_PRODUCTS_LIMIT,
    });

    // Fetch primary images for these products in one batch
    const productIds = products.map((p) => p.id);
    if (productIds.length === 0) return [];

    const primaryImages = await this.productRepo.manager
      .createQueryBuilder()
      .select('img.image_url', 'imageUrl')
      .addSelect('img.product_id', 'productId')
      .from('product_images', 'img')
      .where('img.product_id IN (:...productIds)', { productIds })
      .andWhere(`img.image_type = 'primary'`)
      .getRawMany<{ imageUrl: string; productId: string }>();

    const imageByProductId = new Map<string, string>();
    primaryImages.forEach((row) => {
      imageByProductId.set(row.productId, row.imageUrl);
    });

    return products.map((p) => ({
      id: p.id,
      nameEn: p.nameEn,
      nameKm: p.nameKm,
      sku: p.sku,
      price: parseFloat(p.price),
      status: p.status,
      totalStock: p.totalStock,
      primaryImageUrl: imageByProductId.get(p.id) ?? null,
      createdAt: p.createdAt,
    }));
  }

  private async getLowStockVariants() {
    // Variants with stock between 1 and threshold-1, joined with product info
    const rows = await this.variantRepo
      .createQueryBuilder('v')
      .innerJoin('v.product', 'p')
      .select([
        'v.id AS id',
        'v.variant_sku AS "variantSku"',
        'v.size AS size',
        'v.color AS color',
        'v.color_hex AS "colorHex"',
        'v.quantity_in_stock AS "quantityInStock"',
        'p.id AS "productId"',
        'p.name_en AS "productNameEn"',
        'p.name_km AS "productNameKm"',
      ])
      .where('v.quantity_in_stock > 0')
      .andWhere('v.quantity_in_stock < :threshold', {
        threshold: LOW_STOCK_THRESHOLD,
      })
      .orderBy('v.quantity_in_stock', 'ASC')
      .limit(LOW_STOCK_VARIANTS_LIMIT)
      .getRawMany<{
        id: string;
        variantSku: string;
        size: string | null;
        color: string | null;
        colorHex: string | null;
        quantityInStock: string | number;
        productId: string;
        productNameEn: string;
        productNameKm: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      variantSku: r.variantSku,
      size: r.size,
      color: r.color,
      colorHex: r.colorHex,
      quantityInStock:
        typeof r.quantityInStock === 'string'
          ? parseInt(r.quantityInStock, 10)
          : r.quantityInStock,
      productId: r.productId,
      productNameEn: r.productNameEn,
      productNameKm: r.productNameKm,
    }));
  }

  /**
   * Top 5 products updated in the last 7 days (excludes brand-new ones — they appear in "Recent").
   */
  private async getRecentlyUpdatedProducts() {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - RECENT_UPDATE_WINDOW_DAYS);

    const products = await this.productRepo
      .createQueryBuilder('p')
      .where('p.updated_at > :since', { since: sinceDate })
      // Exclude products whose updated_at equals created_at (just created, not edited)
      .andWhere("p.updated_at > p.created_at + interval '1 minute'")
      .orderBy('p.updated_at', 'DESC')
      .limit(RECENTLY_UPDATED_LIMIT)
      .getMany();

    if (products.length === 0) return [];

    const productIds = products.map((p) => p.id);
    const primaryImages = await this.productRepo.manager
      .createQueryBuilder()
      .select('img.image_url', 'imageUrl')
      .addSelect('img.product_id', 'productId')
      .from('product_images', 'img')
      .where('img.product_id IN (:...productIds)', { productIds })
      .andWhere(`img.image_type = 'primary'`)
      .getRawMany<{ imageUrl: string; productId: string }>();

    const imageByProductId = new Map<string, string>();
    primaryImages.forEach((row) => {
      imageByProductId.set(row.productId, row.imageUrl);
    });

    return products.map((p) => ({
      id: p.id,
      nameEn: p.nameEn,
      nameKm: p.nameKm,
      sku: p.sku,
      price: parseFloat(p.price),
      status: p.status,
      primaryImageUrl: imageByProductId.get(p.id) ?? null,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * Top 5 brands by number of products.
   */
  private async getTopBrands() {
    const rows = await this.brandRepo
      .createQueryBuilder('b')
      .leftJoin('products', 'p', 'p.brand_id = b.id')
      .select('b.id', 'id')
      .addSelect('b.name', 'name')
      .addSelect('b.logo_url', 'logoUrl')
      .addSelect('COUNT(p.id)', 'productCount')
      .groupBy('b.id')
      .orderBy('"productCount"', 'DESC')
      .limit(TOP_BRANDS_LIMIT)
      .getRawMany<{
        id: string;
        name: string;
        logoUrl: string | null;
        productCount: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      logoUrl: r.logoUrl,
      productCount: parseInt(r.productCount, 10),
    }));
  }

  /**
   * Top 5 categories by number of products.
   */
  private async getTopCategories() {
    const rows = await this.categoryRepo
      .createQueryBuilder('c')
      .leftJoin('products', 'p', 'p.category_id = c.id')
      .select('c.id', 'id')
      .addSelect('c.nameEn', 'nameEn')
      .addSelect('c.nameKm', 'nameKm')
      .addSelect('c.iconUrl', 'iconUrl')
      .addSelect('COUNT(p.id)', 'productCount')
      .groupBy('c.id')
      .orderBy('"productCount"', 'DESC')
      .limit(TOP_CATEGORIES_LIMIT)
      .getRawMany<{
        id: string;
        nameEn: string;
        nameKm: string;
        iconUrl: string | null;
        productCount: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      nameEn: r.nameEn,
      nameKm: r.nameKm,
      iconUrl: r.iconUrl,
      productCount: parseInt(r.productCount, 10),
    }));
  }

  /**
   * Aggregate inventory stats — total value, averages.
   */
  private async getInventoryStats() {
    // Total value: sum of (variant stock * effective price)
    // Effective price = price_override OR product.price
    const valueResult = await this.variantRepo
      .createQueryBuilder('v')
      .leftJoin('v.product', 'p')
      .select(
        'COALESCE(SUM(v.quantity_in_stock * COALESCE(v.price_override, p.price)), 0)',
        'totalValue',
      )
      .getRawOne<{ totalValue: string }>();

    // Product price stats
    const priceResult = await this.productRepo
      .createQueryBuilder('p')
      .select('COALESCE(AVG(p.price), 0)', 'avgPrice')
      .addSelect('COALESCE(AVG(p.total_stock), 0)', 'avgStock')
      .getRawOne<{ avgPrice: string; avgStock: string }>();

    return {
      totalValue: parseFloat(valueResult?.totalValue ?? '0'),
      averagePrice: parseFloat(priceResult?.avgPrice ?? '0'),
      averageStockPerProduct: Math.round(
        parseFloat(priceResult?.avgStock ?? '0'),
      ),
    };
  }
}
