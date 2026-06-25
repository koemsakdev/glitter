'use client';

import { Check, EyeOff, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import {
    useDeleteReview,
    useReviews,
    useSetReviewStatus,
} from '@/features/reviews/use-reviews';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Review, ReviewStatus } from '@/types/review';

const STATUS_TABS: { value: ReviewStatus | 'all'; key: TranslationKey }[] = [
    { value: 'all', key: 'reviews.status.all' },
    { value: 'pending', key: 'reviews.status.pending' },
    { value: 'approved', key: 'reviews.status.approved' },
    { value: 'hidden', key: 'reviews.status.hidden' },
];
const STATUS_LABEL: Record<ReviewStatus, TranslationKey> = {
    pending: 'reviews.status.pending',
    approved: 'reviews.status.approved',
    hidden: 'reviews.status.hidden',
};
const STATUS_STYLE: Record<ReviewStatus, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    approved:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    hidden: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300',
};

function Stars({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={cn(
                        'size-3.5',
                        n <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-300',
                    )}
                />
            ))}
        </div>
    );
}

export default function ReviewsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const [tab, setTab] = useState<ReviewStatus | 'all'>('all');
    const { data, isLoading } = useReviews(tab === 'all' ? undefined : tab);
    const setStatus = useSetReviewStatus();
    const del = useDeleteReview();
    const [deleting, setDeleting] = useState<Review | null>(null);

    const reviews = data?.data ?? [];

    function onError(error: unknown) {
        toast({
            title: t('common.toast.error'),
            description: getErrorMessage(error),
            variant: 'destructive',
        });
    }

    function changeStatus(id: string, status: ReviewStatus) {
        setStatus.mutate({ id, status }, { onError });
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {t('reviews.title')}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('reviews.subtitle')}
                </p>
            </div>

            <div className="flex flex-wrap gap-1.5 rounded-xl border border-input bg-muted/40 p-1.5 dark:bg-input/20">
                {STATUS_TABS.map((s) => (
                    <button
                        key={s.value}
                        type="button"
                        onClick={() => setTab(s.value)}
                        className={cn(
                            'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                            tab === s.value
                                ? 'bg-pink-500 text-white shadow-sm dark:bg-pink-600'
                                : 'text-muted-foreground hover:bg-background hover:text-foreground',
                        )}
                    >
                        {t(s.key)}
                    </button>
                ))}
            </div>

            {reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('reviews.empty')}
                    </p>
                </div>
            ) : (
                <div className="stagger space-y-3">
                    {reviews.map((r) => (
                        <div
                            key={r.id}
                            className="rounded-xl border bg-card p-4"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <Link
                                        href={`/dashboard/products/${r.productId}`}
                                        className="text-sm font-semibold hover:text-pink-600 dark:hover:text-pink-300"
                                    >
                                        {r.productNameEn ?? '—'}
                                    </Link>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <Stars rating={r.rating} />
                                        <span className="text-xs text-muted-foreground">
                                            {t('reviews.by')} {r.reviewerName}
                                        </span>
                                        {r.verifiedPurchase && (
                                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                {t('reviews.verified')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                                        STATUS_STYLE[r.status],
                                    )}
                                >
                                    {t(STATUS_LABEL[r.status])}
                                </span>
                            </div>

                            {(r.titleEn || r.titleKm) && (
                                <p className="mt-3 text-sm font-medium">
                                    {r.titleEn || r.titleKm}
                                </p>
                            )}
                            {(r.commentEn || r.commentKm) && (
                                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                                    {r.commentEn || r.commentKm}
                                </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                                {r.status !== 'approved' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                                        disabled={setStatus.isPending}
                                        onClick={() =>
                                            changeStatus(r.id, 'approved')
                                        }
                                    >
                                        <Check className="size-4" />
                                        {t('reviews.approve')}
                                    </Button>
                                )}
                                {r.status !== 'hidden' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={setStatus.isPending}
                                        onClick={() =>
                                            changeStatus(r.id, 'hidden')
                                        }
                                    >
                                        <EyeOff className="size-4" />
                                        {t('reviews.hide')}
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setDeleting(r)}
                                >
                                    <Trash2 className="size-4" />
                                    {t('common.delete')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => {
                    if (!o) setDeleting(null);
                }}
                title={t('reviews.deleteTitle')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting?.reviewerName ?? '',
                )}
                confirmLabel={t('settings.confirmDelete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                isPending={del.isPending}
                onConfirm={() => {
                    if (deleting)
                        del.mutate(deleting.id, {
                            onSuccess: () => setDeleting(null),
                            onError,
                        });
                }}
            />
        </div>
    );
}
