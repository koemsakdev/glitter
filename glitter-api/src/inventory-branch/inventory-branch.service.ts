import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ProductVariantEntity } from '../product-variants/entities/product-variant.entity';
import { BranchEntity } from '../branch/entities/branch.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { CreateInventoryBranchDto } from './dto/create-inventory-branch.dto';
import { UpdateInventoryBranchDto } from './dto/update-inventory-branch.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { InventoryBranchEntity } from './entities/inventory-branch.entity';
import {
  BranchAvailability,
  BranchInventoryGroupedResponse,
  BranchInventoryProductGroup,
  BranchInventorySummaryResponse,
  InventoryBranchDetailResponse,
  InventoryBranchListResponse,
  InventoryBranchResponse,
  ProductAvailabilityResponse,
} from './types/inventory-branch-response.type';

@Injectable()
export class InventoryBranchService {
  constructor(
    @InjectRepository(InventoryBranchEntity)
    private readonly inventoryRepository: Repository<InventoryBranchEntity>,
    @InjectRepository(ProductVariantEntity)
    private readonly variantRepository: Repository<ProductVariantEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateInventoryBranchDto,
  ): Promise<InventoryBranchDetailResponse> {
    // Validate variant exists
    const variant = await this.variantRepository.findOne({
      where: { id: dto.productVariantId },
    });
    if (variant === null) {
      throw new BadRequestException(
        `Variant with ID ${dto.productVariantId} not found`,
      );
    }

    // Validate branch exists
    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId },
    });
    if (branch === null) {
      throw new BadRequestException(`Branch with ID ${dto.branchId} not found`);
    }

    // Check for existing record (composite unique)
    const existing = await this.inventoryRepository.findOne({
      where: {
        productVariantId: dto.productVariantId,
        branchId: dto.branchId,
      },
    });
    if (existing !== null) {
      throw new ConflictException(
        `Inventory record already exists for this variant at this branch. Use PATCH to update it.`,
      );
    }

    const entity = this.inventoryRepository.create({
      productVariantId: dto.productVariantId,
      branchId: dto.branchId,
      quantityAvailable: dto.quantityAvailable ?? 0,
      quantityReserved: dto.quantityReserved ?? 0,
      quantityDamaged: dto.quantityDamaged ?? 0,
    });

    const saved = await this.inventoryRepository.save(entity);

    // Sync the variant's global quantityInStock to match SUM of all branches
    await this.syncVariantGlobalStock(dto.productVariantId);

    const withRelations = await this.findOneWithRelations(saved.id);

    return {
      data: this.toResponse(withRelations),
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    branchId?: string,
    productVariantId?: string,
  ): Promise<InventoryBranchListResponse> {
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }

    const skip = (page - 1) * limit;

    const qb = this.inventoryRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.productVariant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('inv.branch', 'branch');

    if (branchId) {
      qb.andWhere('inv.branchId = :branchId', { branchId });
    }

    if (productVariantId) {
      qb.andWhere('inv.productVariantId = :productVariantId', {
        productVariantId,
      });
    }

    qb.orderBy('inv.updatedAt', 'DESC').skip(skip).take(limit);

    const [records, total] = await qb.getManyAndCount();

    return {
      data: records.map((r: InventoryBranchEntity) => this.toResponse(r)),
      total: Number(total),
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<InventoryBranchDetailResponse> {
    const record = await this.findOneWithRelations(id);
    return { data: this.toResponse(record) };
  }

  /**
   * Get stock at a branch, grouped by product and paginated.
   * Pagination is by PRODUCT (a product's variants are never split across pages),
   * with optional search over product name/SKU and variant SKU. The primary image
   * of each product is included so the client doesn't need a second request.
   */
  async findByBranch(
    branchId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<BranchInventoryGroupedResponse> {
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }

    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });
    if (branch === null) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const skip = (page - 1) * limit;
    const term = search?.trim();

    // Base query: inventory at this branch, joined to variant + product.
    const applySearch = (qb: ReturnType<typeof this.buildBranchBaseQuery>) => {
      if (term) {
        qb.andWhere(
          '(product.nameEn ILIKE :s OR product.nameKm ILIKE :s OR product.sku ILIKE :s OR variant.variantSku ILIKE :s)',
          { s: `%${term}%` },
        );
      }
      return qb;
    };

    // Count distinct products (for pagination total).
    const countRow = await applySearch(this.buildBranchBaseQuery(branchId))
      .select('COUNT(DISTINCT product.id)', 'count')
      .getRawOne<{ count: string }>();
    const total = Number(countRow?.count ?? 0);

    // The page of product IDs, ordered by product name.
    const idRows = await applySearch(this.buildBranchBaseQuery(branchId))
      .select('product.id', 'productId')
      .addSelect('product.nameEn', 'nameEn')
      .groupBy('product.id')
      .addGroupBy('product.nameEn')
      .orderBy('product.nameEn', 'ASC')
      .offset(skip)
      .limit(limit)
      .getRawMany<{ productId: string; nameEn: string }>();

    const productIds = idRows.map((r) => r.productId);
    if (productIds.length === 0) {
      return { data: [], total, page, limit };
    }

    // Load every inventory row (with variant + product) for the page's products.
    const records = await this.inventoryRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.productVariant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .where('inv.branchId = :branchId', { branchId })
      .andWhere('product.id IN (:...productIds)', { productIds })
      .orderBy('variant.size', 'ASC')
      .addOrderBy('variant.color', 'ASC')
      .getMany();

    // Resolve each product's primary image in one query.
    const products = await this.productRepository.find({
      where: { id: In(productIds) },
      relations: ['images'],
    });
    const imageByProduct = new Map<string, string | null>();
    for (const p of products) {
      const primary =
        p.images?.find((img) => img.imageType === 'primary') ?? p.images?.[0];
      imageByProduct.set(p.id, primary?.imageUrl ?? null);
    }

    // Group rows by product, preserving the page's name order.
    const groups = new Map<string, BranchInventoryProductGroup>();
    for (const r of records) {
      const product = r.productVariant?.product;
      const variant = r.productVariant;
      if (!product || !variant) continue;

      let group = groups.get(product.id);
      if (!group) {
        group = {
          productId: product.id,
          sku: product.sku,
          nameEn: product.nameEn,
          nameKm: product.nameKm,
          slug: product.slug,
          primaryImageUrl: imageByProduct.get(product.id) ?? null,
          totalAvailable: 0,
          totalReserved: 0,
          totalDamaged: 0,
          variants: [],
        };
        groups.set(product.id, group);
      }

      group.variants.push({
        inventoryId: r.id,
        variantId: variant.id,
        variantSku: variant.variantSku,
        size: variant.size ?? null,
        color: variant.color ?? null,
        colorHex: variant.colorHex ?? null,
        quantityAvailable: r.quantityAvailable,
        quantityReserved: r.quantityReserved,
        quantityDamaged: r.quantityDamaged,
      });
      group.totalAvailable += r.quantityAvailable;
      group.totalReserved += r.quantityReserved;
      group.totalDamaged += r.quantityDamaged;
    }

    const data = productIds
      .map((id) => groups.get(id))
      .filter((g): g is BranchInventoryProductGroup => g !== undefined);

    return { data, total, page, limit };
  }

  // ---------------------------------------------------------------------------
  // Transaction-aware stock primitives — used by the Orders service so that order
  // creation and stock movement commit (or roll back) together, atomically.
  // Each locks the inventory row for the variant+branch with a pessimistic write.
  // ---------------------------------------------------------------------------

  private async lockStockRow(
    manager: EntityManager,
    productVariantId: string,
    branchId: string,
  ): Promise<InventoryBranchEntity> {
    const record = await manager.getRepository(InventoryBranchEntity).findOne({
      where: { productVariantId, branchId },
      lock: { mode: 'pessimistic_write' },
    });
    if (record === null) {
      throw new BadRequestException(
        'This product is not stocked at the selected branch',
      );
    }
    return record;
  }

  /** In-store sale: goods leave the shelf immediately (available -= qty). */
  async sellStockTx(
    manager: EntityManager,
    productVariantId: string,
    branchId: string,
    quantity: number,
  ): Promise<void> {
    const repo = manager.getRepository(InventoryBranchEntity);
    const record = await this.lockStockRow(manager, productVariantId, branchId);
    if (record.quantityAvailable < quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${record.productVariantId}: have ${record.quantityAvailable}, need ${quantity}`,
      );
    }
    record.quantityAvailable -= quantity;
    await repo.save(record);
    await this.syncVariantGlobalStockViaManager(manager, productVariantId);
  }

  /** Online order placed: hold stock (available -= qty, reserved += qty). */
  async reserveStockTx(
    manager: EntityManager,
    productVariantId: string,
    branchId: string,
    quantity: number,
  ): Promise<void> {
    const repo = manager.getRepository(InventoryBranchEntity);
    const record = await this.lockStockRow(manager, productVariantId, branchId);
    if (record.quantityAvailable < quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${record.productVariantId}: have ${record.quantityAvailable}, need ${quantity}`,
      );
    }
    record.quantityAvailable -= quantity;
    record.quantityReserved += quantity;
    await repo.save(record);
    await this.syncVariantGlobalStockViaManager(manager, productVariantId);
  }

  /** Online order fulfilled: reserved stock is sold (reserved -= qty). */
  async commitStockTx(
    manager: EntityManager,
    productVariantId: string,
    branchId: string,
    quantity: number,
  ): Promise<void> {
    const repo = manager.getRepository(InventoryBranchEntity);
    const record = await this.lockStockRow(manager, productVariantId, branchId);
    record.quantityReserved = Math.max(0, record.quantityReserved - quantity);
    await repo.save(record);
    await this.syncVariantGlobalStockViaManager(manager, productVariantId);
  }

  /** Online order cancelled before fulfilment: release the hold back to available. */
  async releaseStockTx(
    manager: EntityManager,
    productVariantId: string,
    branchId: string,
    quantity: number,
  ): Promise<void> {
    const repo = manager.getRepository(InventoryBranchEntity);
    const record = await this.lockStockRow(manager, productVariantId, branchId);
    const release = Math.min(quantity, record.quantityReserved);
    record.quantityReserved -= release;
    record.quantityAvailable += release;
    await repo.save(record);
    await this.syncVariantGlobalStockViaManager(manager, productVariantId);
  }

  /** Refund: sold goods come back onto the shelf (available += qty). */
  async returnStockTx(
    manager: EntityManager,
    productVariantId: string,
    branchId: string,
    quantity: number,
  ): Promise<void> {
    const repo = manager.getRepository(InventoryBranchEntity);
    const record = await this.lockStockRow(manager, productVariantId, branchId);
    record.quantityAvailable += quantity;
    await repo.save(record);
    await this.syncVariantGlobalStockViaManager(manager, productVariantId);
  }

  /** Shared base query: inventory at a branch joined to its variant + product. */
  private buildBranchBaseQuery(branchId: string) {
    return this.inventoryRepository
      .createQueryBuilder('inv')
      .innerJoin('inv.productVariant', 'variant')
      .innerJoin('variant.product', 'product')
      .where('inv.branchId = :branchId', { branchId });
  }

  /**
   * Get all stock for a specific variant (across all branches)
   */
  async findByVariant(
    productVariantId: string,
  ): Promise<InventoryBranchListResponse> {
    const variant = await this.variantRepository.findOne({
      where: { id: productVariantId },
    });
    if (variant === null) {
      throw new NotFoundException(
        `Variant with ID ${productVariantId} not found`,
      );
    }

    const records = await this.inventoryRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.productVariant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('inv.branch', 'branch')
      .where('inv.productVariantId = :productVariantId', { productVariantId })
      .orderBy('branch.branchNameEn', 'ASC')
      .getMany();

    return {
      data: records.map((r: InventoryBranchEntity) => this.toResponse(r)),
      total: records.length,
      page: 1,
      limit: records.length,
    };
  }

  /**
   * The KEY endpoint for your shop:
   * "For this Gucci bag, which branches have it? In what sizes and colors?"
   */
  async getProductAvailability(
    productId: string,
  ): Promise<ProductAvailabilityResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (product === null) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const records = await this.inventoryRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.productVariant', 'variant')
      .leftJoinAndSelect('inv.branch', 'branch')
      .where('variant.productId = :productId', { productId })
      .orderBy('branch.branchNameEn', 'ASC')
      .addOrderBy('variant.size', 'ASC')
      .addOrderBy('variant.color', 'ASC')
      .getMany();

    const branches: BranchAvailability[] = records.map(
      (r: InventoryBranchEntity) => ({
        branchId: r.branchId,
        branchCode: r.branch?.branchCode ?? '',
        branchNameEn: r.branch?.branchNameEn ?? '',
        branchNameKm: r.branch?.branchNameKm ?? '',
        variantId: r.productVariantId,
        variantSku: r.productVariant?.variantSku ?? '',
        size: r.productVariant?.size ?? null,
        color: r.productVariant?.color ?? null,
        colorHex: r.productVariant?.colorHex ?? null,
        quantityAvailable: r.quantityAvailable,
        quantityReserved: r.quantityReserved,
        quantityDamaged: r.quantityDamaged,
        totalQuantity:
          r.quantityAvailable + r.quantityReserved + r.quantityDamaged,
      }),
    );

    return {
      data: {
        productId: product.id,
        nameEn: product.nameEn,
        nameKm: product.nameKm,
        branches,
      },
    };
  }

  /**
   * Summary: how much total stock does this branch carry?
   */
  async getBranchSummary(
    branchId: string,
  ): Promise<BranchInventorySummaryResponse> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });
    if (branch === null) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const result = await this.inventoryRepository
      .createQueryBuilder('inv')
      .select('COUNT(*)', 'totalVariants')
      .addSelect(
        'COALESCE(SUM(inv.quantityAvailable), 0)',
        'totalUnitsAvailable',
      )
      .addSelect('COALESCE(SUM(inv.quantityReserved), 0)', 'totalUnitsReserved')
      .addSelect('COALESCE(SUM(inv.quantityDamaged), 0)', 'totalUnitsDamaged')
      .where('inv.branchId = :branchId', { branchId })
      .getRawOne<{
        totalVariants: string;
        totalUnitsAvailable: string;
        totalUnitsReserved: string;
        totalUnitsDamaged: string;
      }>();

    return {
      data: {
        branchId,
        totalVariants: Number(result?.totalVariants ?? 0),
        totalUnitsAvailable: Number(result?.totalUnitsAvailable ?? 0),
        totalUnitsReserved: Number(result?.totalUnitsReserved ?? 0),
        totalUnitsDamaged: Number(result?.totalUnitsDamaged ?? 0),
      },
    };
  }

  async update(
    id: string,
    dto: UpdateInventoryBranchDto,
  ): Promise<InventoryBranchDetailResponse> {
    const record = await this.inventoryRepository.findOne({ where: { id } });

    if (record === null) {
      throw new NotFoundException(`Inventory record with ID ${id} not found`);
    }

    if (dto.quantityAvailable !== undefined) {
      record.quantityAvailable = dto.quantityAvailable;
    }
    if (dto.quantityReserved !== undefined) {
      record.quantityReserved = dto.quantityReserved;
    }
    if (dto.quantityDamaged !== undefined) {
      record.quantityDamaged = dto.quantityDamaged;
    }

    const updated = await this.inventoryRepository.save(record);

    // Resync variant global stock if any quantity changed
    if (
      dto.quantityAvailable !== undefined ||
      dto.quantityReserved !== undefined ||
      dto.quantityDamaged !== undefined
    ) {
      await this.syncVariantGlobalStock(record.productVariantId);
    }

    const withRelations = await this.findOneWithRelations(updated.id);
    return { data: this.toResponse(withRelations) };
  }

  async delete(id: string): Promise<void> {
    const record = await this.inventoryRepository.findOne({ where: { id } });

    if (record === null) {
      throw new NotFoundException(`Inventory record with ID ${id} not found`);
    }

    const variantId = record.productVariantId;
    await this.inventoryRepository.remove(record);

    // Resync global stock after removal
    await this.syncVariantGlobalStock(variantId);
  }

  /**
   * Reserve stock: move units from available → reserved.
   * Used when customer starts checkout or holds an item.
   * Runs in a transaction to prevent race conditions.
   */
  async reserve(dto: ReserveStockDto): Promise<InventoryBranchDetailResponse> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(InventoryBranchEntity);

      const record = await repo.findOne({
        where: {
          productVariantId: dto.productVariantId,
          branchId: dto.branchId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (record === null) {
        throw new NotFoundException(
          `No inventory record found for this variant at this branch`,
        );
      }

      if (record.quantityAvailable < dto.quantity) {
        throw new BadRequestException(
          `Insufficient available stock. Have ${record.quantityAvailable}, need ${dto.quantity}`,
        );
      }

      record.quantityAvailable -= dto.quantity;
      record.quantityReserved += dto.quantity;

      const updated = await repo.save(record);
      return {
        data: this.toResponse(
          await this.findOneWithRelationsViaManager(manager, updated.id),
        ),
      };
    });
  }

  /**
   * Release reservation: move units from reserved → available.
   * Used when customer cancels or abandons checkout.
   */
  async releaseReservation(
    dto: ReserveStockDto,
  ): Promise<InventoryBranchDetailResponse> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(InventoryBranchEntity);

      const record = await repo.findOne({
        where: {
          productVariantId: dto.productVariantId,
          branchId: dto.branchId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (record === null) {
        throw new NotFoundException(
          `No inventory record found for this variant at this branch`,
        );
      }

      if (record.quantityReserved < dto.quantity) {
        throw new BadRequestException(
          `Cannot release more than reserved. Reserved: ${record.quantityReserved}, requested release: ${dto.quantity}`,
        );
      }

      record.quantityReserved -= dto.quantity;
      record.quantityAvailable += dto.quantity;

      const updated = await repo.save(record);
      return {
        data: this.toResponse(
          await this.findOneWithRelationsViaManager(manager, updated.id),
        ),
      };
    });
  }

  /**
   * Commit reservation: remove units from reserved entirely (sold).
   * Global variant stock decreases to match.
   */
  async commitReservation(
    dto: ReserveStockDto,
  ): Promise<InventoryBranchDetailResponse> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(InventoryBranchEntity);

      const record = await repo.findOne({
        where: {
          productVariantId: dto.productVariantId,
          branchId: dto.branchId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (record === null) {
        throw new NotFoundException(
          `No inventory record found for this variant at this branch`,
        );
      }

      if (record.quantityReserved < dto.quantity) {
        throw new BadRequestException(
          `Cannot commit more than reserved. Reserved: ${record.quantityReserved}, requested: ${dto.quantity}`,
        );
      }

      record.quantityReserved -= dto.quantity;
      const updated = await repo.save(record);

      // After committing (selling), sync the variant's global stock
      await this.syncVariantGlobalStockViaManager(
        manager,
        record.productVariantId,
      );

      return {
        data: this.toResponse(
          await this.findOneWithRelationsViaManager(manager, updated.id),
        ),
      };
    });
  }

  /**
   * Transfer stock between branches (e.g., restocking from warehouse to store).
   * Decrements source.available, increments destination.available.
   * Runs in a transaction.
   */
  async transfer(dto: TransferStockDto): Promise<{
    from: InventoryBranchResponse;
    to: InventoryBranchResponse;
  }> {
    if (dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException(
        'fromBranchId and toBranchId must be different',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(InventoryBranchEntity);

      // Lock source record
      const source = await repo.findOne({
        where: {
          productVariantId: dto.productVariantId,
          branchId: dto.fromBranchId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (source === null) {
        throw new NotFoundException(
          `No inventory record at source branch for this variant`,
        );
      }

      if (source.quantityAvailable < dto.quantity) {
        throw new BadRequestException(
          `Insufficient available stock at source branch. Have ${source.quantityAvailable}, need ${dto.quantity}`,
        );
      }

      // Validate destination branch exists
      const toBranch = await this.branchRepository.findOne({
        where: { id: dto.toBranchId },
      });
      if (toBranch === null) {
        throw new BadRequestException(
          `Destination branch ${dto.toBranchId} not found`,
        );
      }

      // Get or create destination record
      let destination = await repo.findOne({
        where: {
          productVariantId: dto.productVariantId,
          branchId: dto.toBranchId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (destination === null) {
        destination = repo.create({
          productVariantId: dto.productVariantId,
          branchId: dto.toBranchId,
          quantityAvailable: 0,
          quantityReserved: 0,
          quantityDamaged: 0,
        });
      }

      // Apply the transfer
      source.quantityAvailable -= dto.quantity;
      destination.quantityAvailable += dto.quantity;

      const [savedSource, savedDestination] = await Promise.all([
        repo.save(source),
        repo.save(destination),
      ]);

      // Global variant stock doesn't change (inter-branch transfer)
      return {
        from: this.toResponse(
          await this.findOneWithRelationsViaManager(manager, savedSource.id),
        ),
        to: this.toResponse(
          await this.findOneWithRelationsViaManager(
            manager,
            savedDestination.id,
          ),
        ),
      };
    });
  }

  // --- Helpers ---

  private async findOneWithRelations(
    id: string,
  ): Promise<InventoryBranchEntity> {
    const record = await this.inventoryRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.productVariant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('inv.branch', 'branch')
      .where('inv.id = :id', { id })
      .getOne();

    if (record === null) {
      throw new NotFoundException(`Inventory record with ID ${id} not found`);
    }

    return record;
  }

  private async findOneWithRelationsViaManager(
    manager: {
      getRepository: typeof Repository.prototype.manager.getRepository;
    },
    id: string,
  ): Promise<InventoryBranchEntity> {
    const repo = manager.getRepository(InventoryBranchEntity);
    const record = await repo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.productVariant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('inv.branch', 'branch')
      .where('inv.id = :id', { id })
      .getOne();

    if (record === null) {
      throw new NotFoundException(`Inventory record with ID ${id} not found`);
    }

    return record;
  }

  /**
   * Sync the variant's global quantityInStock to the sum of all branches' available + reserved.
   * (Damaged stock is excluded — it's not sellable.)
   * Also triggers product totalStock recompute via the variant update.
   */
  private async syncVariantGlobalStock(variantId: string): Promise<void> {
    const result = await this.inventoryRepository
      .createQueryBuilder('inv')
      .select(
        'COALESCE(SUM(inv.quantityAvailable + inv.quantityReserved), 0)',
        'sum',
      )
      .where('inv.productVariantId = :variantId', { variantId })
      .getRawOne<{ sum: string }>();

    const newGlobalStock = result ? Number(result.sum) : 0;

    await this.variantRepository.update(
      { id: variantId },
      { quantityInStock: newGlobalStock },
    );

    // Recompute product totalStock (sum of all its variants)
    const variant = await this.variantRepository.findOne({
      where: { id: variantId },
    });
    if (variant !== null) {
      const productResult = await this.variantRepository
        .createQueryBuilder('v')
        .select('COALESCE(SUM(v.quantityInStock), 0)', 'sum')
        .where('v.productId = :productId', { productId: variant.productId })
        .getRawOne<{ sum: string }>();

      const totalStock = productResult ? Number(productResult.sum) : 0;
      await this.productRepository.update(
        { id: variant.productId },
        { totalStock },
      );
    }
  }

  /**
   * Same as syncVariantGlobalStock but runs on a transaction manager.
   */
  private async syncVariantGlobalStockViaManager(
    manager: {
      getRepository: typeof Repository.prototype.manager.getRepository;
    },
    variantId: string,
  ): Promise<void> {
    const invRepo = manager.getRepository(InventoryBranchEntity);
    const variantRepo = manager.getRepository(ProductVariantEntity);
    const productRepo = manager.getRepository(ProductEntity);

    const result = await invRepo
      .createQueryBuilder('inv')
      .select(
        'COALESCE(SUM(inv.quantityAvailable + inv.quantityReserved), 0)',
        'sum',
      )
      .where('inv.productVariantId = :variantId', { variantId })
      .getRawOne<{ sum: string }>();

    const newGlobalStock = result ? Number(result.sum) : 0;
    await variantRepo.update(
      { id: variantId },
      { quantityInStock: newGlobalStock },
    );

    const variant = await variantRepo.findOne({ where: { id: variantId } });
    if (variant !== null) {
      const productResult = await variantRepo
        .createQueryBuilder('v')
        .select('COALESCE(SUM(v.quantityInStock), 0)', 'sum')
        .where('v.productId = :productId', { productId: variant.productId })
        .getRawOne<{ sum: string }>();

      const totalStock = productResult ? Number(productResult.sum) : 0;
      await productRepo.update({ id: variant.productId }, { totalStock });
    }
  }

  private toResponse(entity: InventoryBranchEntity): InventoryBranchResponse {
    const response: InventoryBranchResponse = {
      id: entity.id,
      productVariantId: entity.productVariantId,
      branchId: entity.branchId,
      quantityAvailable: entity.quantityAvailable,
      quantityReserved: entity.quantityReserved,
      quantityDamaged: entity.quantityDamaged,
      totalQuantity:
        entity.quantityAvailable +
        entity.quantityReserved +
        entity.quantityDamaged,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    if (entity.productVariant) {
      response.variant = {
        id: entity.productVariant.id,
        variantSku: entity.productVariant.variantSku,
        size: entity.productVariant.size,
        color: entity.productVariant.color,
        colorHex: entity.productVariant.colorHex,
      };

      if (entity.productVariant.product) {
        response.product = {
          id: entity.productVariant.product.id,
          sku: entity.productVariant.product.sku,
          nameEn: entity.productVariant.product.nameEn,
          nameKm: entity.productVariant.product.nameKm,
          slug: entity.productVariant.product.slug,
        };
      }
    }

    if (entity.branch) {
      response.branch = {
        id: entity.branch.id,
        branchCode: entity.branch.branchCode,
        branchNameEn: entity.branch.branchNameEn,
        branchNameKm: entity.branch.branchNameKm,
      };
    }

    return response;
  }
}
