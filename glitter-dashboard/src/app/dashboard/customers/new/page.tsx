'use client';

import { CustomerForm } from '@/features/users/components/customer-form';
import { useI18n } from '@/lib/i18n';

export default function NewCustomerPage() {
    const { t } = useI18n();

    return (
        <div className="space-y-6 pb-12">
            {/* Form (includes its own title + action buttons) */}
            <CustomerForm
                title={t('customer.create.title')}
                subtitle={t('customer.create.subtitle')}
            />
        </div>
    );
}
