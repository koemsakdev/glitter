import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BrandEntity } from '../brands/entities/brand.entity';
import { CategoryEntity } from '../category/entities/category.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { ProductVariantEntity } from '../product-variants/entities/product-variant.entity';
import type { DashboardStatsResponse } from './types/dashboard.type';

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
  ) {}

  async getStats(): Promise<DashboardStatsResponse> {
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
      this.getTopProducts('SUM(oi.quantity)'),
      this.getTopProducts('COUNT(DISTINCT oi.order_id)'),
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
    };
  }

  /**
   * Top products ranked by an order_items aggregate. `metricSql` is a fixed,
   * code-controlled expression (e.g. SUM(oi.quantity) for units sold, or
   * COUNT(DISTINCT oi.order_id) for how many orders bought it).
   */
  private async getTopProducts(metricSql: string): Promise<
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
    const rows: Array<{ product_id: string; metric: string }> =
      await this.productRepo.query(
        `SELECT oi.product_id, ${metricSql} AS metric
         FROM order_items oi
         GROUP BY oi.product_id
         ORDER BY metric DESC
         LIMIT $1`,
        [TOP_PRODUCTS_LIMIT],
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
