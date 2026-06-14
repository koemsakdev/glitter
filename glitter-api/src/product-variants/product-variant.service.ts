import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductEntity } from '../products/entities/product.entity';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { BulkCreateVariantsDto } from './dto/bulk-create-variants.dto';
import { ProductVariantEntity } from './entities/product-variant.entity';
import {
  ProductVariantBulkResponse,
  ProductVariantDetailResponse,
  ProductVariantListResponse,
  ProductVariantOptionsResponse,
  ProductVariantResponse,
} from './types/product-variant-response.type';

@Injectable()
export class ProductVariantsService {
  constructor(
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepository: Repository<ProductVariantEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
  ) {}

  async create(
    dto: CreateProductVariantDto,
  ): Promise<ProductVariantDetailResponse> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (product === null) {
      throw new BadRequestException(
        `Product with ID ${dto.productId} not found`,
      );
    }

    // Reject if the caller is trying to create a null/null variant manually.
    // Default variants are managed automatically by ProductsService.
    if ((dto.size ?? null) === null && (dto.color ?? null) === null) {
      throw new BadRequestException(
        'Variants must have at least a size or a color. Single-variant products have their default variant managed automatically.',
      );
    }

    const existingSku = await this.variantRepository.findOne({
      where: { variantSku: dto.variantSku },
    });
    if (existingSku !== null) {
      throw new ConflictException(
        `Variant with SKU "${dto.variantSku}" already exists`,
      );
    }

    // If the product's SKU itself matches the new variant SKU, reject
    // (it's reserved by the default variant that's about to be deleted).
    const conflictWithProduct = await this.productRepository.findOne({
      where: { sku: dto.variantSku },
    });
    if (
      conflictWithProduct !== null &&
      conflictWithProduct.id !== dto.productId
    ) {
      throw new ConflictException(
        `SKU "${dto.variantSku}" is already used by another product`,
      );
    }

    await this.ensureSizeColorUnique(
      dto.productId,
      dto.size ?? null,
      dto.color ?? null,
    );

    // If this product still has a default variant, delete it now that
    // real variants are being added.
    await this.demoteSingleVariantIfNeeded(dto.productId);

    const entity = this.variantRepository.create({
      productId: dto.productId,
      variantSku: dto.variantSku,
      size: dto.size ?? null,
      color: dto.color ?? null,
      colorHex: dto.colorHex ?? null,
      quantityInStock: dto.quantityInStock ?? 0,
      priceOverride:
        dto.priceOverride !== undefined && dto.priceOverride !== null
          ? dto.priceOverride.toFixed(2)
          : null,
    });

    const saved = await this.variantRepository.save(entity);
    await this.recomputeProductTotalStock(dto.productId);

