'use client';

import { ProductForm } from '@/features/products/components/product-form';
import { useI18n } from '@/lib/i18n';

export default function NewProductPage() {
    const { t } = useI18n();

    return (
        <div className="space-y-6 pb-12">
            {/* Form (includes its own title + action buttons) */}
            <ProductForm
                product={null}
                title={t('product.create.title')}
                subtitle={t('product.create.subtitle')}
            />
        </div>
    );
}