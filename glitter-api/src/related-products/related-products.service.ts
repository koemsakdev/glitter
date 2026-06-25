import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RelatedProductEntity } from './entities/related-product.entity';
import { ProductsService } from '../products/product.service';
import { RealtimeService } from '../realtime/realtime.service';
import type { ProductResponse } from '../products/types/product-response.type';

@Injectable()
export class RelatedProductsService {
  constructor(
    @InjectRepository(RelatedProductEntity)
    private readonly relatedRepo: Repository<RelatedProductEntity>,
    private readonly productsService: ProductsService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Ordered related-product IDs for a product. */
  async getIds(productId: string): Promise<string[]> {
    const rows = await this.relatedRepo.find({
      where: { productId },
      order: { displayOrder: 'ASC' },
    });
    return rows.map((r) => r.relatedProductId);
  }

  /** Related products as full responses (for the editor). Includes inactive. */
  async getForProduct(productId: string): Promise<ProductResponse[]> {
    const ids = await this.getIds(productId);
    return this.productsService.findManyByIds(ids, false);
  }

  /** Related products limited to active ones (for the storefront). */
  async getActiveForProduct(productId: string): Promise<ProductResponse[]> {
    const ids = await this.getIds(productId);
    return this.productsService.findManyByIds(ids, true);
  }

  /** Replace the related set for a product. */
  async setForProduct(
    productId: string,
    relatedProductIds: string[],
  ): Promise<ProductResponse[]> {
    await this.relatedRepo.delete({ productId });

    const clean = relatedProductIds.filter((id) => id !== productId);
    if (clean.length > 0) {
      const rows = clean.map((relatedProductId, index) =>
        this.relatedRepo.create({
          productId,
          relatedProductId,
          relationType: 'related',
          displayOrder: index,
        }),
      );
      await this.relatedRepo.save(rows);
    }
    this.realtime.publish('products');
    return this.getForProduct(productId);
  }
}