    return {
      data: this.toResponse(saved, Number(product.price)),
    };
  }

  async createBulk(
    dto: BulkCreateVariantsDto,
  ): Promise<ProductVariantBulkResponse> {
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (product === null) {
      throw new BadRequestException(
        `Product with ID ${dto.productId} not found`,
      );
    }

    // Validate each variant has at least size or color
    for (const v of dto.variants) {
      if ((v.size ?? null) === null && (v.color ?? null) === null) {
        throw new BadRequestException(
          `Variant with SKU "${v.variantSku}" must have at least a size or a color`,
        );
      }
    }

    const skuSet = new Set<string>();
    for (const v of dto.variants) {
      if (skuSet.has(v.variantSku)) {
        throw new BadRequestException(
          `Duplicate SKU "${v.variantSku}" in request payload`,
        );
      }
      skuSet.add(v.variantSku);
    }

    const existingSkus = await this.variantRepository.find({
      where: { variantSku: In([...skuSet]) },
    });
    if (existingSkus.length > 0) {
      const duplicates = existingSkus.map((v) => v.variantSku).join(', ');
      throw new ConflictException(
        `The following SKUs already exist: ${duplicates}`,
      );
    }

    const comboSet = new Set<string>();
    for (const v of dto.variants) {
      const combo = `${v.size ?? ''}|${v.color ?? ''}`;
      if (comboSet.has(combo)) {
        throw new BadRequestException(
          `Duplicate size/color combination in payload: size="${v.size ?? ''}", color="${v.color ?? ''}"`,
        );
      }
      comboSet.add(combo);
    }

    // If the product still has only the default variant, we can skip the
    // existingCombos conflict check because that default variant will be deleted.
    const hasOnlyDefaultVariant = product.hasSingleVariant;
    if (!hasOnlyDefaultVariant) {
      const existingCombos = await this.variantRepository.find({
        where: { productId: dto.productId },
      });
      for (const v of dto.variants) {
        const duplicate = existingCombos.find(
          (e) => e.size === (v.size ?? null) && e.color === (v.color ?? null),
        );
        if (duplicate) {
          throw new ConflictException(
            `Variant with size="${v.size ?? ''}" and color="${v.color ?? ''}" already exists for this product`,
          );
        }
      }
    }

    // Delete the default variant before creating real ones
    await this.demoteSingleVariantIfNeeded(dto.productId);

    const entities = dto.variants.map((v) =>
      this.variantRepository.create({
        productId: dto.productId,
        variantSku: v.variantSku,
        size: v.size ?? null,
        color: v.color ?? null,
        colorHex: v.colorHex ?? null,
        quantityInStock: v.quantityInStock ?? 0,
        priceOverride:
          v.priceOverride !== undefined && v.priceOverride !== null
            ? v.priceOverride.toFixed(2)
            : null,
      }),
    );

    const saved = await this.variantRepository.save(entities);
    await this.recomputeProductTotalStock(dto.productId);

    const productPrice = Number(product.price);
    return {
      data: saved.map((entity: ProductVariantEntity) =>
        this.toResponse(entity, productPrice),
      ),
      total: saved.length,
      created: saved.length,
    };
  }

  async findAll(): Promise<ProductVariantListResponse> {
    const [variants, total] = await this.variantRepository.findAndCount({
      order: { createdAt: 'DESC' },
      relations: ['product'],
    });

    return {
      data: variants.map((variant: ProductVariantEntity) =>
        this.toResponse(
          variant,
          variant.product ? Number(variant.product.price) : undefined,
        ),
      ),
      total: Number(total),
    };
  }

  async findByProduct(productId: string): Promise<ProductVariantListResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (product === null) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const [variants, total] = await this.variantRepository.findAndCount({
      where: { productId },
      order: {
        size: 'ASC',
        color: 'ASC',
        createdAt: 'ASC',
      },
    });

    const productPrice = Number(product.price);
    return {
      data: variants.map((variant: ProductVariantEntity) =>
        this.toResponse(variant, productPrice),
      ),
      total: Number(total),
    };
  }

  /**
   * Get structured options for the storefront variant picker.
   * Groups variants by color, listing available sizes under each.
   * Returns empty arrays for single-variant products.
   */
  async findOptions(productId: string): Promise<ProductVariantOptionsResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (product === null) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Single-variant product → no options to show
    if (product.hasSingleVariant) {
      return {
        data: {
          hasSingleVariant: true,
          colors: [],
          sizes: [],
        },
      };
    }

    const variants = await this.variantRepository.find({
      where: { productId },
      order: { size: 'ASC', color: 'ASC' },
    });

    // Group by color → sizes
    const colorMap = new Map<
      string,
      { color: string; colorHex: string | null; sizes: Set<string> }
    >();
    // Group by size → colors
    const sizeMap = new Map<string, { size: string; colors: Set<string> }>();

    for (const v of variants) {
      if (v.color !== null) {
        const key = v.color;
        const entry = colorMap.get(key) ?? {
          color: v.color,
          colorHex: v.colorHex,
          sizes: new Set<string>(),
        };
        if (v.size !== null) entry.sizes.add(v.size);
        colorMap.set(key, entry);
      }

      if (v.size !== null) {
        const key = v.size;
        const entry = sizeMap.get(key) ?? {
          size: v.size,
          colors: new Set<string>(),
        };
        if (v.color !== null) entry.colors.add(v.color);
        sizeMap.set(key, entry);
      }
    }

    const colors = [...colorMap.values()]
      .map((entry) => ({
        color: entry.color,
        colorHex: entry.colorHex,
        sizes: [...entry.sizes].sort(),
      }))
      .sort((a, b) => a.color.localeCompare(b.color));

    const sizes = [...sizeMap.values()]
      .map((entry) => ({
        size: entry.size,
        colors: [...entry.colors].sort(),
      }))
      .sort((a, b) => a.size.localeCompare(b.size));

    return {
      data: {
        hasSingleVariant: false,
        colors,
        sizes,
      },
    };
  }

  async findOne(id: string): Promise<ProductVariantDetailResponse> {
    const variant = await this.variantRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (variant === null) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    const productPrice = variant.product
      ? Number(variant.product.price)
      : undefined;

    return {
      data: this.toResponse(variant, productPrice),
    };
  }

  async findBySku(variantSku: string): Promise<ProductVariantDetailResponse> {
    const variant = await this.variantRepository.findOne({
      where: { variantSku },
      relations: ['product'],
    });

    if (variant === null) {
      throw new NotFoundException(`Variant with SKU "${variantSku}" not found`);
    }

    const productPrice = variant.product
      ? Number(variant.product.price)
      : undefined;

    return {
      data: this.toResponse(variant, productPrice),
    };
  }

  async update(
    id: string,
    dto: UpdateProductVariantDto,
  ): Promise<ProductVariantDetailResponse> {
    const variant = await this.variantRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (variant === null) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    if (dto.variantSku && dto.variantSku !== variant.variantSku) {
      const existingSku = await this.variantRepository.findOne({
        where: { variantSku: dto.variantSku },
      });
      if (existingSku !== null) {
        throw new ConflictException(
          `Variant with SKU "${dto.variantSku}" already exists`,
        );
      }
      variant.variantSku = dto.variantSku;
    }

    const newSize = dto.size !== undefined ? dto.size : variant.size;
    const newColor = dto.color !== undefined ? dto.color : variant.color;

    // Only guard when size/color is explicitly being changed — allows updating
    // stock/price on the default (null/null) single-variant without error.
    if (
      (dto.size !== undefined || dto.color !== undefined) &&
      newSize === null &&
      newColor === null
    ) {
      throw new BadRequestException(
        'Variant must have at least a size or a color',
      );
    }

    if (newSize !== variant.size || newColor !== variant.color) {
      await this.ensureSizeColorUnique(
        variant.productId,
        newSize,
        newColor,
        id,
      );
    }

    if (dto.size !== undefined) variant.size = dto.size;
    if (dto.color !== undefined) variant.color = dto.color;
    if (dto.colorHex !== undefined) variant.colorHex = dto.colorHex;
    if (dto.quantityInStock !== undefined) {
      variant.quantityInStock = dto.quantityInStock;
    }

    if (dto.priceOverride !== undefined) {
      variant.priceOverride =
        dto.priceOverride !== null ? dto.priceOverride.toFixed(2) : null;
    }

    const updated = await this.variantRepository.save(variant);

    if (dto.quantityInStock !== undefined) {
      await this.recomputeProductTotalStock(variant.productId);
    }

    const productPrice = variant.product
      ? Number(variant.product.price)
      : undefined;

    return {
      data: this.toResponse(updated, productPrice),
    };
  }

  async delete(id: string): Promise<void> {
    const variant = await this.variantRepository.findOne({ where: { id } });

    if (variant === null) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    const productId = variant.productId;

    // If this is the product's default variant (product.hasSingleVariant === true),
    // prevent deletion — otherwise orders/inventory would have nothing to attach to.
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (product?.hasSingleVariant) {
      throw new BadRequestException(
        'Cannot delete the default variant of a single-variant product. Add real variants first.',
      );
    }

    await this.variantRepository.remove(variant);

    // If that was the last real variant, recreate a default and flip flag back
    const remaining = await this.variantRepository.count({
      where: { productId },
    });
    if (remaining === 0 && product !== null) {
      const defaultVariant = this.variantRepository.create({
        productId,
        variantSku: product.sku,
        size: null,
        color: null,
        colorHex: null,
        quantityInStock: 0,
        priceOverride: null,
      });
      await this.variantRepository.save(defaultVariant);
      await this.productRepository.update(
        { id: productId },
        { hasSingleVariant: true },
      );
    }

    await this.recomputeProductTotalStock(productId);
  }

  async adjustStock(
    id: string,
    delta: number,
  ): Promise<ProductVariantDetailResponse> {
    const variant = await this.variantRepository.findOne({ where: { id } });

    if (variant === null) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    const newStock = variant.quantityInStock + delta;
    if (newStock < 0) {
      throw new BadRequestException(
        `Insufficient stock. Current: ${variant.quantityInStock}, requested delta: ${delta}`,
      );
    }

    variant.quantityInStock = newStock;
    const updated = await this.variantRepository.save(variant);
    await this.recomputeProductTotalStock(variant.productId);

    return {
      data: this.toResponse(updated),
    };
  }

  /**
   * If the product has hasSingleVariant=true, delete the default
   * (null size, null color) variant and flip the flag to false.
   */
  private async demoteSingleVariantIfNeeded(productId: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (product === null || !product.hasSingleVariant) {
      return; // Nothing to demote
    }

    // Delete the default variant (null size, null color)
    const defaultVariant = await this.variantRepository.findOne({
      where: { productId, size: undefined, color: undefined },
    });

    // TypeORM's `undefined` doesn't filter by IS NULL — use raw query
    const rawDefault = await this.variantRepository
      .createQueryBuilder('variant')
      .where('variant.productId = :productId', { productId })
      .andWhere('variant.size IS NULL')
      .andWhere('variant.color IS NULL')
      .getOne();

    if (rawDefault !== null) {
      await this.variantRepository.remove(rawDefault);
    } else if (defaultVariant !== null) {
      await this.variantRepository.remove(defaultVariant);
    }

    // Flip the flag
    await this.productRepository.update(
      { id: productId },
      { hasSingleVariant: false },
    );
  }

  private async ensureSizeColorUnique(
    productId: string,
    size: string | null,
    color: string | null,
    excludeVariantId?: string,
  ): Promise<void> {
    const qb = this.variantRepository
      .createQueryBuilder('variant')
      .where('variant.productId = :productId', { productId });

    if (size === null) {
      qb.andWhere('variant.size IS NULL');
    } else {
      qb.andWhere('variant.size = :size', { size });
    }

    if (color === null) {
      qb.andWhere('variant.color IS NULL');
    } else {
      qb.andWhere('variant.color = :color', { color });
    }

    if (excludeVariantId) {
      qb.andWhere('variant.id != :excludeId', { excludeId: excludeVariantId });
    }

    const conflict = await qb.getOne();

    if (conflict !== null) {
      throw new ConflictException(
        `A variant with size="${size ?? ''}" and color="${color ?? ''}" already exists for this product`,
      );
    }
  }

  private async recomputeProductTotalStock(productId: string): Promise<void> {
    const result = await this.variantRepository
      .createQueryBuilder('variant')
      .select('COALESCE(SUM(variant.quantityInStock), 0)', 'sum')
      .where('variant.productId = :productId', { productId })
      .getRawOne<{ sum: string }>();

    const totalStock = result ? Number(result.sum) : 0;

    await this.productRepository.update({ id: productId }, { totalStock });
  }

  private toResponse(
    entity: ProductVariantEntity,
    productPrice?: number,
  ): ProductVariantResponse {
    const priceOverride =
      entity.priceOverride !== null ? Number(entity.priceOverride) : null;

    let effectivePrice: number | undefined;
    if (priceOverride !== null) {
      effectivePrice = priceOverride;
    } else if (productPrice !== undefined) {
      effectivePrice = productPrice;
    }

    return {
      id: entity.id,
      productId: entity.productId,
      variantSku: entity.variantSku,
      size: entity.size,
      color: entity.color,
      colorHex: entity.colorHex,
      quantityInStock: entity.quantityInStock,
      priceOverride,
      effectivePrice,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
