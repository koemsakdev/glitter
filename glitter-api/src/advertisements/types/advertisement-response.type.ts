import type { AdStatus, AdType } from '../entities/advertisement.entity';
import type { PlacementLocation } from '../entities/ad-placement.entity';

export interface AdvertisementResponse {
  id: string;
  titleEn: string;
  titleKm: string;
  contentEn: string | null;
  contentKm: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  adType: AdType;
  displayFrequency: number;
  viewCount: number;
  clickCount: number;
  status: AdStatus;
  startDate: Date | null;
  endDate: Date | null;
  placements: PlacementLocation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdvertisementListResponse {
  data: AdvertisementResponse[];
  total: number;
}

export interface AdvertisementDetailResponse {
  data: AdvertisementResponse;
}
