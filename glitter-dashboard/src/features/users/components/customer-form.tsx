'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Mail, Phone, Trash2, UserRound } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SavingOverlay } from '@/components/feedback/saving-overlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { addressApi } from '@/features/addresses/address-api';
import {
    CustomerAddressesField,
    addressToDraft,
    type AddressDraft,
} from '@/features/users/components/customer-addresses-field';
import {
    useCreateUser,
    useRemoveUserAvatar,
    useUpdateUser,
    useUploadUserAvatar,
} from '@/features/users/use-users';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { useToast } from '@/hooks/use-toast';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import type { Address } from '@/types/address';
import {
    ACCOUNT_STATUSES,
    type AccountStatus,
    type User,
} from '@/types/user';

const STATUS_LABELS: Record<AccountStatus, TranslationKey> = {
    active: 'user.status.active',
    suspended: 'user.status.suspended',
    deleted: 'user.status.deleted',
};

const inputClass =
    'h-11 shadow-none focus-visible:outline-none focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

/** Strip spaces / dashes / parens so the Cambodian phone regex matches. */
function normalizePhone(p: string): string {
    return p.replace(/[\s().-]/g, '');
}

interface CustomerFormProps {
    /** Existing customer (edit mode). Omit for create. */
    customer?: User | null;
    /** The customer's saved delivery addresses (edit mode). */
    addresses?: Address[];
    /** Page title shown in the form header. */
    title: string;
    subtitle?: string;
}

