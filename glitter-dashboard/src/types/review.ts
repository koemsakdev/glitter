export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface Review {
    id: string;
    productId: string;
    productNameEn: string | null;
    reviewerName: string;
    rating: number;
    titleEn: string | null;
    titleKm: string | null;
    commentEn: string | null;
    commentKm: string | null;
    verifiedPurchase: boolean;
    helpfulCount: number;
    status: ReviewStatus;
    createdAt: string;
}

export interface ReviewListResponse {
    data: Review[];
    total: number;
}
