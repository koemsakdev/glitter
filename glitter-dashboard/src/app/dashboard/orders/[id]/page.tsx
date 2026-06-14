'use client';

import { use } from 'react';
import { OrderDetailView } from '@/features/orders/components/order-detail-view';

interface OrderDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
    const { id } = use(params);
    return <OrderDetailView id={id} />;
}
