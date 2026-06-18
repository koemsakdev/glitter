'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="icon"
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground"
                    render={
                        <Link href={`/dashboard/customers/${id}`}>
                            <ArrowLeft className="size-4" />
                        </Link>
                    }
                />
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('customer.edit.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {user.fullName}
                    </p>
                </div>
            </div>

            <CustomerForm customer={user} addresses={addresses ?? []} />
        </div>
    );
}
