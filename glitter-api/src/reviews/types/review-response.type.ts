import type { ReviewStatus } from '../entities/review.entity';

export interface ReviewResponse {
  id: string;
  productId: string;
  productNameEn: string | null;
  reviewerName: string;
  reviewerImageUrl: string | null;
  rating: number;
  titleEn: string | null;
  titleKm: string | null;
  commentEn: string | null;
  commentKm: string | null;
  imageUrls: string[];
  verifiedPurchase: boolean;
  helpfulCount: number;
  status: ReviewStatus;
  createdAt: Date;
}

export interface ReviewSummary {
  average: number;
  count: number;
}

export interface ReviewListResponse {
  data: ReviewResponse[];
  total: number;
}

export interface ReviewDetailResponse {
  data: ReviewResponse;
}

export interface ProductReviewsResponse {
  data: ReviewResponse[];
  summary: ReviewSummary;
}
