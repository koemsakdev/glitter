'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    ArrowLeft,
    Clock,
    ExternalLink,
    Hash,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Store,
    type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { SavingOverlay } from '@/components/feedback/saving-overlay';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    useCreateBranch,
    useUpdateBranch,
} from '@/features/branches/use-branches';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { googleMapsViewUrl } from '@/lib/map-links';
import { cn } from '@/lib/utils';
import type { Branch, BranchFormValues, BranchStatus } from '@/types/branch';

// Map widget is client-only (Leaflet doesn't SSR)
const MapPicker = dynamic(
    () => import('@/components/ui/map-picker').then((m) => m.MapPicker),
    { ssr: false, loading: () => <MapSkeleton /> },
);

const inputClass =
    'h-11 rounded-xl shadow-none focus-visible:border-pink-500 focus-visible:ring-0 dark:focus-visible:border-pink-700';

const schema = z.object({
    branchNameEn: z
        .string()
        .trim()
        .min(3, 'branch.validation.nameEnRequired')
        .max(100, 'branch.validation.nameTooLong'),
    branchNameKm: z
        .string()
        .trim()
        .min(3, 'branch.validation.nameKmRequired')
        .max(100, 'branch.validation.nameTooLong'),
    streetAddress: z
        .string()
        .trim()
        .min(1, 'branch.validation.addressRequired')
        .max(255, 'branch.validation.addressTooLong'),
    city: z
        .string()
        .trim()
        .min(1, 'branch.validation.cityRequired')
        .max(100, 'branch.validation.cityTooLong'),
    phoneNumber: z
        .string()
        .trim()
        .min(1, 'branch.validation.phoneRequired')
        .max(20, 'branch.validation.phoneTooLong'),
    email: z
        .string()
        .trim()
        .email('branch.validation.emailInvalid')
        .or(z.literal('')),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    branchStatus: z.enum(['active', 'inactive', 'closed']),
});

type FormValues = z.infer<typeof schema>;

/* ───────────── Opening hours: day chips + open/close time ───────────── */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface Hours {
    days: boolean[];
    open: string;
    close: string;
}

const DEFAULT_HOURS: Hours = {
    days: [true, true, true, true, true, true, true],
    open: '09:00',
    close: '20:00',
};

/** "Mon–Sun · 09:00–20:00", "Mon–Fri · …", "Mon, Wed, Fri · …" */
function formatHours(h: Hours): string {
    const on = DAYS.filter((_, i) => h.days[i]);
    if (on.length === 0) return '';
    // Group consecutive days into ranges.
    const parts: string[] = [];
    let start = -1;
    for (let i = 0; i <= 7; i++) {
        if (i < 7 && h.days[i]) {
            if (start < 0) start = i;
        } else if (start >= 0) {
            const end = i - 1;
            parts.push(
                end - start >= 2
                    ? `${DAYS[start]}–${DAYS[end]}`
                    : DAYS.slice(start, end + 1).join(', '),
            );
            start = -1;
        }
    }
    return `${parts.join(', ')} · ${h.open}–${h.close}`;
}

/** Reads text written by formatHours back into the picker (else defaults). */
function parseHours(text: string | null | undefined): Hours | null {
    const m = text?.match(/^(.+?)\s*·\s*(\d{2}:\d{2})–(\d{2}:\d{2})$/);
    if (!m) return null;
    const days = DAYS.map(() => false);
    for (const part of m[1].split(',').map((p) => p.trim())) {
        const [a, b] = part.split('–');
        const from = DAYS.indexOf(a as (typeof DAYS)[number]);
        const to = b ? DAYS.indexOf(b as (typeof DAYS)[number]) : from;
        if (from < 0 || to < 0) return null;
        for (let i = from; i <= to; i++) days[i] = true;
    }
    return { days, open: m[2], close: m[3] };
}

