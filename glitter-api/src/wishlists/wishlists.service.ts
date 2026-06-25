import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistEntity } from './entities/wishlist.entity';
import { WishlistItemEntity } from './entities/wishlist-item.entity';
import { ProductsService } from '../products/product.service';
import { RealtimeService } from '../realtime/realtime.service';
import type { ProductResponse } from '../products/types/product-response.type';
import type { WishlistProductStat } from './types/wishlist-response.type';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(WishlistEntity)
    private readonly wishlistRepo: Repository<WishlistEntity>,
    @InjectRepository(WishlistItemEntity)
    private readonly itemRepo: Repository<WishlistItemEntity>,
    private readonly productsService: ProductsService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Every customer gets a single default "Favorites" wishlist. */
  async getOrCreateDefault(userId: string): Promise<WishlistEntity> {
    const existing = await this.wishlistRepo.findOne({
      where: { userId, wishlistType: 'default' },
    });
    if (existing) return existing;
    return this.wishlistRepo.save(
      this.wishlistRepo.create({
        userId,
        nameEn: 'Favorites',
        nameKm: 'ចូលចិត្ត',
        wishlistType: 'default',
      }),
    );
  }

  /** Products in a user's wishlist, most recently added first. */
  async getItems(userId: string): Promise<ProductResponse[]> {
    const wishlist = await this.getOrCreateDefault(userId);
    const items = await this.itemRepo.find({
      where: { wishlistId: wishlist.id },
      order: { addedAt: 'DESC' },
    });
    return this.productsService.findManyByIds(
      items.map((i) => i.productId),
      false,
    );
  }

  async addItem(userId: string, dto: AddWishlistItemDto): Promise<void> {
    const found = await this.productsService.findManyByIds(
      [dto.productId],
      false,
    );
    if (found.length === 0) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }
    const wishlist = await this.getOrCreateDefault(userId);
    const existing = await this.itemRepo.findOne({
      where: { wishlistId: wishlist.id, productId: dto.productId },
    });
    if (existing) return;
    await this.itemRepo.save(
      this.itemRepo.create({
        wishlistId: wishlist.id,
        productId: dto.productId,
        productVariantId: dto.productVariantId ?? null,
      }),
    );
    this.realtime.publish('wishlists');
  }

  async removeItem(userId: string, productId: string): Promise<void> {
    const wishlist = await this.getOrCreateDefault(userId);
    await this.itemRepo.delete({ wishlistId: wishlist.id, productId });
    this.realtime.publish('wishlists');
  }

  /** How many customers have this product in a wishlist. */
  async productCount(productId: string): Promise<number> {
    return this.itemRepo.count({ where: { productId } });
  }

  /** Wishlist counts for many products at once: { productId: count }. */
  async countsByProduct(): Promise<Record<string, number>> {
    const rows = await this.itemRepo
      .createQueryBuilder('wi')
      .select('wi.product_id', 'productId')
      .addSelect('COUNT(DISTINCT wi.wishlist_id)', 'cnt')
      .groupBy('wi.product_id')
      .getRawMany<{ productId: string; cnt: string }>();
    const map: Record<string, number> = {};
    for (const r of rows) map[r.productId] = Number(r.cnt);
    return map;
  }

  /** Admin insight: products customers want most (by distinct wishlists). */
  async mostWishlisted(limit = 5): Promise<WishlistProductStat[]> {
    const rows = await this.itemRepo
      .createQueryBuilder('wi')
      .select('wi.product_id', 'productId')
      .addSelect('COUNT(DISTINCT wi.wishlist_id)', 'cnt')
      .groupBy('wi.product_id')
      .orderBy('cnt', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string; cnt: string }>();

    const products = await this.productsService.findManyByIds(
      rows.map((r) => r.productId),
      false,
    );
    const byId = new Map(products.map((p) => [p.id, p]));
    return rows
      .map((r) => {
        const product = byId.get(r.productId);
        return product ? { product, count: Number(r.cnt) } : null;
      })
      .filter((x): x is WishlistProductStat => x !== null);
  }
}
