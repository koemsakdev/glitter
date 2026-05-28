'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProductForm } from '@/features/products/components/product-form';
import { useI18n } from '@/lib/i18n';

export default function NewProductPage() {
    const { t } = useI18n();

    return (
        <div className="space-y-6 pb-12">
            {/* Backlink */}
            <div className="flex items-center gap-2">
                <Button
                    variant="secondary"
                    size="sm"
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground"
                    render={
                        <Link href="/dashboard/products">
                            <ArrowLeft className="mr-1 size-4" />
                            {t('product.detail.backToList')}
                        </Link>
                    }
                />
            </div>

            {/* Form (includes its own title + action buttons) */}
            <ProductForm
                product={null}
                title={t('product.create.title')}
                subtitle={t('product.create.subtitle')}
            />
        </div>
    );
}