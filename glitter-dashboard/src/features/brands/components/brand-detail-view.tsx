'use client';

import {format} from 'date-fns';
import {
    ArrowLeft,
    Edit,
    ExternalLink,
    ImageIcon,
    Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {DetailField, DetailSection} from '@/components/feedback/detail-section';
import {LoadingScreen} from '@/components/feedback/loading-screen';
import {ErrorState} from '@/components/feedback/error-state';
import {BrandFormDialog} from '@/features/brands/components/brand-form-dialog';
import {DeleteBrandDialog} from '@/features/brands/components/delete-brand-dialog';
import {useDeleteBrandModal} from '@/features/brands/hooks/use-delete-brand-modal';
import {useModifyBrandModal} from '@/features/brands/hooks/use-modify-brand-modal';
import {useBrand} from '@/features/brands/use-brands';
import {getFileUrl} from '@/lib/file-url';
import {useI18n} from '@/lib/i18n';
import type {Brand} from '@/types/brand';
import {useState} from 'react';

interface BrandDetailViewProps {
    id: string;
}

export function BrandDetailView({id}: BrandDetailViewProps) {
    const {t} = useI18n();
    const {data: brand, isLoading, isError, refetch} = useBrand(id);

    // Local state for which brand is being edited/deleted (cleared after modal closes)
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

    const modifyModal = useModifyBrandModal();
    const deleteModal = useDeleteBrandModal();

    if (isLoading) {
        return <LoadingScreen variant="page"/>;
    }

    if (isError || !brand) {
        return (
            <ErrorState
                title={t('brand.detail.errorTitle')}
                message={t('brand.detail.errorMessage')}
                onRetry={() => void refetch()}
            />
        );
    }

    const logoUrl = getFileUrl(brand.logoUrl);

    function handleEdit() {
        setEditingBrand(brand!);
        modifyModal.open();
    }

    function handleDelete() {
        setDeletingBrand(brand!);
        deleteModal.open();
    }

    return (
        <div className="space-y-6">
            {/* Back button + breadcrumb */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground"
                    render={
                        <Link href="/dashboard/brands">
                            <ArrowLeft className="mr-1 size-4" />
                            {t('brand.detail.backToList')}
                        </Link>
                    }
                />
            </div>

            {/* Hero — logo + name + status + actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <div
                        className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40 ring-1 ring-pink-200/30 dark:ring-pink-400/15">
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt={brand.name}
                                width={80}
                                height={80}
                                className="size-full object-contain p-2"
                                unoptimized
                            />
                        ) : (
                            <ImageIcon className="size-8 text-muted-foreground/40"/>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            {brand.name}
                        </h1>
                        <div className="mt-2 flex items-center gap-2">
                            <BrandStatusBadge status={brand.status}/>
                            <span className="text-sm text-muted-foreground">·</span>
                            <span className="text-sm text-muted-foreground">{brand.slug}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                    <Button variant="outline" onClick={handleEdit}>
                        <Edit className="mr-2 size-4"/>
                        {t('brand.action.edit')}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleDelete}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                        <Trash2 className="mr-2 size-4"/>
                        {t('brand.action.delete')}
                    </Button>
                </div>
            </div>

            {/* Information section */}
            <DetailSection
                title={t('brand.detail.information')}
                description={t('brand.detail.informationDescription')}
            >
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <DetailField label={t('brand.field.name')}>{brand.name}</DetailField>
                    <DetailField label={t('brand.field.slug')}>
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
              {brand.slug}
            </span>
                    </DetailField>
                    <DetailField label={t('brand.field.website')}>
                        {brand.websiteUrl ? (
                            <a
                                href={brand.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-pink-600 hover:underline dark:text-pink-300"
                            >
                                {brand.websiteUrl.replace(/^https?:\/\//, '')}
                                <ExternalLink className="size-3"/>
                            </a>
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </DetailField>
                    <DetailField label={t('brand.field.status')}>
                        <BrandStatusBadge status={brand.status}/>
                    </DetailField>
                </dl>
            </DetailSection>

            {/* Description section */}
            <DetailSection
                title={t('brand.detail.description')}
                description={t('brand.detail.descriptionHelp')}
            >
                {brand.description ? (
                    <p className="text-sm leading-relaxed text-foreground">
                        {brand.description}
                    </p>
                ) : (
                    <p className="text-sm italic text-muted-foreground">
                        {t('brand.detail.noDescription')}
                    </p>
                )}
            </DetailSection>

            {/* Metadata section */}
            <DetailSection title={t('brand.detail.metadata')}>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <DetailField label={t('brand.list.column.created')}>
                        {format(new Date(brand.createdAt), 'PPpp')}
                    </DetailField>
                    <DetailField label={t('brand.detail.updated')}>
                        {format(new Date(brand.updatedAt), 'PPpp')}
                    </DetailField>
                </dl>
            </DetailSection>

            {/* Edit / Delete dialogs */}
            <BrandFormDialog
                key={editingBrand?.id}
                brand={editingBrand}
                onClose={() => setEditingBrand(null)}
            />
            <DeleteBrandDialog
                brand={deletingBrand}
                onClose={() => setDeletingBrand(null)}
            />
        </div>
    );
}

/**
 * Status badge — pink for active, neutral for inactive.
 */
function BrandStatusBadge({status}: { status: 'active' | 'inactive' }) {
    const {t} = useI18n();

    if (status === 'active') {
        return (
            <Badge
                className="bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:hover:bg-pink-500/15">
                <span className="mr-1 inline-block size-1.5 rounded-full bg-pink-500 dark:bg-pink-400"/>
                {t('brand.status.active')}
            </Badge>
        );
    }

    return (
        <Badge variant="secondary" className="text-muted-foreground">
            <span className="mr-1 inline-block size-1.5 rounded-full bg-muted-foreground"/>
            {t('brand.status.inactive')}
        </Badge>
    );
}