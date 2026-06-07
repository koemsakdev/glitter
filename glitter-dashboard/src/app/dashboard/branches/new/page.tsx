'use client';

import { BranchForm } from '@/features/branches/components/branch-form';
import { useI18n } from '@/lib/i18n';

export default function NewBranchPage() {
    const { t } = useI18n();

    return (
        <BranchForm
            title={t('branch.create.title')}
            subtitle={t('branch.create.subtitle')}
        />
    );
}