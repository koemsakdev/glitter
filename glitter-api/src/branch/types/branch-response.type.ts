import type { BranchStatus } from '../entities/branch.entity';

export interface BranchResponse {
  id: string;
  branchCode: string;
  branchNameEn: string;
  branchNameKm: string;
  streetAddress: string;
  city: string;
  phoneNumber: string;
  email: string;
  latitude: number;
  longitude: number;
  openingHours: string | null;
  branchStatus: BranchStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchListResponse {
  data: BranchResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface BranchDetailResponse {
  data: BranchResponse;
}
