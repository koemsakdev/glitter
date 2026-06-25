export type OrderSource = 'in_store' | 'online';

export type OrderStatus =
    | 'pending'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'completed'
    | 'cancelled'
    | 'refunded';

export type PaymentMethod = 'cash' | 'khqr' | 'aba';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type OrderPaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export interface OrderItem {
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

export interface OrderPayment {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    reference: string | null;
    paidAt: string | null;
}

export interface Order {
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
    shippingCost: number;
    taxAmount: number;
    grandTotal: number;
    paymentStatus: OrderPaymentStatus;
    currency: string;
    note: string | null;
    itemCount: number;
    items: OrderItem[];
    payments: OrderPayment[];
    createdAt: string;
    updatedAt: string;
}

export type OrderListItem = Omit<Order, 'items' | 'payments'>;

export interface OrderListResponse {
    data: OrderListItem[];
    total: number;
    page: number;
    limit: number;
}

export interface OrderStats {
    totalOrders: number;
    todayOrders: number;
    todayRevenue: number;
    statusCounts: Record<OrderStatus, number>;
}

export interface OrderQuery {
    page?: number;
    limit?: number;
    source?: OrderSource;
    status?: OrderStatus;
    branchId?: string;
    search?: string;
}

export interface OrderItemInput {
    productVariantId: string;
    quantity: number;
}

export interface PaymentInput {
    method: PaymentMethod;
    amount: number;
    reference?: string;
}

export interface CreateOrderPayload {
    source: OrderSource;
    branchId: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    note?: string;
    discountTotal?: number;
    shippingCost?: number;
    taxAmount?: number;
    items: OrderItemInput[];
    payments?: PaymentInput[];
}

/**
 * Allowed status transitions per source (mirrors the backend). Used to render
 * only valid next-status options in the dashboard.
 */
export const ORDER_TRANSITIONS: Record<
    OrderSource,
    Partial<Record<OrderStatus, OrderStatus[]>>
> = {
    online: {
        pending: ['paid', 'processing', 'cancelled'],
        paid: ['processing', 'shipped', 'completed', 'cancelled'],
        processing: ['shipped', 'completed', 'cancelled'],
        shipped: ['completed', 'refunded'],
        completed: ['refunded'],
    },
    in_store: {
        completed: ['refunded'],
    },
};
