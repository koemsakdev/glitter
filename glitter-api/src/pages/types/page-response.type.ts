export interface PageResponse {
  id: string;
  slug: string;
  titleEn: string;
  titleKm: string;
  bodyEn: string | null;
  bodyKm: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageListResponse {
  data: PageResponse[];
}

export interface PageDetailResponse {
  data: PageResponse;
}
