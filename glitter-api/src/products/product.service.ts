import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../category/entities/category.entity';
import { BrandEntity } from '../brands/entities/brand.entity';
import { ProductVariantEntity } from '../product-variants/entities/product-variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  ProductEntity,
  type ProductStatus,
  type ProductType,
} from './entities/product.entity';
import {
  ProductDetailResponse,
  ProductListResponse,
  ProductResponse,
} from './types/product-response.type';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(BrandEntity)
    private readonly brandRepository: Repository<BrandEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepository: Repository<ProductVariantEntity>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDetailResponse> {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });
    if (category === null) {
      throw new BadRequestException(
        `Category with ID ${dto.categoryId} not found`,
      );
    }

    const brand = await this.brandRepository.findOne({
      where: { id: dto.brandId },
    });
    if (brand === null) {
      throw new BadRequestException(`Brand with ID ${dto.brandId} not found`);
    }

    const existingSku = await this.productRepository.findOne({
      where: { sku: dto.sku },
    });
    if (existingSku !== null) {
      throw new ConflictException(
        `Product with SKU "${dto.sku}" already exists`,
      );
    }
    const existingVariantSku = await this.variantRepository.findOne({
      where: { variantSku: dto.sku },
    });
    if (existingVariantSku !== null) {
      throw new ConflictException(
        `SKU "${dto.sku}" is already used by a product variant`,
      );
    }

    const existingSlug = await this.productRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existingSlug !== null) {
      throw new ConflictException(
        `Product with slug "${dto.slug}" already exists`,
      );
    }

    if (
      dto.originalPrice !== undefined &&
      dto.originalPrice !== null &&
      dto.originalPrice < dto.price
    ) {
      throw new BadRequestException(
        'Original price must be greater than or equal to current price',
      );
    }

    const productType: ProductType = dto.productType ?? 'standard';
    const status: ProductStatus = dto.status ?? 'draft';

    const entity = this.productRepository.create({
      categoryId: dto.categoryId,
      brandId: dto.brandId,
      sku: dto.sku,
      nameEn: dto.nameEn,
      nameKm: dto.nameKm,
      slug: dto.slug,
      descriptionEn: dto.descriptionEn ?? null,
      descriptionKm: dto.descriptionKm ?? null,
      detailsEn: dto.detailsEn ?? null,
      detailsKm: dto.detailsKm ?? null,
      price: dto.price.toFixed(2),
      originalPrice:
        dto.originalPrice !== undefined && dto.originalPrice !== null
          ? dto.originalPrice.toFixed(2)
          : null,
      productType,
      status,
      hasBox: dto.hasBox ?? false,
      hasSingleVariant: true,
      totalStock: 0, // always 0 on creation — derived from variants from here on
      averageRating: 0,
      reviewCount: 0,
    });

    const saved = await this.productRepository.save(entity);

    // Auto-create the default variant with 0 stock.
    // Admins update stock via variant endpoints, which auto-recompute product.totalStock.
    const defaultVariant = this.variantRepository.create({
      productId: saved.id,
      variantSku: saved.sku,
      size: null,
      color: null,
      colorHex: null,
      quantityInStock: 0,
      priceOverride: null,
    });
    await this.variantRepository.save(defaultVariant);

    const withRelations = await this.productRepository.findOne({
      where: { id: saved.id },
      relations: ['category', 'brand', 'images', 'variants'],
      order: { images: { displayOrder: 'ASC' } },
    });

    return {
      data: this.toResponseWithRelations(withRelations ?? saved),
    };
  }

  async findAll(query: ProductQueryDto): Promise<ProductListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }

    const skip = (page - 1) * limit;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.variants', 'variants');

    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.brandId) {
      // qb.andWhere('product.brandId = :brandId', { brandId: query.brandId });
      qb.andWhere(
        `EXISTS (
                  SELECT 1
                  FROM inventory_branch ib
                  INNER JOIN product_variants pv ON pv.id = ib.product_variant_id
                  WHERE pv.product_id = product.id
                    AND ib.branch_id = :branchId
                )`,
        { branchId: query.branchId },
      );
    }

    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    }

    if (query.productType) {
      qb.andWhere('product.productType = :productType', {
        productType: query.productType,
      });
    }

    if (query.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    if (query.search) {
      qb.andWhere(
        '(product.nameEn ILIKE :search OR product.nameKm ILIKE :search OR product.sku ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';
    const sortFieldMap: Record<string, string> = {
      createdAt: 'product.createdAt',
      updatedAt: 'product.updatedAt',
      price: 'product.price',
      nameEn: 'product.nameEn',
      averageRating: 'product.averageRating',
    };
    qb.orderBy(sortFieldMap[sortBy], sortOrder);

    qb.skip(skip).take(limit);

    const [products, total] = await qb.getManyAndCount();

    let branchStockByProduct: Map<string, number> | null = null;

    if (query.branchId && products.length > 0) {
      const productIds = products.map((p) => p.id);
      const stockRows = await this.variantRepository
        .createQueryBuilder('variant')
        .innerJoin(
          'inventory_branch',
          'ib',
          'ib.product_variant_id = variant.id AND ib.branch_id = :branchId',
          { branchId: query.branchId },
        )
        .select('variant.productId', 'productId')
        .addSelect('COALESCE(SUM(ib.quantity_available), 0)', 'stock')
        .where('variant.productId IN (:...productIds)', { productIds })
        .groupBy('variant.productId')
        .getRawMany<{ productId: string; stock: string }>();

      branchStockByProduct = new Map();
      stockRows.forEach((row) => {
        branchStockByProduct!.set(row.productId, Number(row.stock));
      });
    }

    return {
      data: products.map((product: ProductEntity) => {
        const response = this.toResponseWithRelations(product);
        if (branchStockByProduct) {
          response.branchStock = branchStockByProduct.get(product.id) ?? 0;
        }
        return response;
      }),
      total: Number(total),
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ProductDetailResponse> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'brand', 'images', 'variants'],
      order: { images: { displayOrder: 'ASC' } },
    });

    if (product === null) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return {
      data: this.toResponseWithRelations(product),
    };
  }

  async findBySlug(slug: string): Promise<ProductDetailResponse> {
    const product = await this.productRepository.findOne({
      where: { slug },
      relations: ['category', 'brand', 'images', 'variants'],
      order: { images: { displayOrder: 'ASC' } },
    });

    if (product === null) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return {
      data: this.toResponseWithRelations(product),
    };
  }

  async findBySku(sku: string): Promise<ProductDetailResponse> {
    const product = await this.productRepository.findOne({
      where: { sku },
      relations: ['category', 'brand', 'images', 'variants'],
      order: { images: { displayOrder: 'ASC' } },
    });

    if (product === null) {
      throw new NotFoundException(`Product with SKU "${sku}" not found`);
    }

    return {
      data: this.toResponseWithRelations(product),
    };
  }

  async update(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductDetailResponse> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (product === null) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      });
      if (category === null) {
        throw new BadRequestException(
          `Category with ID ${dto.categoryId} not found`,
        );
      }
      product.categoryId = dto.categoryId;
    }

    if (dto.brandId && dto.brandId !== product.brandId) {
      const brand = await this.brandRepository.findOne({
        where: { id: dto.brandId },
      });
      if (brand === null) {
        throw new BadRequestException(`Brand with ID ${dto.brandId} not found`);
      }
      product.brandId = dto.brandId;
    }

    if (dto.sku && dto.sku !== product.sku) {
      const existingSku = await this.productRepository.findOne({
        where: { sku: dto.sku },
      });
      if (existingSku !== null) {
        throw new ConflictException(
          `Product with SKU "${dto.sku}" already exists`,
        );
      }
      product.sku = dto.sku;
    }

    if (dto.slug && dto.slug !== product.slug) {
      const existingSlug = await this.productRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existingSlug !== null) {
        throw new ConflictException(
          `Product with slug "${dto.slug}" already exists`,
        );
      }
      product.slug = dto.slug;
    }

    if (dto.nameEn !== undefined) product.nameEn = dto.nameEn;
    if (dto.nameKm !== undefined) product.nameKm = dto.nameKm;
    if (dto.descriptionEn !== undefined)
      product.descriptionEn = dto.descriptionEn ?? null;
    if (dto.descriptionKm !== undefined)
      product.descriptionKm = dto.descriptionKm ?? null;
    if (dto.detailsEn !== undefined) product.detailsEn = dto.detailsEn ?? null;
    if (dto.detailsKm !== undefined) product.detailsKm = dto.detailsKm ?? null;

    if (dto.price !== undefined) {
      product.price = dto.price.toFixed(2);
    }

    if (dto.originalPrice !== undefined) {
      product.originalPrice =
        dto.originalPrice !== null ? dto.originalPrice.toFixed(2) : null;
    }

    const finalPrice = Number(product.price);
    const finalOriginal =
      product.originalPrice !== null ? Number(product.originalPrice) : null;
    if (finalOriginal !== null && finalOriginal < finalPrice) {
      throw new BadRequestException(
        'Original price must be greater than or equal to current price',
      );
    }

    if (dto.productType !== undefined) product.productType = dto.productType;
    if (dto.status !== undefined) product.status = dto.status;
    if (dto.hasBox !== undefined) product.hasBox = dto.hasBox;

    // NOTE: dto.totalStock is intentionally ignored — totalStock is derived.

    const updated = await this.productRepository.save(product);

    const withRelations = await this.productRepository.findOne({
      where: { id: updated.id },
      relations: ['category', 'brand', 'images', 'variants'],
      order: { images: { displayOrder: 'ASC' } },
    });

    return {
      data: this.toResponseWithRelations(withRelations ?? updated),
    };
  }

  async delete(id: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (product === null) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.remove(product);
  }

  async archive(id: string): Promise<ProductDetailResponse> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (product === null) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    product.status = 'archived';
    const updated = await this.productRepository.save(product);

    return {
      data: this.toResponse(updated),
    };
  }

  /**
   * Recompute product.totalStock from the sum of its variants' quantityInStock.
   * Useful for fixing drift after manual DB changes, imports, or legacy data.
   * In normal operation, variant CRUD auto-maintains this value.
   */
  async syncStock(id: string): Promise<ProductDetailResponse> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (product === null) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const result = await this.variantRepository
      .createQueryBuilder('variant')
      .select('COALESCE(SUM(variant.quantityInStock), 0)', 'sum')
      .where('variant.productId = :productId', { productId: id })
      .getRawOne<{ sum: string }>();

    const totalStock = result ? Number(result.sum) : 0;

    await this.productRepository.update({ id }, { totalStock });

    const refreshed = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'brand', 'images', 'variants'],
      order: { images: { displayOrder: 'ASC' } },
    });

    return {
      data: this.toResponseWithRelations(refreshed ?? product),
    };
  }

  /**
   * Bulk version of syncStock — fixes drift across ALL products.
   * Useful one-time after migrations or data imports.
   */
  async syncAllStock(): Promise<{ updated: number }> {
    const allProducts = await this.productRepository.find();
    let updated = 0;

    for (const product of allProducts) {
      const result = await this.variantRepository
        .createQueryBuilder('variant')
        .select('COALESCE(SUM(variant.quantityInStock), 0)', 'sum')
        .where('variant.productId = :productId', { productId: product.id })
        .getRawOne<{ sum: string }>();

      const totalStock = result ? Number(result.sum) : 0;

      if (totalStock !== product.totalStock) {
        await this.productRepository.update({ id: product.id }, { totalStock });
        updated += 1;
      }
    }

    return { updated };
  }

  private toResponse(entity: ProductEntity): ProductResponse {
    return {
      id: entity.id,
      categoryId: entity.categoryId,
      brandId: entity.brandId,
      sku: entity.sku,
      nameEn: entity.nameEn,
      nameKm: entity.nameKm,
      slug: entity.slug,
      descriptionEn: entity.descriptionEn,
      descriptionKm: entity.descriptionKm,
      detailsEn: entity.detailsEn,
      detailsKm: entity.detailsKm,
      price: Number(entity.price),
      originalPrice:
        entity.originalPrice !== null ? Number(entity.originalPrice) : null,
      productType: entity.productType,
      status: entity.status,
      hasBox: entity.hasBox,
      hasSingleVariant: entity.hasSingleVariant,
      totalStock: entity.totalStock,
      averageRating: Number(entity.averageRating),
      reviewCount: entity.reviewCount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toResponseWithRelations(entity: ProductEntity): ProductResponse {
    const base = this.toResponse(entity);
    const productPrice = Number(entity.price);

    if (entity.category) {
      base.category = {
        id: entity.category.id,
        slug: entity.category.slug,
        nameEn: entity.category.nameEn,
        nameKm: entity.category.nameKm,
      };
    }

    if (entity.brand) {
      base.brand = {
        id: entity.brand.id,
        slug: entity.brand.slug,
        name: entity.brand.name,
      };
    }

    if (entity.images) {
      base.images = entity.images
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          imageAltTextEn: img.imageAltTextEn,
          imageAltTextKm: img.imageAltTextKm,
          imageType: img.imageType,
          displayOrder: img.displayOrder,
        }));
    }

    if (entity.variants) {
      base.variants = entity.variants
        .slice()
        .sort((a, b) => {
          const sizeA = a.size ?? '';
          const sizeB = b.size ?? '';
          if (sizeA !== sizeB) return sizeA.localeCompare(sizeB);
          const colorA = a.color ?? '';
          const colorB = b.color ?? '';
          return colorA.localeCompare(colorB);
        })
        .map((v) => {
          const priceOverride =
            v.priceOverride !== null ? Number(v.priceOverride) : null;
          return {
            id: v.id,
            variantSku: v.variantSku,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            quantityInStock: v.quantityInStock,
            priceOverride,
            effectivePrice: priceOverride ?? productPrice,
          };
        });
    }

    return base;
  }
}
