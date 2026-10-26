'use client';

import {
    Camera,
    Check,
    ChevronDown,
    Copy,
    CircleAlert,
    CircleCheck,
    Eye,
    EyeOff,
    Loader2,
    KeyRound,
    Mail,
    Phone,
    RotateCcw,
    ShieldCheck,
    Store,
    Trash2,
    Upload,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import { RoleOptionCards } from '@/features/users/components/role-access';
import {
    USERNAME_PATTERN,
    useUsernameCheck,
} from '@/features/users/use-username-check';
import { SafeImage as Image } from '@/components/ui/safe-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import {
    isStrongPassword,
    PasswordStrength,
} from '@/components/ui/password-strength';
import { useToast } from '@/hooks/use-toast';
import { useActiveBranches } from '@/features/branches/use-branches';
import {
    useCreateUser,
    useRemoveUserAvatar,
    useSetUserPassword,
    useUpdateUser,
    useUploadUserAvatar,
} from '@/features/users/use-users';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { DEFAULT_STAFF_PASSWORD } from '@/lib/default-password';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';
import {
    ACCOUNT_STATUSES,
    BRANCH_ROLES,
    type AccountStatus,
    type User,
    type UserFormValues,
    type UserRole,
} from '@/types/user';

const STATUS_LABELS: Record<AccountStatus, TranslationKey> = {
    active: 'user.status.active',
    suspended: 'user.status.suspended',
    deleted: 'user.status.deleted',
};

const inputClass =
    'h-11 rounded-xl shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-700';

