'use client';

import {
    ArrowLeft,
    Clock,
    Edit,
    ExternalLink,
    Mail,
    MapPin,
    Navigation,
    Phone,
    Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DetailField,
    DetailSection,
} from '@/components/feedback/detail-section';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { BranchStatusBadge } from './branch-status-badge';
import { DeleteBranchDialog } from './delete-branch-dialog';
import { useBranch } from '@/features/branches/use-branches';
import { useI18n } from '@/lib/i18n';
import { googleMapsDirectionsUrl, googleMapsViewUrl } from '@/lib/map-links';
import type { Branch } from '@/types/branch';
import { BranchInventorySection } from '@/features/inventory-branch/components/branch-inventory-section';

const MapPreview = dynamic(
    () => import('@/components/ui/map-preview').then((m) => m.MapPreview),
    { ssr: false },
);

interface BranchDetailViewProps {
    id: string;
}

function formatDate(date: string | Date | undefined | null): string {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(d);
}

export function BranchDetailView({ id }: BranchDetailViewProps) {
    const { t, language } = useI18n();
    const { data: branch, isLoading, isError, refetch } = useBranch(id);
    const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

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

    const primaryName =
        language === 'km' ? branch.branchNameKm : branch.branchNameEn;
    const secondaryName =
        language === 'km' ? branch.branchNameEn : branch.branchNameKm;
    const showSecondary =
        secondaryName.trim() !== '' &&
        secondaryName.trim().toLowerCase() !== primaryName.trim().toLowerCase();

    return (
        <div className="space-y-6">
            {/* Hero */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            {primaryName}
                        </h1>
                        <BranchStatusBadge status={branch.branchStatus} />
                    </div>

                    {showSecondary && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {secondaryName}
                        </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-block whitespace-nowrap rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {branch.branchCode}
            </span>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
                            {branch.city}
            </span>
                    </div>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                    <Button
                        variant="outline"
                        nativeButton={false}
                        className="text-muted-foreground hover:text-foreground"
                        render={
                            <Link href="/dashboard/branches">
                                <ArrowLeft className="mr-2 size-4" />
                                {t('common.back')}
                            </Link>
                        }
                    />
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={
                            <Link href={`/dashboard/branches/${branch.id}/edit`}>
                                <Edit className="mr-2 size-4" />
                                {t('branch.action.edit')}
                            </Link>
                        }
                    />
                    <Button
                        variant="outline"
                        onClick={() => setDeletingBranch(branch)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                        <Trash2 className="mr-2 size-4" />
                        {t('branch.action.delete')}
                    </Button>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {/* Map + location */}
                    <DetailSection
                        title={t('branch.detail.location')}
                        action={
                            <Button
                                size="sm"
                                variant="outline"
                                nativeButton={false}
                                render={
                                    <a
                                        href={googleMapsDirectionsUrl(
                                            branch.latitude,
                                            branch.longitude,
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Navigation className="mr-1.5 size-3.5" />
                                        {t('branch.detail.getDirections')}
                                    </a>
                                }
                            />
                        }
                    >
                        <div className="relative">
                            <MapPreview
                                latitude={branch.latitude}
                                longitude={branch.longitude}
                                height={320}
                                label={primaryName}
                                address={`${branch.streetAddress}, ${branch.city}`}
                            />
                            {/* Jump to the real Google Maps — sits above the map */}
                            <a
                                href={googleMapsViewUrl(
                                    branch.latitude,
                                    branch.longitude,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/60 backdrop-blur transition-colors hover:text-pink-600 dark:hover:text-pink-300"
                            >
                                <ExternalLink className="size-3.5 text-pink-600 dark:text-pink-300" />
                                {t('branch.detail.openInMaps')}
                            </a>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="inline-flex items-start gap-2 text-sm">
                                <MapPin className="mt-0.5 size-4 shrink-0 text-pink-600 dark:text-pink-300" />
                                <span>
                                    {branch.streetAddress}
                                    <span className="text-muted-foreground">
                                        {' · '}
                                        {branch.city}
                                    </span>
                                </span>
                            </p>
                            <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                {branch.latitude.toFixed(6)},{' '}
                                {branch.longitude.toFixed(6)}
                            </span>
                        </div>
                    </DetailSection>
                </div>

                {/* Single consolidated info card — balances the tall map card */}
                <DetailSection title={t('branch.detail.information')}>
                    <div className="space-y-4">
                        {/* Contact */}
                        <DetailField label={t('branch.field.phone')}>
                            <span className="inline-flex items-center gap-2">
                                <Phone className="size-3.5 text-muted-foreground" />
                                <a
                                    href={`tel:${branch.phoneNumber}`}
                                    className="font-mono hover:text-pink-600 dark:hover:text-pink-300"
                                >
                                    {branch.phoneNumber}
                                </a>
                            </span>
                        </DetailField>
                        <DetailField label={t('branch.field.email')}>
                            <span className="inline-flex items-center gap-2">
                                <Mail className="size-3.5 text-muted-foreground" />
                                <a
                                    href={`mailto:${branch.email}`}
                                    className="truncate hover:text-pink-600 dark:hover:text-pink-300"
                                >
                                    {branch.email}
                                </a>
                            </span>
                        </DetailField>

                        {branch.openingHours && (
                            <DetailField label={t('branch.detail.openingHours')}>
                                <span className="inline-flex items-start gap-2">
                                    <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                                    <span className="whitespace-pre-wrap">
                                        {branch.openingHours}
                                    </span>
                                </span>
                            </DetailField>
                        )}

                        {/* Metadata — separated by a divider */}
                        <div className="space-y-4 border-t border-border/60 pt-4">
                            <DetailField label={t('branch.detail.created')}>
                                {formatDate(branch.createdAt)}
                            </DetailField>
                            <DetailField label={t('branch.detail.updated')}>
                                {formatDate(branch.updatedAt)}
                            </DetailField>
                        </div>
                    </div>
                </DetailSection>
            </div>

            {/* Full-width inventory section */}
            <BranchInventorySection branchId={branch.id} />

            <DeleteBranchDialog
                branch={deletingBranch}
                redirectTo="/dashboard/branches"
                onClose={() => setDeletingBranch(null)}
            />
        </div>
    );
}