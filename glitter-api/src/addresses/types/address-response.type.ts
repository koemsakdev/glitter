import { AddressType } from '../entities/address.entity';

export interface AddressResponse {
  id: string;
  userId: string;
  label: string | null;
  recipientName: string;
  recipientPhone: string;
  province: string | null;
  district: string | null;
  commune: string | null;
  village: string | null;
  streetAddress: string;
  postalCode: string | null;
  landmark: string | null;
  addressType: AddressType;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  latitude: string | null;
  longitude: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  formattedAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddressListResponse {
  data: AddressResponse[];
  total: number;
}

export interface AddressDetailResponse {
  data: AddressResponse;
}
