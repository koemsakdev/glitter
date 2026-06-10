import { ProductStatus, ProductType } from '../entities/product.entity';
import { ImageType } from '../../product-images/entities/product-image.entity';

export interface ProductImageSummary {
  id: string;
  imageUrl: string;
  imageAltTextEn: string | null;
  imageAltTextKm: string | null;
  imageType: ImageType;
  displayOrder: number;
}

export interface ProductVariantSummary {
  id: string;
  variantSku: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  quantityInStock: number;
  priceOverride: number | null;
  effectivePrice: number;
}

export interface ProductResponse {
  id: string;
  categoryId: string;
  brandId: string;
  sku: string;
  nameEn: string;
  nameKm: string;
  slug: string;
  descriptionEn: string | null;
  descriptionKm: string | null;
  detailsEn: string | null;
  detailsKm: string | null;
  price: number;
  originalPrice: number | null;
  productType: ProductType;
  status: ProductStatus;
  hasBox: boolean;
  hasSingleVariant: boolean;
  totalStock: number;
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  // Populated relations
  category?: {
    id: string;
    slug: string;
    nameEn: string;
    nameKm: string;
  };
  brand?: {
    id: string;
    slug: string;
    name: string;
  };
  images?: ProductImageSummary[];
  variants?: ProductVariantSummary[];
  branchStock?: number | null;
}

export interface ProductListResponse {
  data: ProductResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductDetailResponse {
  data: ProductResponse;
}
