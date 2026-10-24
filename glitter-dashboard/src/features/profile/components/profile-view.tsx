'use client';

import { format } from 'date-fns';
import {
    CalendarDays,
    ArrowLeft,
    AtSign,
    Camera,
    ChevronRight,
    Clock,
    KeyRound,
    Loader2,
    Mail,
    Phone,
    Save,
    Store,
    Trash2,
    Upload,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SafeImage as Image } from '@/components/ui/safe-image';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SavingOverlay } from '@/components/feedback/saving-overlay';
import {
    UserRoleBadge,
    UserStatusBadge,
} from '@/features/users/components/user-badges';
import {
    useRemoveAvatar,
    useUpdateProfile,
    useUploadAvatar,
} from '@/features/profile/use-profile';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';

const inputClass =
    'h-11 rounded-xl shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-700';

export function ProfileView() {
    const { t, language } = useI18n();
    const router = useRouter();
    const { toast } = useToast();
    const user = useAuthStore((s) => s.user);
    const fileRef = useRef<HTMLInputElement>(null);

    const updateProfile = useUpdateProfile();
    const uploadAvatar = useUploadAvatar();
    const removeAvatar = useRemoveAvatar();

    const [fullName, setFullName] = useState(user?.fullName ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');

    // Avatar is STAGED locally and only persisted when the user clicks Save.
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [removeFlag, setRemoveFlag] = useState(false);

    // Clean up the object URL we create for the preview.
    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    if (!user) return null;

    const currentAvatar = getFileUrl(user.profileImageUrl);
    // What to show: staged preview → removal (initials) → current saved avatar.
    const shownAvatar = avatarPreview ?? (removeFlag ? null : currentAvatar);
    const initials =
        user.fullName
            ?.split(' ')
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'U';

    const saving =
        updateProfile.isPending ||
        uploadAvatar.isPending ||
        removeAvatar.isPending;

    function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setRemoveFlag(false);
    }

    function handleAvatarRemove() {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(null);
        setAvatarPreview(null);
        // Only flag a removal if there is a saved avatar to remove.
        setRemoveFlag(Boolean(user!.profileImageUrl));
    }

    async function handleSave() {
        if (!fullName.trim()) {
            toast({
                title: t('common.toast.error'),
                description: t('user.validation.nameRequired'),
                variant: 'destructive',
            });
            return;
        }

        try {
            // 1) Persist the avatar change first (if any), so the profile
            //    update response reflects the final image.
            if (avatarFile) {
                await uploadAvatar.mutateAsync({
                    id: user!.id,
                    file: avatarFile,
                });
            } else if (removeFlag) {
                await removeAvatar.mutateAsync(user!.id);
            }

            // 2) Persist the text fields.
            await updateProfile.mutateAsync({
                id: user!.id,
                payload: {
                    fullName: fullName.trim(),
                    email: email.trim() || undefined,
                    phoneNumber: phoneNumber.trim() || undefined,
                },
            });

            // Reset staged avatar state — the store now holds the saved data.
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            setAvatarFile(null);
            setAvatarPreview(null);
            setRemoveFlag(false);

            toast({ title: t('profile.save.success'), variant: 'success' });
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    const dirty =
        fullName.trim() !== (user.fullName ?? '') ||
        email.trim() !== (user.email ?? '') ||
        phoneNumber.trim() !== (user.phoneNumber ?? '') ||
        Boolean(avatarFile) ||
        removeFlag;
    const branchName = user.branch
        ? language === 'km'
            ? user.branch.branchNameKm
            : user.branch.branchNameEn
        : null;

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
            }}
            className="space-y-6"
        >
            <SavingOverlay open={saving} label={t('common.saving')} />
            <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarPick}
            />

            {/* Header — same pattern as other pages: title left, action right */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('profile.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        {t('profile.subtitle')}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    className="sm:shrink-0"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="size-4" />
                    {t('common.back')}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* ── Left: who you are + security ── */}
                <div className="space-y-6">
                    <section className="rounded-xl border bg-card p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="relative">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => fileRef.current?.click()}
                                    aria-label={t('profile.avatar.change')}
                                    className="flex size-28 items-center justify-center overflow-hidden rounded-full bg-muted text-3xl font-semibold text-foreground/70 ring-1 ring-border transition-opacity hover:opacity-90"
                                >
                                    {shownAvatar ? (
                                        <Image
                                            src={shownAvatar}
                                            alt={user.fullName}
                                            fallback={initials}
                                            width={112}
                                            height={112}
                                            className="size-full object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        initials
                                    )}
                                </button>
                                <span className="pointer-events-none absolute bottom-0.5 right-0.5 flex size-8 items-center justify-center rounded-full border bg-card shadow-sm">
                                    <Camera className="size-4" />
                                </span>
                            </div>
                            <p className="mt-4 text-lg font-semibold">
                                {user.fullName}
                            </p>
                            {user.username && (
                                <p className="font-mono text-sm text-muted-foreground">
                                    @{user.username}
                                </p>
                            )}
                            <div className="mt-3 flex flex-wrap justify-center gap-2">
                                <UserRoleBadge role={user.role} />
                                <UserStatusBadge status={user.accountStatus} />
                            </div>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={saving}
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <Upload className="size-3.5" />
                                    {shownAvatar
                                        ? t('profile.avatar.change')
                                        : t('user.form.uploadPhoto')}
                                </Button>
                                {shownAvatar && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={saving}
                                        onClick={handleAvatarRemove}
                                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 className="size-3.5" />
                                        {t('profile.avatar.remove')}
                                    </Button>
                                )}
                            </div>
                            {(avatarFile || removeFlag) && (
                                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                    {t('profile.avatar.pending')}
                                </p>
                            )}
                        </div>

                        <dl className="mt-6 space-y-3 border-t pt-5 text-sm">
                            {branchName && (
                                <SummaryRow
                                    icon={Store}
                                    label={t('user.field.branch')}
                                >
                                    {branchName}
                                </SummaryRow>
                            )}
                            <SummaryRow
                                icon={CalendarDays}
                                label={t('user.col.joined')}
                            >
                                {format(new Date(user.createdAt), 'PP')}
                            </SummaryRow>
                            <SummaryRow
                                icon={Clock}
                                label={t('user.detail.updated')}
                            >
                                {format(new Date(user.updatedAt), 'PP')}
                            </SummaryRow>
                        </dl>
                    </section>

                    <section className="rounded-xl border bg-card p-6">
                        <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <KeyRound className="size-4" />
                            </span>
                            <div className="min-w-0">
                                <h2 className="text-base font-semibold">
                                    {t('profile.section.security')}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {t('profile.section.securityHint')}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="mt-4 w-full"
                            nativeButton={false}
                            render={<Link href="/dashboard/change-password" />}
                        >
                            {t('changePassword.title')}
                            <ChevronRight className="size-4" />
                        </Button>
                    </section>
                </div>

                {/* ── Right: personal information ── */}
                <section className="rounded-xl border bg-card lg:col-span-2 lg:self-start">
                    <header className="border-b px-6 py-4">
                        <h2 className="text-base font-semibold">
                            {t('profile.section.personal')}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {t('profile.section.personalHint')}
                        </p>
                    </header>
                    <div className="space-y-5 p-6">
                        <Field label={t('user.field.fullName')}>
                            <IconInput icon={UserRound}>
                                <Input
                                    value={fullName}
                                    onChange={(e) =>
                                        setFullName(e.target.value)
                                    }
                                    className={`${inputClass} pl-10`}
                                />
                            </IconInput>
                        </Field>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label={t('user.field.email')}>
                                <IconInput icon={Mail}>
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
                                <IconInput icon={Phone}>
                                    <Input
                                        value={phoneNumber}
                                        onChange={(e) =>
                                            setPhoneNumber(e.target.value)
                                        }
                                        placeholder="012 345 678"
                                        className={`${inputClass} pl-10`}
                                    />
                                </IconInput>
                            </Field>
                        </div>
                        {user.username && (
                            <Field label={t('user.field.username')}>
                                <IconInput icon={AtSign}>
                                    <Input
                                        value={user.username}
                                        readOnly
                                        disabled
                                        className={`${inputClass} pl-10 font-mono`}
                                    />
                                </IconInput>
                                <p className="text-xs text-muted-foreground">
                                    {t('profile.usernameHint')}
                                </p>
                            </Field>
                        )}
                    </div>
                    <footer className="flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <span
                            className={`text-xs ${
                                dirty
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-muted-foreground'
                            }`}
                        >
                            {dirty
                                ? t('profile.unsaved')
                                : t('profile.allSaved')}
                        </span>
                        <Button
                            type="submit"
                            disabled={saving || !dirty}
                            className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                        >
                            {saving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Save className="size-4" />
                            )}
                            {t('profile.save.submit')}
                        </Button>
                    </footer>
                </section>
            </div>
        </form>
    );
}

/** Small label/value row in the profile summary card. */
function SummaryRow({
    icon: Icon,
    label,
    children,
}: {
    icon: LucideIcon;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="ml-auto truncate font-medium">{children}</dd>
        </div>
    );
}

/** Input wrapper with a leading icon. */
function IconInput({
    icon: Icon,
    children,
}: {
    icon: LucideIcon;
    children: React.ReactNode;
}) {
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            {children}
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
