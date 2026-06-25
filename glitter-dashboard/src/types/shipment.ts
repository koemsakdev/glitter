export type ShipmentStatus =
    | 'pending'
    | 'processing'
    | 'shipped'
    | 'in_transit'
    | 'delivered'
    | 'returned'
    | 'cancelled';

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
    'pending',
    'processing',
    'shipped',
    'in_transit',
    'delivered',
    'returned',
    'cancelled',
];

export interface Shipment {
    id: string;
    orderId: string;
    orderNumber: string | null;
    branchId: string | null;
    branchName: string | null;
    trackingNumber: string | null;
    carrierName: string | null;
    status: ShipmentStatus;
    shippedDate: string | null;
    estimatedDeliveryDate: string | null;
    actualDeliveryDate: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ShipmentFormValues {
    carrierName?: string;
    trackingNumber?: string;
    status?: ShipmentStatus;
    shippedDate?: string | null;
    estimatedDeliveryDate?: string | null;
    actualDeliveryDate?: string | null;
}
