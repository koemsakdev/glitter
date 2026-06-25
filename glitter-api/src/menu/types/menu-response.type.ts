import type { MenuLocation } from '../entities/menu-item.entity';

export interface MenuItemResponse {
  id: string;
  labelEn: string;
  labelKm: string;
  url: string;
  location: MenuLocation;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuListResponse {
  data: MenuItemResponse[];
}

export interface MenuDetailResponse {
  data: MenuItemResponse;
}
