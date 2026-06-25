import type { ProductResponse } from '../../products/types/product-response.type';

export interface WishlistProductStat {
  product: ProductResponse;
  count: number;
}
