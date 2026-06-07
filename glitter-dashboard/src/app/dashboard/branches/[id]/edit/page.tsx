'use client';

import { use } from 'react';
import { BranchForm } from '@/features/branches/components/branch-form';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { useBranch } from '@/features/branches/use-branches';
import { useI18n } from '@/lib/i18n';

interface EditBranchPageProps {
    params: Promise<{ id: string }>;
}

export default function EditBranchPage({ params }: EditBranchPageProps) {
    const { id } = use(params);
    const { t } = useI18n();
    const { data: branch, isLoading, isError, refetch } = useBranch(id);

    if (isLoading) return <LoadingScreen variant="page" />;

    if (isError || !branch) {
        return (
            <ErrorState
                title={t('branch.detail.errorTitle')}
                message={t('branch.detail.errorMessage')}
                onRetry={() => void refetch()}
            />
        );
    }

    return (
        <BranchForm
            branch={branch}
            title={t('branch.edit.title')}
            subtitle={branch.branchNameEn}
        />
    );
}