interface UserFormProps {
    user?: User | null;
    /** 'customer' hides role/branch; 'staff' offers staff roles + branch. */
    mode?: 'customer' | 'staff';
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function UserForm({
    user,
    mode = 'staff',
    onSuccess,
    onCancel,
}: UserFormProps) {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const currentUserId = useAuthStore((s) => s.user?.id);
    const isEdit = Boolean(user);
    const isCustomerMode = mode === 'customer';
    // You can't change your OWN role / status from the management form.
    const isSelf = isEdit && user?.id === currentUserId;

    const createUser = useCreateUser();
    const updateUser = useUpdateUser();
    const setUserPassword = useSetUserPassword();
    const uploadAvatar = useUploadUserAvatar();
    const removeAvatar = useRemoveUserAvatar();

    const { data: branches } = useActiveBranches();
    const fileRef = useRef<HTMLInputElement>(null);

    const [fullName, setFullName] = useState(user?.fullName ?? '');
    const [username, setUsername] = useState(user?.username ?? '');
    const usernameStatus = useUsernameCheck(username, {
        currentUsername: user?.username,
        excludeId: user?.id,
        enabled: !isCustomerMode,
    });
    // Saving progress shown inside the form (no full-screen blocker).
    const [saveStep, setSaveStep] = useState<
        'idle' | 'account' | 'password' | 'photo' | 'done'
    >('idle');
    const [email, setEmail] = useState(user?.email ?? '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
    const [role, setRole] = useState<UserRole>(
        user?.role ?? (isCustomerMode ? 'customer' : 'cashier'),
    );
    const [branchId, setBranchId] = useState(user?.branchId ?? '');
    const [accountStatus, setAccountStatus] = useState<AccountStatus>(
        user?.accountStatus ?? 'active',
    );
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Staff get a dashboard login password. On create they get the default
    // one (no typing needed) and must change it at first sign-in; when an
    // admin edits another staff member they can set/reset it (optional). Hidden
    // for your OWN account — use the Change Password page (needs your current
    // password) — and for customers (they sign in on the storefront).
    const canSetPassword = !isCustomerMode && !isSelf;
    const [copied, setCopied] = useState(false);

    // Avatar — staged; applied after the user is saved.
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [removeFlag, setRemoveFlag] = useState(false);

    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    // Managers and cashiers work at one branch; admins cover every branch.
    const needsBranch = !isCustomerMode && BRANCH_ROLES.includes(role);
    // Email/phone are optional for staff — tucked away unless already set.
    const [showContact, setShowContact] = useState(
        isCustomerMode || Boolean(user?.email || user?.phoneNumber),
    );

    const currentAvatar = getFileUrl(user?.profileImageUrl);
    const shownAvatar = avatarPreview ?? (removeFlag ? null : currentAvatar);
    const initials =
        fullName
            .split(' ')
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';

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
        setRemoveFlag(Boolean(user?.profileImageUrl));
    }

    const branchOptions: ComboboxOption[] = useMemo(
        () =>
            (branches ?? []).map((b) => ({
                value: b.id,
                label: language === 'km' ? b.branchNameKm : b.branchNameEn,
                secondary: b.branchCode,
            })),
        [branches, language],
    );

    async function handleSubmit() {
        if (!fullName.trim()) {
            toast({
                title: t('common.toast.error'),
                description: t('user.validation.nameRequired'),
                variant: 'destructive',
            });
            return;
        }

        // Staff sign in with username + password (no email needed). On
        // create the API sets the default password; on edit a new one is only
        // validated when the admin actually types it (blank = keep current).
        const cleanUsername = username.trim().toLowerCase();
        if (!isCustomerMode) {
            // The field already shows why inline; the toast is a nudge.
            const problem = !USERNAME_PATTERN.test(cleanUsername)
                ? t('user.validation.username')
                : usernameStatus === 'taken'
                  ? t('user.username.taken')
                  : usernameStatus === 'checking'
                    ? t('user.username.stillChecking')
                    : null;
            if (problem) {
                toast({
                    title: t('common.toast.error'),
                    description: problem,
                    variant: 'destructive',
                });
                return;
            }
        }
        if (needsBranch && !branchId) {
            toast({
                title: t('common.toast.error'),
                description: t('user.validation.branchRequired'),
                variant: 'destructive',
            });
            return;
        }
        const wantsPassword =
            canSetPassword && isEdit && password.trim().length > 0;
        if (wantsPassword) {
            if (!isStrongPassword(password.trim())) {
                toast({
                    title: t('common.toast.error'),
                    description: t('password.notStrong'),
                    variant: 'destructive',
                });
                return;
            }
        }

        const payload: UserFormValues = {
            fullName: fullName.trim(),
            username: isCustomerMode ? undefined : cleanUsername,
            email: email.trim() || undefined,
            phoneNumber: phoneNumber.trim() || undefined,
            role: isCustomerMode ? 'customer' : role,
            branchId: needsBranch ? branchId || undefined : undefined,
            accountStatus,
            // On create the API applies the default password. On edit a typed
            // one is applied separately via the reset endpoint (see below).
            password: undefined,
        };

        try {
            let id: string;
            setSaveStep('account');
            if (isEdit && user) {
                await updateUser.mutateAsync({ id: user.id, payload });
                id = user.id;
                // Editing another staff member: apply a new password if typed.
                if (canSetPassword && isStrongPassword(password.trim())) {
                    setSaveStep('password');
                    await setUserPassword.mutateAsync({
                        id,
                        password: password.trim(),
                    });
                }
            } else {
                const created = await createUser.mutateAsync(payload);
                id = created.id;
            }

            if (avatarFile || removeFlag) setSaveStep('photo');
            if (avatarFile) {
                await uploadAvatar.mutateAsync({ id, file: avatarFile });
            } else if (removeFlag) {
                await removeAvatar.mutateAsync(id);
            }

            // Brief "Saved ✓" on the button before the dialog closes.
            setSaveStep('done');
            await new Promise((r) => setTimeout(r, 650));

            toast({
                title: isEdit
                    ? t('user.edit.success')
                    : t('user.create.success'),
                variant: 'success',
            });
            onSuccess?.();
        } catch (error) {
            setSaveStep('idle');
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    const saving = saveStep !== 'idle';
    const stepLabel =
        saveStep === 'account'
            ? isEdit
                ? t('user.save.updating')
                : t('user.save.creating')
            : saveStep === 'password'
              ? t('user.save.password')
              : saveStep === 'photo'
                ? t('user.save.photo')
                : saveStep === 'done'
                  ? t('user.save.done')
                  : null;
    const usernameBlocked =
        !isCustomerMode &&
        (usernameStatus === 'invalid' ||
            usernameStatus === 'taken' ||
            usernameStatus === 'checking');

    const branchName = (() => {
        const b = branches?.find((x) => x.id === branchId);
        return b ? (language === 'km' ? b.branchNameKm : b.branchNameEn) : null;
    })();
    const roleKey: Record<UserRole, TranslationKey> = {
        admin: 'user.role.admin',
        manager: 'user.role.manager',
        cashier: 'user.role.cashier',
        customer: 'user.role.customer',
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
            }}
            className="flex flex-col"
        >
            {/* Thin progress bar along the top while saving */}
            <div
                aria-hidden
                className={`h-0.5 overflow-hidden bg-pink-100 transition-opacity dark:bg-pink-500/10 ${
                    saving ? 'opacity-100' : 'opacity-0'
                }`}
            >
                <div
                    className={`h-full bg-pink-500 transition-[width] duration-500 ease-out ${
                        saveStep === 'done'
                            ? 'w-full'
                            : saveStep === 'photo'
                              ? 'w-4/5'
                              : saveStep === 'password'
                                ? 'w-3/5'
                                : saveStep === 'account'
                                  ? 'w-2/5'
                                  : 'w-0'
                    }`}
                />
            </div>

            {/* ── Title ── */}
            <div className="px-6 pt-5">
                <p className="text-lg font-bold tracking-tight">
                    {isEdit ? t('user.edit.title') : t('user.create.title')}
                </p>
                <p className="text-sm text-muted-foreground">
                    {isEdit ? user?.fullName : t('user.form.createHint')}
                </p>
            </div>

            {/* ── Profile photo card with live preview ── */}
            <div className="mx-6 mt-5 flex items-center gap-4 rounded-2xl border bg-linear-to-br from-pink-50/80 to-transparent p-4 dark:from-pink-500/10">
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={pickAvatar}
                />
                <button
                    type="button"
                    disabled={saving}
                    onClick={() => fileRef.current?.click()}
                    aria-label={t('profile.avatar.change')}
                    className={`group relative flex size-20 shrink-0 items-center justify-center rounded-full transition-colors ${
                        shownAvatar || initials !== '?'
                            ? 'bg-pink-100 text-xl font-semibold text-pink-600 dark:bg-pink-500/20 dark:text-pink-200'
                            : 'border-2 border-dashed border-pink-300 bg-white text-pink-400 hover:border-pink-400 hover:bg-pink-50 dark:border-pink-700 dark:bg-zinc-900'
                    }`}
                >
                    <span className="flex size-full items-center justify-center overflow-hidden rounded-full">
                        {shownAvatar ? (
                            <Image
                                src={shownAvatar}
                                alt={fullName || 'avatar'}
                                fallback={
                                    initials !== '?' ? (
                                        initials
                                    ) : (
                                        <UserRound className="size-8" />
                                    )
                                }
                                width={80}
                                height={80}
                                className="size-full object-cover"
                                unoptimized
                            />
                        ) : initials !== '?' ? (
                            initials
                        ) : (
                            <UserRound className="size-8" />
                        )}
                    </span>
                    {/* Camera badge — makes it obvious the photo is clickable */}
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-background bg-pink-500 text-white shadow-sm transition-transform group-hover:scale-110">
                        <Camera className="size-3.5" />
                    </span>
                </button>

                <div className="min-w-0 flex-1 space-y-2">
                    <div className="min-w-0">
                        <p className="truncate text-base font-semibold leading-tight">
                            {fullName.trim() || t('user.form.namePreview')}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            {!isCustomerMode && username && (
                                <span className="font-mono">@{username}</span>
                            )}
                            <span className="rounded-full bg-pink-500/10 px-2 py-0.5 font-medium text-pink-700 dark:text-pink-300">
                                {t(roleKey[isCustomerMode ? 'customer' : role])}
                            </span>
                            {needsBranch && branchName && (
                                <span className="inline-flex items-center gap-1">
                                    <Store className="size-3" />
                                    {branchName}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={saving}
                            onClick={() => fileRef.current?.click()}
                            className="h-8 rounded-full bg-background"
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
                                onClick={clearAvatar}
                                className="h-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="size-3.5" />
                                {t('profile.avatar.remove')}
                            </Button>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                            {t('user.form.photoHint')}
                        </span>
                    </div>
                </div>
            </div>

            <fieldset
                disabled={saving}
                className={`space-y-6 px-6 pb-2 pt-6 transition-opacity ${
                    saving ? 'pointer-events-none opacity-60' : ''
                }`}
            >
                {/* ── Profile ── */}
                <FormSection
                    icon={UserRound}
                    title={t('user.form.section.profile')}
                >
                    <Field label={t('user.field.fullName')}>
                        <IconInput icon={UserRound}>
                            <Input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Koemsak Sovann"
                                className={`${inputClass} pl-10`}
                            />
                        </IconInput>
                    </Field>

                    {!isCustomerMode && (
                        <Field label={t('user.field.username')}>
                            <div className="relative">
                                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-mono text-sm text-muted-foreground">
                                    @
                                </span>
                                <Input
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(
                                            e.target.value
                                                .toLowerCase()
                                                .replace(/\s+/g, ''),
                                        )
                                    }
                                    placeholder="dara"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    aria-invalid={
                                        usernameStatus === 'invalid' ||
                                        usernameStatus === 'taken'
                                    }
                                    aria-describedby="username-status"
                                    className={`${inputClass} pl-8 pr-10 font-mono ${
                                        usernameStatus === 'available'
                                            ? 'border-emerald-500 focus-visible:border-emerald-500 dark:focus-visible:border-emerald-500'
                                            : ''
                                    }`}
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                                    {usernameStatus === 'checking' && (
                                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                    )}
                                    {usernameStatus === 'available' && (
                                        <CircleCheck className="size-4 text-emerald-500" />
                                    )}
                                    {(usernameStatus === 'invalid' ||
                                        usernameStatus === 'taken') && (
                                        <CircleAlert className="size-4 text-destructive" />
                                    )}
                                </span>
                            </div>
                            <p
                                id="username-status"
                                aria-live="polite"
                                className={`text-xs ${
                                    usernameStatus === 'available'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : usernameStatus === 'invalid' ||
                                            usernameStatus === 'taken'
                                          ? 'text-destructive'
                                          : 'text-muted-foreground'
                                }`}
                            >
                                {usernameStatus === 'invalid'
                                    ? usernameFormatError(username, t)
                                    : usernameStatus === 'taken'
                                      ? t('user.username.taken')
                                      : usernameStatus === 'available'
                                        ? t('user.username.available')
                                        : usernameStatus === 'checking'
                                          ? t('user.username.checking')
                                          : usernameStatus === 'error'
                                            ? t('user.username.checkFailed')
                                            : t('user.form.usernameHint')}
                            </p>
                        </Field>
                    )}
                </FormSection>

                {/* ── Sign-in ── */}
                {canSetPassword && (
                    <FormSection
                        icon={KeyRound}
                        title={t('user.form.section.signIn')}
                    >
                        {isEdit ? (
                            <Field label={t('user.field.setNewPassword')}>
                                <IconInput icon={KeyRound}>
                                    <Input
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder={
                                            isEdit
                                                ? t(
                                                      'user.field.setNewPassword.placeholder',
                                                  )
                                                : t(
                                                      'user.field.password.placeholder',
                                                  )
                                        }
                                        autoComplete="new-password"
                                        className={`${inputClass} pl-10 pr-11`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((v) => !v)
                                        }
                                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                                        tabIndex={-1}
                                        aria-label={
                                            showPassword ? 'Hide' : 'Show'
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff className="size-4" />
                                        ) : (
                                            <Eye className="size-4" />
                                        )}
                                    </button>
                                </IconInput>
                                {password && (
                                    <PasswordStrength password={password} />
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {t('user.form.resetPasswordHint')}{' '}
                                    {t('user.form.tempPasswordHint')}
                                </p>
                                <button
                                    type="button"
                                    disabled={setUserPassword.isPending}
                                    onClick={() =>
                                        user &&
                                        setUserPassword.mutate(
                                            { id: user.id },
                                            {
                                                onSuccess: () =>
                                                    toast({
                                                        title: t(
                                                            'common.toast.success',
                                                        ),
                                                        description: t(
                                                            'user.form.resetDone',
                                                        ),
                                                        variant: 'success',
                                                        important: true,
                                                    }),
                                                onError: (error) =>
                                                    toast({
                                                        title: t(
                                                            'common.toast.error',
                                                        ),
                                                        description:
                                                            getErrorMessage(
                                                                error,
                                                            ),
                                                        variant: 'destructive',
                                                    }),
                                            },
                                        )
                                    }
                                    className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-pink-600 hover:underline disabled:opacity-50 dark:text-pink-400"
                                >
                                    {setUserPassword.isPending ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <RotateCcw className="size-3.5" />
                                    )}
                                    {t('user.form.resetToDefault')} (
                                    <span className="font-mono">
                                        {DEFAULT_STAFF_PASSWORD}
                                    </span>
                                    )
                                </button>
                            </Field>
                        ) : (
                            <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-4">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300">
                                    <KeyRound className="size-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {t('user.form.defaultPassword')}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <code className="rounded-md bg-background px-2 py-1 font-mono text-sm font-semibold ring-1 ring-border">
                                            {DEFAULT_STAFF_PASSWORD}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void navigator.clipboard
                                                    ?.writeText(
                                                        DEFAULT_STAFF_PASSWORD,
                                                    )
                                                    .then(() => {
                                                        setCopied(true);
                                                        setTimeout(
                                                            () =>
                                                                setCopied(
                                                                    false,
                                                                ),
                                                            1500,
                                                        );
                                                    })
                                                    .catch(() => {});
                                            }}
                                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                            {copied ? (
                                                <Check className="size-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="size-3.5" />
                                            )}
                                            {copied
                                                ? t('user.form.copied')
                                                : t('user.form.copy')}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {t('user.form.defaultPasswordHint')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </FormSection>
                )}

                {/* ── Role, branch & status ── */}
                <FormSection
                    icon={ShieldCheck}
                    title={
                        isCustomerMode
                            ? t('user.form.section.status')
                            : t('user.form.section.access')
                    }
                >
                    {!isCustomerMode && (
                        <Field label={t('user.field.role')}>
                            <RoleOptionCards
                                value={role}
                                disabled={isSelf}
                                onChange={(r) => {
                                    setRole(r);
                                    if (!BRANCH_ROLES.includes(r))
                                        setBranchId('');
                                }}
                            />
                        </Field>
                    )}

                    {needsBranch && (
                        <Field label={t('user.field.branch')}>
                            <Combobox
                                options={branchOptions}
                                value={branchId}
                                onChange={setBranchId}
                                placeholder={t('user.field.branch.placeholder')}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('user.form.branchHint')}
                            </p>
                        </Field>
                    )}

                    <Field label={t('user.field.status')}>
                        <div
                            role="radiogroup"
                            className="grid grid-cols-2 gap-2"
                        >
                            {ACCOUNT_STATUSES.filter(
                                (st) => st !== 'deleted',
                            ).map((st) => {
                                const on = accountStatus === st;
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        role="radio"
                                        aria-checked={on}
                                        disabled={isSelf}
                                        onClick={() => setAccountStatus(st)}
                                        className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                            on
                                                ? st === 'active'
                                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400/25 dark:border-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                                                    : 'border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-400/25 dark:border-amber-600 dark:bg-amber-500/10 dark:text-amber-300'
                                                : 'text-muted-foreground hover:bg-accent'
                                        }`}
                                    >
                                        <span
                                            className={`size-2 rounded-full ${
                                                st === 'active'
                                                    ? 'bg-emerald-500'
                                                    : 'bg-amber-500'
                                            }`}
                                        />
                                        {t(STATUS_LABELS[st])}
                                    </button>
                                );
                            })}
                        </div>
                        {isSelf && (
                            <p className="text-xs text-muted-foreground">
                                {t('user.form.selfHint')}
                            </p>
                        )}
                    </Field>
                </FormSection>

                {/* ── Contact (optional for staff) ── */}
                {isCustomerMode ? (
                    <FormSection
                        icon={Mail}
                        title={t('user.form.section.contact')}
                    >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    </FormSection>
                ) : (
                    <div className="overflow-hidden rounded-xl border">
                        <button
                            type="button"
                            onClick={() => setShowContact((v) => !v)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <Mail className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">
                                    {t('user.form.contactOptional')}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {t('user.form.contactOptionalHint')}
                                </span>
                            </span>
                            <ChevronDown
                                className={`size-4 text-muted-foreground transition-transform ${
                                    showContact ? 'rotate-180' : ''
                                }`}
                            />
                        </button>
                        {showContact && (
                            <div className="grid grid-cols-1 gap-4 border-t px-4 py-4 sm:grid-cols-2">
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
                        )}
                    </div>
                )}
            </fieldset>

            <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-background/95 px-6 py-4 backdrop-blur">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={onCancel}
                        disabled={saving}
                    >
                        {t('common.cancel')}
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={saving || usernameBlocked}
                    className={`min-w-36 rounded-full text-white transition-colors ${
                        saveStep === 'done'
                            ? 'bg-emerald-500 hover:bg-emerald-500 disabled:opacity-100'
                            : 'bg-pink-500 hover:bg-pink-600 dark:bg-pink-700 dark:hover:bg-pink-800'
                    }`}
                >
                    {saveStep === 'done' ? (
                        <Check className="mr-2 size-4" />
                    ) : (
                        saving && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )
                    )}
                    {stepLabel ??
                        (isEdit
                            ? t('user.edit.submit')
                            : t('user.create.submit'))}
                </Button>
            </div>
        </form>
    );
}

/** A titled group of fields with a small icon. */
function FormSection({
    icon: Icon,
    title,
    children,
}: {
    icon: LucideIcon;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex size-6 items-center justify-center rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-300">
                    <Icon className="size-3.5" />
                </span>
                {title}
            </h3>
            {children}
        </section>
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

/** Tell the admin exactly what's wrong with a username, as they type. */
function usernameFormatError(
    raw: string,
    t: (key: TranslationKey) => string,
): string {
    const name = raw.trim();
    if (name.length < 3) return t('user.username.tooShort');
    if (name.length > 30) return t('user.username.tooLong');
    return t('user.username.badChars');
}
