'use client';

import { Camera, Eye, EyeOff, Loader2, Trash2, UserRound } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SavingOverlay } from '@/components/feedback/saving-overlay';
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
    STAFF_ROLES,
    type AccountStatus,
    type User,
    type UserFormValues,
    type UserRole,
} from '@/types/user';

const ROLE_LABELS: Record<UserRole, TranslationKey> = {
    customer: 'user.role.customer',
    cashier: 'user.role.cashier',
    manager: 'user.role.manager',
    admin: 'user.role.admin',
    super_admin: 'user.role.super_admin',
};

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
    const pending =
        createUser.isPending ||
        updateUser.isPending ||
        setUserPassword.isPending ||
        uploadAvatar.isPending ||
        removeAvatar.isPending;

    const { data: branches } = useActiveBranches();
    const fileRef = useRef<HTMLInputElement>(null);

    const [fullName, setFullName] = useState(user?.fullName ?? '');
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

    const isStaff = !isCustomerMode && STAFF_ROLES.includes(role);

    // Roles listed most-powerful first — Super Admin always shown on top.
    // (The backend still enforces that only one Super Admin can exist.)
    const roleChoices: UserRole[] = [
        'super_admin',
        'admin',
        'manager',
        'cashier',
    ];

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

        // Staff need an email + password to sign into the dashboard. On create
        // the password is required; on edit it's only validated when the admin
        // actually types a new one (blank = keep current).
        const wantsPassword =
            canSetPassword && (passwordRequired || password.trim().length > 0);
        if (wantsPassword) {
            if (!email.trim()) {
                toast({
                    title: t('common.toast.error'),
                    description: t('user.validation.emailRequiredForLogin'),
                    variant: 'destructive',
                });
                return;
            }
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
            email: email.trim() || undefined,
            phoneNumber: phoneNumber.trim() || undefined,
            role: isCustomerMode ? 'customer' : role,
            branchId: isStaff ? branchId || undefined : undefined,
            accountStatus,
            // On create, the password goes with the create call. On edit it's
            // applied separately via the reset endpoint (see below).
            password: passwordRequired ? password.trim() : undefined,
        };

        try {
            let id: string;
            if (isEdit && user) {
                await updateUser.mutateAsync({ id: user.id, payload });
                id = user.id;
                // Editing another staff member: apply a new password if typed.
                if (canSetPassword && password.trim().length >= 8) {
                    await setUserPassword.mutateAsync({
                        id,
                        password: password.trim(),
                    });
                }
            } else {
                const created = await createUser.mutateAsync(payload);
                id = created.id;
            }

            if (avatarFile) {
                await uploadAvatar.mutateAsync({ id, file: avatarFile });
            } else if (removeFlag) {
                await removeAvatar.mutateAsync(id);
            }

            toast({
                title: isEdit
                    ? t('user.edit.success')
                    : t('user.create.success'),
                variant: 'success',
            });
            onSuccess?.();
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
            }}
            className="flex flex-col"
        >
            <SavingOverlay open={pending} label={t('common.saving')} />

            <div className="space-y-4 px-6 pb-2">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                    <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-pink-100 to-pink-50 text-xl font-semibold text-pink-600 ring-2 ring-pink-200/70 dark:from-pink-500/20 dark:to-pink-500/5 dark:text-pink-300 dark:ring-pink-500/25">
                        {shownAvatar ? (
                            <Image
                                src={shownAvatar}
                                alt={fullName || 'avatar'}
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
                            disabled={pending}
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
                                disabled={pending}
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {!isCustomerMode && (
                        <Field label={t('user.field.role')}>
                            <Select
                                value={role}
                                disabled={isSelf}
                                onValueChange={(v) =>
                                    v && setRole(v as UserRole)
                                }
                            >
                                <SelectTrigger className="h-11 w-full">
                                    <SelectValue>
                                        {(v: string) =>
                                            t(ROLE_LABELS[v as UserRole])
                                        }
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {roleChoices.map((r) => (
                                        <SelectItem key={r} value={r}>
                                            {t(ROLE_LABELS[r])}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                {ACCOUNT_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {t(STATUS_LABELS[s])}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>

                {isSelf && (
                    <p className="text-xs text-muted-foreground">
                        {t('user.form.selfHint')}
                    </p>
                )}

                {isStaff && (
                    <Field label={t('user.field.branch')}>
                        <Combobox
                            options={branchOptions}
                            value={branchId}
                            onChange={setBranchId}
                            placeholder={t('user.field.branch.placeholder')}
                        />
                    </Field>
                )}
            </div>

            <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={pending}
                    >
                        {t('common.cancel')}
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={pending}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {isEdit ? t('user.edit.submit') : t('user.create.submit')}
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
