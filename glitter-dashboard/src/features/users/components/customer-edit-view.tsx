'use client';

import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { CustomerForm } from '@/features/users/components/customer-form';
import { useUserAddresses } from '@/features/addresses/use-addresses';
import { useUser } from '@/features/users/use-users';
import { useI18n } from '@/lib/i18n';

interface CustomerEditViewProps {
    id: string;
}

export function CustomerEditView({ id }: CustomerEditViewProps) {
    const { t } = useI18n();
    const { data: user, isLoading, isError, refetch } = useUser(id);
    const { data: addresses, isLoading: addressesLoading } =
        useUserAddresses(id);

    if (isLoading || addressesLoading) {
        return <LoadingScreen variant="page" />;
    }

    if (isError || !user) {
        return (
            <ErrorState
                title={t('user.detail.errorTitle')}
                message={t('user.detail.errorMessage')}
                onRetry={() => void refetch()}
            />
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <CustomerForm
                customer={user}
                addresses={addresses ?? []}
                title={t('customer.edit.title')}
                subtitle={user.fullName}
            />
        </div>
    );
}
