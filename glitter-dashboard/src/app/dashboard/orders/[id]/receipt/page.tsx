'use client';

import { use } from 'react';
import { OrderReceiptView } from '@/features/orders/components/order-receipt-view';

interface OrderReceiptPageProps {
    params: Promise<{ id: string }>;
}

export default function OrderReceiptPage({ params }: OrderReceiptPageProps) {
    const { id } = use(params);
    return <OrderReceiptView id={id} />;
}
