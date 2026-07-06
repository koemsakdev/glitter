'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    BadgeCheck,
    Check,
    ChevronsUpDown,
    ImagePlus,
    LogIn,
    Star,
    ThumbsUp,
    X,
} from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ImageLightbox } from '@/components/image-lightbox';
import { pick, tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';
import type { Review, ReviewSummary } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const LIKED_KEY = 'glitter_review_likes';

function Stars({ value, size = 16 }: { value: number; size?: number }) {
    return (
        <span className="inline-flex">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    style={{ width: size, height: size }}
                    className={
                        i < Math.round(value)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700'
                    }
                />
            ))}
        </span>
    );
}

function timeAgo(iso: string, lang: Lang): string {
    const d = new Date(iso).getTime();
    const days = Math.floor((Date.now() - d) / 86_400_000);
    if (days < 1) return lang === 'km' ? 'ថ្ងៃនេះ' : 'Today';
    if (days < 30)
        return lang === 'km' ? `${days} ថ្ងៃមុន` : `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12)
        return lang === 'km' ? `${months} ខែមុន` : `${months}mo ago`;
    const years = Math.floor(months / 12);
    return lang === 'km' ? `${years} ឆ្នាំមុន` : `${years}y ago`;
}

type SortKey = 'newest' | 'top' | 'helpful';

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

    // ---- local list state (so likes + new submissions reflect instantly) ----
    const [list, setList] = useState<Review[]>(reviews);
    const [sort, setSort] = useState<SortKey>('newest');
    const [sortOpen, setSortOpen] = useState(false);
    const sortOptions: { key: SortKey; label: string }[] = [
        { key: 'newest', label: tr(lang, 'newest') },
        { key: 'top', label: tr(lang, 'topRated') },
        { key: 'helpful', label: tr(lang, 'mostHelpful') },
    ];
    const sortLabel =
        sortOptions.find((o) => o.key === sort)?.label ?? sortOptions[0].label;
    const [lightbox, setLightbox] = useState<{
        imgs: { src: string; alt: string }[];
        index: number;
    } | null>(null);
    // Which reviews this browser has marked helpful. Read from localStorage
    // only after mount so the first render matches the server (avoids a
    // hydration mismatch on the Helpful button).
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        try {
            setLikedIds(
                new Set(
                    JSON.parse(
                        localStorage.getItem(LIKED_KEY) ?? '[]',
                    ) as string[],
                ),
            );
        } catch {
            // ignore malformed storage
        }
    }, []);

    // Keep the list in sync with the server prop, so a review approved in the
    // dashboard (delivered via the live refresh) appears without a reload.
    useEffect(() => {
        setList(reviews);
    }, [reviews]);

    // ---- form state ----
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    // Picked files are kept in memory with a local preview; they're only
    // uploaded to the server when the review is actually submitted.
    const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const isKm = lang === 'km';

    // Rating distribution (5★ … 1★) from the loaded reviews.
    const dist = useMemo(() => {
        const counts = [0, 0, 0, 0, 0];
        for (const r of list) {
            const i = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
            counts[i] += 1;
        }
        return counts; // index 0 = 1★ … index 4 = 5★
    }, [list]);

    const sorted = useMemo(() => {
        const arr = [...list];
        if (sort === 'top') arr.sort((a, b) => b.rating - a.rating);
        else if (sort === 'helpful')
            arr.sort((a, b) => b.helpfulCount - a.helpfulCount);
        else
            arr.sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            );
        return arr;
    }, [list, sort]);

    const average = summary.count > 0 ? summary.average : 0;
    const total = Math.max(summary.count, list.length);

    // ---- helpful / like (toggle) ----
    async function toggleHelpful(id: string) {
        const isLiked = likedIds.has(id);
        const next = new Set(likedIds);
        if (isLiked) next.delete(id);
        else next.add(id);
        setLikedIds(next);
        try {
            localStorage.setItem(LIKED_KEY, JSON.stringify([...next]));
        } catch {
            // ignore storage errors
        }
        setList((prev) =>
            prev.map((r) =>
                r.id === id
                    ? {
                          ...r,
                          helpfulCount: Math.max(
                              0,
                              r.helpfulCount + (isLiked ? -1 : 1),
                          ),
                      }
                    : r,
            ),
        );
        try {
            await fetch(
                `${API_URL}/api/reviews/${id}/${isLiked ? 'unhelpful' : 'helpful'}`,
                { method: 'POST' },
            );
        } catch {
            // optimistic — ignore network errors
        }
    }

    // ---- photo upload ----
    // Just stage the picked files locally (with a preview) — no network yet.
    function onPickPhotos(files: FileList | null) {
        if (!files) return;
        setError('');
        const slots = Math.max(0, 5 - photos.length);
        const next = Array.from(files)
            .slice(0, slots)
            .map((file) => ({ file, preview: URL.createObjectURL(file) }));
        if (next.length) setPhotos((prev) => [...prev, ...next]);
        if (fileRef.current) fileRef.current.value = '';
    }

    function removePhoto(i: number) {
        setPhotos((prev) => {
            const target = prev[i];
            if (target) URL.revokeObjectURL(target.preview);
            return prev.filter((_, x) => x !== i);
        });
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (rating < 1) return setError(tr(lang, 'reviewRatingRequired'));
        setSubmitting(true);
        try {
            // Upload the photos only now, on submit, so nothing is stored on
            // the server unless the customer actually posts the review.
            const imageUrls: string[] = [];
            for (const p of photos) {
                const fd = new FormData();
                fd.append('image', p.file);
                const up = await authFetch('/api/account/reviews/upload', {
                    method: 'POST',
                    body: fd,
                });
                if (!up.ok) throw new Error('upload failed');
                const data = (await up.json()) as { url: string };
                imageUrls.push(data.url);
            }

            const body = {
                productId,
                rating,
                imageUrls,
                ...(isKm
                    ? { commentKm: comment.trim() || undefined }
                    : { commentEn: comment.trim() || undefined }),
            };
            const res = await authFetch('/api/account/reviews', {
                method: 'POST',
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('failed');
            photos.forEach((p) => URL.revokeObjectURL(p.preview));
            setDone(true);
            setShowForm(false);
        } catch {
            setError(tr(lang, 'reviewSubmitFailed'));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
            <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                <span className="h-5 w-1 rounded-full bg-(--brand)" />
                {tr(lang, 'reviews')}
            </h2>

            {/* Summary card */}
            <div className="mt-5 grid gap-6 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm sm:grid-cols-[auto_1fr] sm:gap-10 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-50">
                        {average.toFixed(1)}
                    </div>
                    <div className="mt-1">
                        <Stars value={average} size={18} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {total} {tr(lang, 'ratings')}
                    </p>
                </div>
                <div className="flex flex-col justify-center gap-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const c = dist[star - 1];
                        const pct = total ? (c / total) * 100 : 0;
                        return (
                            <div key={star} className="flex items-center gap-2">
                                <span className="flex w-10 shrink-0 items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    {star}
                                    <Star className="size-3 fill-amber-400 text-amber-400" />
                                </span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                    <div
                                        className="h-full rounded-full bg-amber-400"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="w-7 shrink-0 text-right text-xs tabular-nums text-zinc-400">
                                    {c}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {tr(lang, 'sortBy')}:
                    </span>
                    <Popover open={sortOpen} onOpenChange={setSortOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-9 cursor-pointer justify-between gap-2 rounded-lg font-medium"
                            >
                                {sortLabel}
                                <ChevronsUpDown className="size-4 text-zinc-400" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-48 p-0">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        {sortOptions.map((o) => (
                                            <CommandItem
                                                key={o.key}
                                                value={o.label}
                                                className="cursor-pointer"
                                                onSelect={() => {
                                                    setSort(o.key);
                                                    setSortOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        'size-4 text-(--brand)',
                                                        sort === o.key
                                                            ? 'opacity-100'
                                                            : 'opacity-0',
                                                    )}
                                                />
                                                {o.label}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {!done &&
                    (user ? (
                        <button
                            type="button"
                            onClick={() => setShowForm((v) => !v)}
                            className="inline-flex items-center gap-2 rounded-full bg-(--brand) px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                        >
                            <Star className="size-4" />
                            {tr(lang, 'writeReview')}
                        </button>
                    ) : (
                        <Link
                            href="/account/login"
                            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700 dark:text-zinc-200"
                        >
                            <LogIn className="size-4" />
                            {tr(lang, 'writeReview')}
                        </Link>
                    ))}
            </div>

            {done && (
                <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {tr(lang, 'reviewThanks')}
                </p>
            )}

            {/* Form — only when the customer chooses to write one */}
            {showForm && user && !done && (
                <form
                    onSubmit={submit}
                    className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'writeReview')}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            aria-label={tr(lang, 'cancel')}
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    {/* Rating */}
                    <div className="mt-3 flex gap-1">
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
                                <Star
                                    className={cn(
                                        'size-7',
                                        (hover || rating) >= n
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700',
                                    )}
                                />
                            </button>
                        ))}
                    </div>

                    {/* Comment */}
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        placeholder={tr(lang, 'reviewPlaceholder')}
                        className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-(--brand) focus:ring-2 focus:ring-(--brand)/20 dark:border-zinc-700 dark:bg-zinc-900"
                    />

                    {/* Photos */}
                    <div className="mt-3 flex flex-wrap gap-2.5">
                        {photos.map((p, i) => (
                            <div
                                key={i}
                                className="relative size-16 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={p.preview}
                                    alt=""
                                    className="size-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => removePhoto(i)}
                                    className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                                    aria-label="remove"
                                >
                                    <X className="size-3" />
                                </button>
                            </div>
                        ))}
                        {photos.length < 5 && (
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="flex size-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700"
                            >
                                <ImagePlus className="size-5" />
                                <span className="text-[9px] font-medium">
                                    {tr(lang, 'addPhotos')}
                                </span>
                            </button>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={(e) => onPickPhotos(e.target.files)}
                        />
                    </div>

                    {error && (
                        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="mt-4 w-full rounded-full bg-(--brand) px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-8"
                    >
                        {submitting ? '…' : tr(lang, 'submitReview')}
                    </button>
                </form>
            )}

            {/* Review list */}
            <div className="mt-6 space-y-4">
                {sorted.length === 0 ? (
                    <p className="text-sm text-zinc-400">
                        {tr(lang, 'noReviews')}
                    </p>
                ) : (
                    sorted.map((r) => {
                        const rComment = pick(
                            lang,
                            r.commentEn ?? '',
                            r.commentKm ?? '',
                        );
                        const imgs = (r.imageUrls ?? [])
                            .map((u) => ({ src: fileUrl(u) ?? '', alt: '' }))
                            .filter((x) => x.src);
                        const avatar = fileUrl(r.reviewerImageUrl);
                        const liked = likedIds.has(r.id);
                        return (
                            <div
                                key={r.id}
                                className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="relative shrink-0">
                                            {avatar ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={avatar}
                                                    alt={r.reviewerName}
                                                    className="size-9 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
                                                />
                                            ) : (
                                                <span className="flex size-9 items-center justify-center rounded-full bg-(--brand)/10 text-sm font-bold text-(--brand)">
                                                    {r.reviewerName
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                            )}
                                            {r.verifiedPurchase && (
                                                <BadgeCheck className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-white fill-[#1877f2] text-white dark:bg-zinc-900" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                    {r.reviewerName}
                                                </span>
                                                {r.verifiedPurchase && (
                                                    <BadgeCheck
                                                        className="size-4 fill-[#1877f2] text-white"
                                                        aria-label={tr(
                                                            lang,
                                                            'verifiedBuyer',
                                                        )}
                                                    />
                                                )}
                                            </div>
                                            <Stars value={r.rating} size={13} />
                                        </div>
                                    </div>
                                    <span className="shrink-0 text-xs text-zinc-400">
                                        {timeAgo(r.createdAt, lang)}
                                    </span>
                                </div>

                                {rComment && (
                                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                        {rComment}
                                    </p>
                                )}

                                {imgs.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {imgs.map((im, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() =>
                                                    setLightbox({
                                                        imgs,
                                                        index: i,
                                                    })
                                                }
                                                className="size-16 overflow-hidden rounded-lg border border-zinc-200 transition-transform hover:scale-105 dark:border-zinc-700"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={im.src}
                                                    alt=""
                                                    className="size-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={() => toggleHelpful(r.id)}
                                        aria-pressed={liked}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                            liked
                                                ? 'border-(--brand) bg-(--brand)/10 text-(--brand)'
                                                : 'border-zinc-200 text-zinc-500 hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700 dark:text-zinc-400',
                                        )}
                                    >
                                        <ThumbsUp
                                            className={cn(
                                                'size-3.5',
                                                liked && 'fill-current',
                                            )}
                                        />
                                        {tr(lang, 'helpful')}
                                        {r.helpfulCount > 0 &&
                                            ` (${r.helpfulCount})`}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <ImageLightbox
                images={lightbox?.imgs ?? []}
                initialIndex={lightbox ? lightbox.index : null}
                onClose={() => setLightbox(null)}
            />
        </section>
    );
}
