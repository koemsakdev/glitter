import type { OrderSource, OrderStatus } from '../entities/order.entity';
import type { PaymentMethod, PaymentStatus } from '../entities/payment.entity';

export interface OrderItemResponse {
  id: string;
  productId: string;
  productVariantId: string;
  productName: string;
  variantSku: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface PaymentResponse {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  reference: string | null;
  paidAt: Date | null;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  source: OrderSource;
  status: OrderStatus;
  branchId: string;
  branchName: string | null;
  customerId: string | null;
  cashierId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  currency: string;
  note: string | null;
  itemCount: number;
  items: OrderItemResponse[];
  payments: PaymentResponse[];
  createdAt: Date;
  updatedAt: Date;
}

/** List rows omit the heavy items/payments arrays. */
export type OrderListItem = Omit<OrderResponse, 'items' | 'payments'>;

export interface OrderListResponse {
  data: OrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderDetailResponse {
  data: OrderResponse;
}

export interface OrderStatsResponse {
  totalOrders: number;
  todayOrders: number;
  todayRevenue: number;
  statusCounts: Record<OrderStatus, number>;
}
