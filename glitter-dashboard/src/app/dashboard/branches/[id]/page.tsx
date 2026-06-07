'use client';

import { use } from 'react';
import { BranchDetailView } from '@/features/branches/components/branch-detail-view';

interface BranchDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function BranchDetailPage({ params }: BranchDetailPageProps) {
    const { id } = use(params);
    return <BranchDetailView id={id} />;
}