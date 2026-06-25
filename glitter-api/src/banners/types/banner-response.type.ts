import type {
  BannerEvent,
  BannerStatus,
  BannerType,
} from '../entities/banner.entity';
import type { BannerPlacement } from '../entities/banner-placement.entity';

export interface BannerResponse {
  id: string;
  titleEn: string;
  titleKm: string;
  imageUrl: string;
  imageAltText: string | null;
  linkUrl: string | null;
  descriptionEn: string | null;
  descriptionKm: string | null;
  buttonLabelEn: string | null;
  buttonLabelKm: string | null;
  bannerType: BannerType;
  bannerEvent: BannerEvent;
  status: BannerStatus;
  startDate: Date | null;
  endDate: Date | null;
  displayOrder: number;
  placements: BannerPlacement[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BannerListResponse {
  data: BannerResponse[];
  total: number;
}

export interface BannerDetailResponse {
  data: BannerResponse;
}
