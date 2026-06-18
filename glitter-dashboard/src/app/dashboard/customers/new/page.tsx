'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CustomerForm } from '@/features/users/components/customer-form';
import { useI18n } from '@/lib/i18n';

export default function NewCustomerPage() {
    const { t } = useI18n();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="icon"
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground"
                    render={
                        <Link href="/dashboard/customers">
                            <ArrowLeft className="size-4" />
                        </Link>
                    }
                />
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('customer.create.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('customer.create.subtitle')}
                    </p>
                </div>
            </div>

            <CustomerForm />
        </div>
    );
}
