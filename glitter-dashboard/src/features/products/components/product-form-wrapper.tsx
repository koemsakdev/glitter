'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { ProductForm } from '@/features/products/components/product-form';
import { useProduct } from '@/features/products/use-products';
import { useI18n } from '@/lib/i18n';

interface ProductFormWrapperProps {
    id: string;
}

export function ProductFormWrapper({ id }: ProductFormWrapperProps) {
    const { t, language } = useI18n();
    const { data: product, isLoading, isError, refetch } = useProduct(id);

    if (isLoading) {
        return <LoadingScreen variant="page" />;
    }

    if (isError || !product) {
        return (
            <ErrorState
                title={t('product.detail.errorTitle')}
                message={t('product.detail.errorMessage')}
                onRetry={() => void refetch()}
            />
        );
    }

    const displayName = language === 'km' ? product.nameKm : product.nameEn;

    return (
        <div className="space-y-6 pb-12">
            {/* Back link */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground"
                    render={
                        <Link href={`/dashboard/products/${id}`}>
                            <ArrowLeft className="mr-1 size-4" />
                            {t('product.detail.backToDetail')}
                        </Link>
                    }
                />
            </div>

            {/* Form (includes its own title + action buttons) */}
            <ProductForm
                product={product}
                title={t('product.edit.title')}
                subtitle={displayName}
            />
        </div>
    );
}