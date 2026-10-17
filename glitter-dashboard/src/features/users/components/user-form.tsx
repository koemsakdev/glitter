'use client';

import {
    Camera,
    Check,
    ChevronDown,
    CircleAlert,
    CircleCheck,
    Eye,
    EyeOff,
    Loader2,
    Trash2,
    UserRound,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    'h-11 shadow-none focus-visible:outline-none focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

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

    // Staff get a dashboard login password. On create it's required; when an
    // admin edits another staff member they can set/reset it (optional). Hidden
    // for your OWN account — use the Change Password page (needs your current
    // password) — and for customers (they sign in on the storefront).
    const canSetPassword = !isCustomerMode && !isSelf;
    const passwordRequired = canSetPassword && !isEdit;

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
        // create the password is required; on edit it's only validated when
        // the admin actually types a new one (blank = keep current).
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
            canSetPassword && (passwordRequired || password.trim().length > 0);
        if (wantsPassword) {
            if (password.trim().length < 8) {
                toast({
                    title: t('common.toast.error'),
                    description: t('user.validation.passwordMin'),
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
            // On create, the password goes with the create call. On edit it's
            // applied separately via the reset endpoint (see below).
            password: passwordRequired ? password.trim() : undefined,
        };

        try {
            let id: string;
            setSaveStep('account');
            if (isEdit && user) {
                await updateUser.mutateAsync({ id: user.id, payload });
                id = user.id;
                // Editing another staff member: apply a new password if typed.
                if (canSetPassword && password.trim().length >= 8) {
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

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
            }}
            className="flex flex-col"
        >
            {/* Thin progress bar along the top while saving. */}
            <div
                aria-hidden
                className={`h-0.5 overflow-hidden bg-pink-100 transition-opacity dark:bg-pink-500/10 ${
                    saving ? 'opacity-100' : 'opacity-0'
                }`}
            >
                <div
                    className={`h-full bg-pink-400 transition-[width] duration-500 ease-out dark:bg-pink-600 ${
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

            <fieldset
                disabled={saving}
                className={`space-y-4 px-6 pb-2 pt-2 transition-opacity ${
                    saving ? 'pointer-events-none opacity-60' : ''
                }`}
            >
                {/* Avatar */}
                <div className="flex items-center gap-4">
                    <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-pink-100 to-pink-50 text-xl font-semibold text-pink-600 ring-2 ring-pink-200/70 dark:from-pink-500/20 dark:to-pink-500/5 dark:text-pink-300 dark:ring-pink-500/25">
                        {shownAvatar ? (
                            <Image
                                src={shownAvatar}
                                alt={fullName || 'avatar'}
                                fallback={
                                    initials !== '?' ? (
                                        initials
                                    ) : (
                                        <UserRound className="size-9 text-pink-400 dark:text-pink-300/70" />
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
                            <UserRound className="size-9 text-pink-400 dark:text-pink-300/70" />
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={pickAvatar}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={saving}
                            onClick={() => fileRef.current?.click()}
                        >
                            <Camera className="mr-2 size-4" />
                            {t('profile.avatar.change')}
                        </Button>
                        {shownAvatar && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={saving}
                                onClick={clearAvatar}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="mr-2 size-4" />
                                {t('profile.avatar.remove')}
                            </Button>
                        )}
                    </div>
                </div>

                <Field label={t('user.field.fullName')}>
                    <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Koemsak Sovann"
                        className={inputClass}
                    />
                </Field>

                {!isCustomerMode && (
                    <Field label={t('user.field.username')}>
                        <div className="relative">
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
                                className={`${inputClass} pr-10 font-mono ${
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

                {canSetPassword && (
                    <Field
                        label={
                            isEdit
                                ? t('user.field.setNewPassword')
                                : t('user.field.password')
                        }
                    >
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={
                                    isEdit
                                        ? t(
                                              'user.field.setNewPassword.placeholder',
                                          )
                                        : t('user.field.password.placeholder')
                                }
                                autoComplete="new-password"
                                className={`${inputClass} pr-11`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide' : 'Show'}
                            >
                                {showPassword ? (
                                    <EyeOff className="size-4" />
                                ) : (
                                    <Eye className="size-4" />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isEdit
                                ? t('user.form.resetPasswordHint')
                                : t('user.form.passwordHint')}
                        </p>
                    </Field>
                )}

                {!isCustomerMode && (
                    <Field label={t('user.field.role')}>
                        <RoleOptionCards
                            value={role}
                            disabled={isSelf}
                            onChange={(r) => {
                                setRole(r);
                                if (!BRANCH_ROLES.includes(r)) setBranchId('');
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
                    <Select
                        value={accountStatus}
                        disabled={isSelf}
                        onValueChange={(v) =>
                            v && setAccountStatus(v as AccountStatus)
                        }
                    >
                        <SelectTrigger className="h-11 w-full">
                            <SelectValue>
                                {(v: string) => t(STATUS_LABELS[v as AccountStatus])}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {ACCOUNT_STATUSES.filter((s) => s !== 'deleted').map(
                                (s) => (
                                    <SelectItem key={s} value={s}>
                                        {t(STATUS_LABELS[s])}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </Field>

                {isSelf && (
                    <p className="text-xs text-muted-foreground">
                        {t('user.form.selfHint')}
                    </p>
                )}

                {/* Contact details — optional for staff (kept for when
                    everyone has a work email). */}
                {isCustomerMode ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label={t('user.field.email')}>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className={inputClass}
                            />
                        </Field>
                        <Field label={t('user.field.phone')}>
                            <Input
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+855..."
                                className={inputClass}
                            />
                        </Field>
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed">
                        <button
                            type="button"
                            onClick={() => setShowContact((v) => !v)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
                        >
                            <span>
                                {t('user.form.contactOptional')}
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
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
                            <div className="px-4 pb-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label={t('user.field.email')}>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label={t('user.field.phone')}>
                                    <Input
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="+855..."
                                        className={inputClass}
                                    />
                                </Field>
                            </div>
                            </div>
                        )}
                    </div>
                )}
            </fieldset>

            <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={saving}
                    >
                        {t('common.cancel')}
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={saving || usernameBlocked}
                    className={`min-w-36 text-white transition-colors ${
                        saveStep === 'done'
                            ? 'bg-emerald-500 hover:bg-emerald-500 disabled:opacity-100'
                            : 'bg-pink-400 hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800'
                    }`}
                >
                    {saveStep === 'done' ? (
                        <Check className="mr-2 size-4" />
                    ) : (
                        saving && <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    {stepLabel ??
                        (isEdit ? t('user.edit.submit') : t('user.create.submit'))}
                </Button>
            </div>
        </form>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
