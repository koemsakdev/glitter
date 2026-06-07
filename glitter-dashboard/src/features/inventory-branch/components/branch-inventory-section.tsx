'use client';

import { DetailSection } from '@/components/feedback/detail-section';
import { useI18n } from '@/lib/i18n';
import { BranchInventoryList } from './branch-inventory-list';
import { BranchInventorySummaryCard } from './branch-inventory-summary-card';

interface BranchInventorySectionProps {
    branchId: string;
}

export function BranchInventorySection({
                                           branchId,
                                       }: BranchInventorySectionProps) {
    const { t } = useI18n();

    return (
        <div className="space-y-6">
            {/* Summary stat cards */}
            <BranchInventorySummaryCard branchId={branchId} />

            {/* Product-grouped inventory list */}
            <DetailSection
                title={t('branch.inventory.listTitle')}
                description={t('branch.inventory.listSubtitle')}
            >
                <BranchInventoryList branchId={branchId} />
            </DetailSection>
        </div>
    );
}