/** What the generated code will look like (the API assigns the number). */
function codePreview(city: string): string {
    const words = city
        .normalize('NFKD')
        .replace(/[^A-Za-z\s]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const initials =
        (words.length > 1
            ? words.map((w) => w[0]).join('')
            : (words[0] ?? 'BR').slice(0, 3)
        )
            .toUpperCase()
            .slice(0, 4) || 'BR';
    return `GS-${initials}-###`;
}

const STATUS: Record<
    BranchStatus,
    { key: TranslationKey; dot: string; chip: string }
> = {
    active: {
        key: 'branch.status.active',
        dot: 'bg-emerald-500',
        chip: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    },
    inactive: {
        key: 'branch.status.inactive',
        dot: 'bg-amber-500',
        chip: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    },
    closed: {
        key: 'branch.status.closed',
        dot: 'bg-zinc-400',
        chip: 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    },
};

/* ───────────── form ───────────── */

interface BranchFormProps {
    branch?: Branch | null;
    title: string;
    subtitle?: string;
}

export function BranchForm({ branch, title, subtitle }: BranchFormProps) {
    const { t } = useI18n();
    const router = useRouter();
    const { toast } = useToast();
    const isEdit = Boolean(branch);

    const createMutation = useCreateBranch();
    const updateMutation = useUpdateBranch();
    const isPending = createMutation.isPending || updateMutation.isPending;

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            branchNameEn: branch?.branchNameEn ?? '',
            branchNameKm: branch?.branchNameKm ?? '',
            streetAddress: branch?.streetAddress ?? '',
            city: branch?.city ?? '',
            phoneNumber: branch?.phoneNumber ?? '',
            email: branch?.email ?? '',
            latitude: branch?.latitude ?? 11.5564, // Phnom Penh
            longitude: branch?.longitude ?? 104.9282,
            branchStatus: branch?.branchStatus ?? 'active',
        },
    });

    const legacyHours =
        branch?.openingHours && !parseHours(branch.openingHours)
            ? branch.openingHours
            : null;
    const [hours, setHours] = useState<Hours>(
        () => parseHours(branch?.openingHours) ?? DEFAULT_HOURS,
    );
    const hoursText = formatHours(hours);

    const v = form.watch();

    function translateError(message: string | undefined): string {
        if (!message) return '';
        return message.startsWith('branch.validation.')
            ? t(message as TranslationKey)
            : message;
    }

    function handleMapChange(
        lat: number,
        lng: number,
        address?: string,
        city?: string,
    ) {
        form.setValue('latitude', Number(lat.toFixed(6)), {
            shouldDirty: true,
        });
        form.setValue('longitude', Number(lng.toFixed(6)), {
            shouldDirty: true,
        });
        if (address)
            form.setValue('streetAddress', address, {
                shouldValidate: true,
                shouldDirty: true,
            });
        if (city)
            form.setValue('city', city, {
                shouldValidate: true,
                shouldDirty: true,
            });
    }

    async function onSubmit(values: FormValues) {
        const payload = {
            ...values,
            email: values.email || null,
            openingHours: hoursText || null,
        } satisfies BranchFormValues;
        try {
            const saved = branch
                ? await updateMutation.mutateAsync({
                      id: branch.id,
                      values: payload,
                  })
                : await createMutation.mutateAsync(payload);
            toast({
                title: branch
                    ? t('branch.edit.success')
                    : t('branch.create.success'),
                description: saved.branchCode,
                variant: 'success',
            });
            router.push(`/dashboard/branches/${saved.id}`);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    const err = (name: keyof FormValues) => {
        const e = form.formState.errors[name];
        return e ? (
            <FieldError
                errors={[{ ...e, message: translateError(e.message) }]}
            />
        ) : null;
    };

    const status = STATUS[v.branchStatus];

    return (
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mx-auto max-w-6xl space-y-6"
        >
            <SavingOverlay open={isPending} />

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        {t('nav.branches')}
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className="flex gap-2 sm:shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => router.back()}
                        disabled={isPending}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="rounded-full bg-pink-500 px-5 text-white hover:bg-pink-600 dark:bg-pink-700 dark:hover:bg-pink-800"
                    >
                        {isPending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        {isEdit
                            ? t('branch.edit.submit')
                            : t('branch.create.submit')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                {/* ── Main column ── */}
                <div className="space-y-6">
                    {/* 1. Name */}
                    <Section
                        icon={Store}
                        title={t('branch.form.name')}
                        description={t('branch.form.nameDescription')}
                    >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                data-invalid={
                                    !!form.formState.errors.branchNameEn
                                }
                            >
                                <FieldLabel htmlFor="branch-name-en">
                                    {t('branch.field.nameEn')}
                                </FieldLabel>
                                <Input
                                    id="branch-name-en"
                                    {...form.register('branchNameEn')}
                                    placeholder="Glitter Shop Toul Tom Pong"
                                    className={inputClass}
                                />
                                {err('branchNameEn')}
                            </Field>
                            <Field
                                data-invalid={
                                    !!form.formState.errors.branchNameKm
                                }
                            >
                                <FieldLabel htmlFor="branch-name-km">
                                    {t('branch.field.nameKm')}
                                </FieldLabel>
                                <Input
                                    id="branch-name-km"
                                    {...form.register('branchNameKm')}
                                    placeholder="ហ្គ្លីតធើសប ទួលទំពូង"
                                    className={inputClass}
                                />
                                {err('branchNameKm')}
                            </Field>
                        </div>
                    </Section>

                    {/* 2. Location */}
                    <Section
                        icon={MapPin}
                        title={t('branch.form.location')}
                        description={t('branch.form.locationHelp')}
                    >
                        <div className="space-y-4">
                            <div className="overflow-hidden rounded-xl border">
                                <MapPicker
                                    latitude={v.latitude}
                                    longitude={v.longitude}
                                    onChange={handleMapChange}
                                    height={340}
                                    searchPlaceholder={t(
                                        'branch.form.searchPlace',
                                    )}
                                    searchNoResultsText={t(
                                        'branch.form.searchNoResults',
                                    )}
                                />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5 font-mono">
                                    <MapPin className="size-3.5" />
                                    {v.latitude.toFixed(5)},{' '}
                                    {v.longitude.toFixed(5)}
                                </span>
                                <a
                                    href={googleMapsViewUrl(
                                        v.latitude,
                                        v.longitude,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 font-medium text-pink-600 hover:underline dark:text-pink-300"
                                >
                                    <ExternalLink className="size-3.5" />
                                    {t('branch.detail.openInMaps')}
                                </a>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                                <Field
                                    data-invalid={
                                        !!form.formState.errors.streetAddress
                                    }
                                >
                                    <FieldLabel htmlFor="branch-street">
                                        {t('branch.field.streetAddress')}
                                    </FieldLabel>
                                    <Input
                                        id="branch-street"
                                        {...form.register('streetAddress')}
                                        placeholder={t(
                                            'branch.form.streetPlaceholder',
                                        )}
                                        className={inputClass}
                                    />
                                    {err('streetAddress')}
                                </Field>
                                <Field
                                    data-invalid={!!form.formState.errors.city}
                                >
                                    <FieldLabel htmlFor="branch-city">
                                        {t('branch.field.city')}
                                    </FieldLabel>
                                    <Input
                                        id="branch-city"
                                        {...form.register('city')}
                                        placeholder="Phnom Penh"
                                        className={inputClass}
                                    />
                                    {err('city')}
                                </Field>
                            </div>
                        </div>
                    </Section>

                    {/* 3. Contact & hours */}
                    <Section
                        icon={Phone}
                        title={t('branch.form.contactHours')}
                        description={t('branch.form.contactHoursDescription')}
                    >
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    data-invalid={
                                        !!form.formState.errors.phoneNumber
                                    }
                                >
                                    <FieldLabel htmlFor="branch-phone">
                                        {t('branch.field.phone')}
                                    </FieldLabel>
                                    <Input
                                        id="branch-phone"
                                        type="tel"
                                        inputMode="tel"
                                        {...form.register('phoneNumber')}
                                        placeholder="012 345 678"
                                        className={inputClass}
                                    />
                                    {err('phoneNumber')}
                                </Field>
                                <Field
                                    data-invalid={!!form.formState.errors.email}
                                >
                                    <FieldLabel htmlFor="branch-email">
                                        {t('branch.field.email')}{' '}
                                        <span className="font-normal text-muted-foreground">
                                            ({t('common.optional')})
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        id="branch-email"
                                        type="email"
                                        {...form.register('email')}
                                        placeholder="branch@glitter.shop"
                                        className={inputClass}
                                    />
                                    {err('email')}
                                </Field>
                            </div>

                            <div className="space-y-3">
                                <FieldLabel>
                                    {t('branch.field.openingHours')}
                                </FieldLabel>
                                <div className="flex flex-wrap gap-1.5">
                                    {DAYS.map((d, i) => (
                                        <button
                                            key={d}
                                            type="button"
                                            aria-pressed={hours.days[i]}
                                            onClick={() =>
                                                setHours((h) => ({
                                                    ...h,
                                                    days: h.days.map((x, j) =>
                                                        j === i ? !x : x,
                                                    ),
                                                }))
                                            }
                                            className={cn(
                                                'h-9 min-w-12 rounded-full border px-3 text-sm font-medium transition-colors',
                                                hours.days[i]
                                                    ? 'border-pink-400 bg-pink-500 text-white dark:border-pink-700 dark:bg-pink-700'
                                                    : 'bg-card text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {t(
                                                `branch.day.${d.toLowerCase()}` as TranslationKey,
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        type="time"
                                        aria-label={t('branch.form.opens')}
                                        value={hours.open}
                                        onChange={(e) =>
                                            setHours((h) => ({
                                                ...h,
                                                open: e.target.value,
                                            }))
                                        }
                                        className={cn(inputClass, 'w-36')}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {t('branch.form.to')}
                                    </span>
                                    <Input
                                        type="time"
                                        aria-label={t('branch.form.closes')}
                                        value={hours.close}
                                        onChange={(e) =>
                                            setHours((h) => ({
                                                ...h,
                                                close: e.target.value,
                                            }))
                                        }
                                        className={cn(inputClass, 'w-36')}
                                    />
                                </div>
                                {legacyHours && (
                                    <p className="text-xs text-muted-foreground">
                                        {t('branch.form.previousHours')}:{' '}
                                        <span className="font-medium">
                                            {legacyHours}
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </Section>
                </div>

                {/* ── Sidebar: live preview + status ── */}
                <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                    <div className="overflow-hidden rounded-2xl border bg-card">
                        <div className="relative h-24 bg-linear-to-br from-pink-400 to-rose-500 dark:from-pink-700 dark:to-rose-800">
                            <span className="absolute -bottom-6 left-5 flex size-12 items-center justify-center rounded-2xl border-4 border-card bg-white text-pink-600 shadow-sm dark:bg-zinc-900 dark:text-pink-300">
                                <Store className="size-5" />
                            </span>
                            <span
                                className={cn(
                                    'absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                                    status.chip,
                                )}
                            >
                                <span
                                    className={cn(
                                        'size-1.5 rounded-full',
                                        status.dot,
                                    )}
                                />
                                {t(status.key)}
                            </span>
                        </div>
                        <div className="space-y-4 p-5 pt-9">
                            <div>
                                <p className="truncate text-base font-semibold">
                                    {v.branchNameEn ||
                                        t('branch.form.previewName')}
                                </p>
                                {v.branchNameKm && (
                                    <p className="truncate text-sm text-muted-foreground">
                                        {v.branchNameKm}
                                    </p>
                                )}
                            </div>
                            <ul className="space-y-2.5 text-sm">
                                <PreviewRow icon={Hash}>
                                    <span className="font-mono">
                                        {branch?.branchCode ??
                                            codePreview(v.city)}
                                    </span>
                                    {!isEdit && (
                                        <span className="block text-xs text-muted-foreground">
                                            {t('branch.form.codeAuto')}
                                        </span>
                                    )}
                                </PreviewRow>
                                {(v.streetAddress || v.city) && (
                                    <PreviewRow icon={MapPin}>
                                        {[v.streetAddress, v.city]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </PreviewRow>
                                )}
                                {v.phoneNumber && (
                                    <PreviewRow icon={Phone}>
                                        {v.phoneNumber}
                                    </PreviewRow>
                                )}
                                {v.email && (
                                    <PreviewRow icon={Mail}>
                                        {v.email}
                                    </PreviewRow>
                                )}
                                <PreviewRow icon={Clock}>
                                    {hoursText || t('branch.form.noHours')}
                                </PreviewRow>
                            </ul>
                        </div>
                    </div>

                    {/* Status only when editing — new branches start active. */}
                    {isEdit && (
                        <div className="rounded-2xl border bg-card p-5">
                            <p className="mb-3 text-sm font-semibold">
                                {t('branch.field.status')}
                            </p>
                            <Controller
                                name="branchStatus"
                                control={form.control}
                                render={({ field }) => (
                                    <div className="grid gap-2">
                                        {(
                                            Object.keys(
                                                STATUS,
                                            ) as BranchStatus[]
                                        ).map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() =>
                                                    field.onChange(s)
                                                }
                                                aria-pressed={field.value === s}
                                                className={cn(
                                                    'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                                                    field.value === s
                                                        ? STATUS[s].chip
                                                        : 'hover:bg-muted/60',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'size-2 rounded-full',
                                                        STATUS[s].dot,
                                                    )}
                                                />
                                                {t(STATUS[s].key)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            />
                        </div>
                    )}
                </aside>
            </div>
        </form>
    );
}

function Section({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border bg-card">
            <header className="flex items-start gap-3 border-b px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-300">
                    <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-base font-semibold">{title}</h2>
                    {description && (
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
            </header>
            <div className="p-5">{children}</div>
        </section>
    );
}

function PreviewRow({
    icon: Icon,
    children,
}: {
    icon: LucideIcon;
    children: ReactNode;
}) {
    return (
        <li className="flex gap-2.5">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 break-words">{children}</div>
        </li>
    );
}

function MapSkeleton() {
    return (
        <div className="flex h-85 w-full items-center justify-center bg-muted/40">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
    );
}
