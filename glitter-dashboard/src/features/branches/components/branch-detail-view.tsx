'use client';

import {
    ArrowLeft,
    Clock,
    Edit,
    Mail,
    MapPin,
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
            {/* Backlink */}
            <div className="flex items-center gap-2">
                <Button
                    variant="secondary"
                    size="sm"
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground"
                    render={
                        <Link href="/dashboard/branches">
                            <ArrowLeft className="mr-1 size-4" />
                            {t('branch.detail.backToList')}
                        </Link>
                    }
                />
            </div>

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
                    {/* Map */}
                    <DetailSection title={t('branch.detail.location')}>
                        <MapPreview
                            latitude={branch.latitude}
                            longitude={branch.longitude}
                            height={320}
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-mono">
                {branch.latitude.toFixed(6)}, {branch.longitude.toFixed(6)}
              </span>
                        </p>
                    </DetailSection>

                    {/* Address */}
                    <DetailSection title={t('branch.detail.address')}>
                        <div className="space-y-3">
                            <DetailField label={t('branch.field.streetAddress')}>
                <span className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 text-muted-foreground" />
                    {branch.streetAddress}
                </span>
                            </DetailField>
                            <DetailField label={t('branch.field.city')}>
                                {branch.city}
                            </DetailField>
                        </div>
                    </DetailSection>
                </div>

                <div className="space-y-6">
                    {/* Contact */}
                    <DetailSection title={t('branch.detail.contact')}>
                        <div className="space-y-3">
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
                            className="hover:text-pink-600 dark:hover:text-pink-300"
                          >
                            {branch.email}
                          </a>
                        </span>
                    </DetailField>
                </div>
            </DetailSection>

            {/* Opening hours */}
            {branch.openingHours && (
                <DetailSection title={t('branch.detail.openingHours')}>
                    <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <p className="whitespace-pre-wrap text-sm">
                            {branch.openingHours}
                        </p>
                    </div>
                </DetailSection>
            )}

            {/* Metadata */}
            <DetailSection title={t('branch.detail.metadata')}>
                <div className="space-y-3">
                    <DetailField label={t('branch.detail.created')}>
                        {formatDate(branch.createdAt)}
                    </DetailField>
                    <DetailField label={t('branch.detail.updated')}>
                        {formatDate(branch.updatedAt)}
                    </DetailField>
                </div>
            </DetailSection>
        </div>
    </div>

            {/* NEW — Full-width inventory section */}
            <BranchInventorySection branchId={branch.id} />

    <DeleteBranchDialog
        branch={deletingBranch}
        redirectTo="/dashboard/branches"
        onClose={() => setDeletingBranch(null)}
    />
</div>
);
}