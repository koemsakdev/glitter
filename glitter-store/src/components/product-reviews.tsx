'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { pick, tr, type Lang } from '@/lib/locale';
import type { Review, ReviewSummary } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

function Stars({ value, size = 16 }: { value: number; size?: number }) {
    return (
        <span className="inline-flex">
            {Array.from({ length: 5 }, (_, i) => (
                <svg
                    key={i}
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill={value >= i + 1 ? '#f59e0b' : '#e4e4e7'}
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </span>
    );
}

export function ProductReviews({
    productId,
    lang,
    reviews,
    summary,
}: {
    productId: string;
    lang: Lang;
    reviews: Review[];
    summary: ReviewSummary;
}) {
    const { user, authFetch } = useAuth();
    const [name, setName] = useState('');
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const isKm = lang === 'km';

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!user && !name.trim())
            return setError(tr(lang, 'reviewNameRequired'));
        if (rating < 1) return setError(tr(lang, 'reviewRatingRequired'));
        setSubmitting(true);
        try {
            const localized = isKm
                ? {
                      titleKm: title.trim() || undefined,
                      commentKm: comment.trim() || undefined,
                  }
                : {
                      titleEn: title.trim() || undefined,
                      commentEn: comment.trim() || undefined,
                  };
            // Logged-in customers post to the authenticated endpoint so the
            // review is linked to their account + marked "verified" if bought.
            const res = user
                ? await authFetch('/api/account/reviews', {
                      method: 'POST',
                      body: JSON.stringify({ productId, rating, ...localized }),
                  })
                : await fetch(`${API_URL}/api/reviews`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          productId,
                          reviewerName: name.trim(),
                          rating,
                          ...localized,
                      }),
                  });
            if (!res.ok) throw new Error('failed');
            setDone(true);
        } catch {
            setError(tr(lang, 'reviewSubmitFailed'));
        } finally {
            setSubmitting(false);
        }
    }

    const fieldClass =
        'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-(--brand) focus:ring-2 focus:ring-(--brand)/20';

    return (
        <section className="mt-12 border-t border-zinc-200 dark:border-zinc-700 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {tr(lang, 'reviews')}
                </h2>
                {summary.count > 0 && (
                    <span className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                        <Stars value={summary.average} />
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {summary.average.toFixed(1)}
                        </span>
                        <span>
                            · {summary.count} {tr(lang, 'ratings')}
                        </span>
                    </span>
                )}
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-2">
                {/* Review list */}
                <div className="space-y-4">
                    {reviews.length === 0 ? (
                        <p className="text-sm text-zinc-400">
                            {tr(lang, 'noReviews')}
                        </p>
                    ) : (
                        reviews.map((r) => {
                            const rTitle = pick(
                                lang,
                                r.titleEn ?? '',
                                r.titleKm ?? '',
                            );
                            const rComment = pick(
                                lang,
                                r.commentEn ?? '',
                                r.commentKm ?? '',
                            );
                            return (
                                <div
                                    key={r.id}
                                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                {r.reviewerName}
                                            </span>
                                            {r.verifiedPurchase && (
                                                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                                                    {tr(lang, 'verifiedBuyer')}
                                                </span>
                                            )}
                                        </div>
                                        <Stars value={r.rating} size={14} />
                                    </div>
                                    {rTitle && (
                                        <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {rTitle}
                                        </p>
                                    )}
                                    {rComment && (
                                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                            {rComment}
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Submit form */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 p-5">
                    {done ? (
                        <p className="py-8 text-center text-sm text-emerald-600">
                            {tr(lang, 'reviewThanks')}
                        </p>
                    ) : (
                        <form onSubmit={submit} className="space-y-4">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {tr(lang, 'writeReview')}
                            </h3>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                    {tr(lang, 'yourRating')}
                                </label>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setRating(n)}
                                            onMouseEnter={() => setHover(n)}
                                            onMouseLeave={() => setHover(0)}
                                            className="transition-transform hover:scale-110"
                                            aria-label={`${n}`}
                                        >
                                            <svg
                                                width={26}
                                                height={26}
                                                viewBox="0 0 24 24"
                                                fill={
                                                    (hover || rating) >= n
                                                        ? '#f59e0b'
                                                        : '#e4e4e7'
                                                }
                                            >
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {user ? (
                                <p className="rounded-lg bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                                    {tr(lang, 'reviewingAs')}{' '}
                                    <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                        {user.fullName}
                                    </span>
                                </p>
                            ) : (
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                        {tr(lang, 'yourName')}
                                    </label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={fieldClass}
                                        maxLength={120}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                    {tr(lang, 'reviewTitleField')}
                                </label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={fieldClass}
                                    maxLength={200}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                    {tr(lang, 'reviewComment')}
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={4}
                                    className={fieldClass}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full rounded-lg bg-(--brand) px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                            >
                                {tr(lang, 'submitReview')}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
