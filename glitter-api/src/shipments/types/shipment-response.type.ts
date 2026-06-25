import type { ShipmentStatus } from '../entities/shipment.entity';

export interface ShipmentResponse {
  id: string;
  orderId: string;
  orderNumber: string | null;
  branchId: string | null;
  branchName: string | null;
  trackingNumber: string | null;
  carrierName: string | null;
  status: ShipmentStatus;
  shippedDate: Date | null;
  estimatedDeliveryDate: Date | null;
  actualDeliveryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentListResponse {
  data: ShipmentResponse[];
  total: number;
}

export interface ShipmentDetailResponse {
  data: ShipmentResponse | null;
}