export function CustomerForm({
    customer,
    addresses,
    title,
    subtitle,
}: CustomerFormProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const router = useRouter();
    const queryClient = useQueryClient();
    const fileRef = useRef<HTMLInputElement>(null);
    const isEdit = Boolean(customer);

    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const uploadAvatar = useUploadUserAvatar();
    const removeAvatar = useRemoveUserAvatar();

    const [submitting, setSubmitting] = useState(false);

    // Avatar — staged; applied on submit.
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [removeFlag, setRemoveFlag] = useState(false);

    // Details
    const [fullName, setFullName] = useState(customer?.fullName ?? '');
    const [email, setEmail] = useState(customer?.email ?? '');
    const [phone, setPhone] = useState(customer?.phoneNumber ?? '');
    const [accountStatus, setAccountStatus] = useState<AccountStatus>(
        customer?.accountStatus ?? 'active',
    );

    // Addresses — many, managed locally and synced on submit.
    const [addressDrafts, setAddressDrafts] = useState<AddressDraft[]>(
        () => addresses?.map(addressToDraft) ?? [],
    );
    const [originalIds] = useState<string[]>(
        () => addresses?.map((a) => a.id) ?? [],
    );

    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    const currentAvatar = getFileUrl(customer?.profileImageUrl);
    const shownAvatar = avatarPreview ?? (removeFlag ? null : currentAvatar);
    const initials = fullName
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setRemoveFlag(false);
    }

    function clearAvatar() {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(null);
        setAvatarPreview(null);
        setRemoveFlag(Boolean(customer?.profileImageUrl));
    }

    function fail(key: TranslationKey) {
        toast({
            title: t('common.toast.error'),
            description: t(key),
            variant: 'destructive',
        });
    }

    async function persistAvatar(id: string) {
        if (avatarFile) {
            await uploadAvatar.mutateAsync({ id, file: avatarFile });
        } else if (removeFlag) {
            await removeAvatar.mutateAsync(id);
        }
    }

    async function persistAddresses(id: string) {
        // Create new / update existing.
        for (const d of addressDrafts) {
            const payload = {
                userId: id,
                label: d.label.trim() || undefined,
                recipientName: d.recipientName.trim() || fullName.trim(),
                recipientPhone: normalizePhone(
                    d.recipientPhone.trim() || phone.trim(),
                ),
                streetAddress: d.addressText.trim().slice(0, 500),
                province: d.city.trim() || undefined,
                landmark: d.note.trim() || undefined,
                latitude: Number(d.lat.toFixed(6)),
                longitude: Number(d.lng.toFixed(6)),
                addressType: 'shipping' as const,
                isDefaultShipping: d.isDefault,
                isDefaultBilling: false,
            };
            if (d.id) {
                await addressApi.update(d.id, payload);
            } else {
                await addressApi.create(payload);
            }
        }
        // Delete the ones the user removed.
        const keptIds = new Set(
            addressDrafts.map((d) => d.id).filter(Boolean) as string[],
        );
        for (const oldId of originalIds) {
            if (!keptIds.has(oldId)) {
                await addressApi.remove(oldId);
            }
        }
    }

    async function handleSubmit() {
        if (!fullName.trim()) {
            fail('user.validation.nameRequired');
            return;
        }
        // Every address needs a contact phone (its own or the customer's).
        const missingPhone = addressDrafts.some(
            (d) => !(d.recipientPhone.trim() || phone.trim()),
        );
        if (missingPhone) {
            fail('address.validation.recipientPhone');
            return;
        }

        setSubmitting(true);
        try {
            let id: string;
            const accountPhone = normalizePhone(phone.trim()) || undefined;
            if (isEdit && customer) {
                await updateUser.mutateAsync({
                    id: customer.id,
                    payload: {
                        fullName: fullName.trim(),
                        email: email.trim() || undefined,
                        phoneNumber: accountPhone,
                        accountStatus,
                    },
                });
                id = customer.id;
            } else {
                const created = await createUser.mutateAsync({
                    fullName: fullName.trim(),
                    email: email.trim() || undefined,
                    phoneNumber: accountPhone,
                    role: 'customer',
                    accountStatus,
                });
                id = created.id;
            }

            try {
                await persistAvatar(id);
            } catch {
                toast({
                    title: t('customer.create.avatarFailed'),
                    variant: 'destructive',
                });
            }
            try {
                await persistAddresses(id);
            } catch (e) {
                toast({
                    title: t('customer.create.addressFailed'),
                    description: getErrorMessage(e),
                    variant: 'destructive',
                });
            }

            // The address writes went through addressApi directly, so refresh
            // the cached lists before navigating to the detail page.
            await queryClient.invalidateQueries({ queryKey: ['addresses'] });
            await queryClient.invalidateQueries({ queryKey: ['users'] });

            toast({
                title: isEdit
                    ? t('user.edit.success')
                    : t('user.create.success'),
                variant: 'success',
            });
            router.push(`/dashboard/customers/${id}`);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
            setSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
            }}
            className="space-y-6"
        >
            <SavingOverlay open={submitting} label={t('common.saving')} />

            {/* Header — matches the product form: title + actions, no back button */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className="flex gap-2 sm:shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => router.back()}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {submitting && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        {isEdit
                            ? t('user.edit.submit')
                            : t('customer.create.submit')}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
                {/* Left: photo + details */}
                <div className="space-y-6 lg:col-span-2">
                    <Section title={t('profile.title')}>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={pickAvatar}
                        />
                        <div className="flex flex-col items-center gap-3 py-2">
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="group relative size-28 rounded-full outline-none"
                                aria-label={t('profile.avatar.change')}
                            >
                                <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-pink-100 to-pink-50 text-3xl font-bold text-pink-600 shadow-lg shadow-pink-500/10 ring-4 ring-white transition group-hover:ring-pink-200 dark:from-pink-500/20 dark:to-pink-500/5 dark:text-pink-300 dark:ring-zinc-900 dark:group-hover:ring-pink-500/30">
                                    {shownAvatar ? (
                                        <Image
                                            src={shownAvatar}
                                            alt={fullName || 'avatar'}
                                            width={112}
                                            height={112}
                                            className="size-full object-cover"
                                            unoptimized
                                        />
                                    ) : initials ? (
                                        initials
                                    ) : (
                                        <UserRound className="size-10" />
                                    )}
                                </span>
                                {/* Hover overlay */}
                                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition group-hover:opacity-100">
                                    <Camera className="size-6 text-white" />
                                </span>
                                {/* Camera badge */}
                                <span className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full bg-pink-500 text-white shadow-md ring-2 ring-white transition group-hover:bg-pink-600 dark:ring-zinc-900">
                                    <Camera className="size-4" />
                                </span>
                            </button>

                            {shownAvatar && (
                                <button
                                    type="button"
                                    onClick={clearAvatar}
                                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                                >
                                    <Trash2 className="size-3.5" />
                                    {t('profile.avatar.remove')}
                                </button>
                            )}
                            <p className="max-w-[16rem] text-center text-xs text-muted-foreground">
                                {t('customer.create.photoHint')}
                            </p>
                        </div>
                    </Section>

                    <Section title={t('user.detail.information')}>
                        <div className="space-y-4">
                            <Field label={t('user.field.fullName')}>
                                <IconInput icon={<UserRound className="size-4" />}>
                                    <Input
                                        value={fullName}
                                        onChange={(e) =>
                                            setFullName(e.target.value)
                                        }
                                        placeholder="Sok Dara"
                                        className={`${inputClass} pl-10`}
                                    />
                                </IconInput>
                            </Field>
                            <Field label={t('user.field.email')}>
                                <IconInput icon={<Mail className="size-4" />}>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        placeholder="name@example.com"
                                        className={`${inputClass} pl-10`}
                                    />
                                </IconInput>
                            </Field>
                            <Field label={t('user.field.phone')}>
                                <IconInput icon={<Phone className="size-4" />}>
                                    <Input
                                        value={phone}
                                        onChange={(e) =>
                                            setPhone(e.target.value)
                                        }
                                        placeholder="+85512345678"
                                        className={`${inputClass} pl-10`}
                                    />
                                </IconInput>
                            </Field>
                            <Field label={t('user.field.status')}>
                                <Select
                                    value={accountStatus}
                                    onValueChange={(v) =>
                                        v && setAccountStatus(v as AccountStatus)
                                    }
                                >
                                    <SelectTrigger className="h-11 w-full">
                                        <SelectValue>
                                            {(v: string) =>
                                                t(
                                                    STATUS_LABELS[
                                                        v as AccountStatus
                                                    ],
                                                )
                                            }
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ACCOUNT_STATUSES.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {t(STATUS_LABELS[s])}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </Section>
                </div>

                {/* Right: delivery addresses (many) */}
                <div className="lg:col-span-3">
                    <Section
                        title={t('address.section.title')}
                        description={t('customer.create.addressOptional')}
                    >
                        <CustomerAddressesField
                            value={addressDrafts}
                            onChange={setAddressDrafts}
                            fallbackName={fullName.trim() || undefined}
                            fallbackPhone={phone.trim() || undefined}
                        />
                    </Section>
                </div>
            </div>
        </form>
    );
}

/** Matches the product form's FormSection for a consistent look across pages. */
function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border bg-card">
            <div className="border-b px-6 py-4">
                <h2 className="text-base font-semibold">{title}</h2>
                {description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            {children}
        </div>
    );
}

/** Wraps an input with a leading icon. */
function IconInput({
    icon,
    children,
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {icon}
            </span>
            {children}
        </div>
    );
}
