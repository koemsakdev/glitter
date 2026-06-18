'use client';

import { Camera, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
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
    'h-11 shadow-none focus-visible:outline-none focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

export function ProfileView() {
    const { t } = useI18n();
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
                await uploadAvatar.mutateAsync({ id: user!.id, file: avatarFile });
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

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <SavingOverlay open={saving} label={t('common.saving')} />

            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('profile.title')}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('profile.subtitle')}
                </p>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleSave();
                }}
                className="space-y-6"
            >
                {/* Avatar */}
                <div className="flex items-center gap-5 rounded-xl border bg-card p-5">
                    <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-pink-100 text-xl font-semibold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                        {shownAvatar ? (
                            <Image
                                src={shownAvatar}
                                alt={user.fullName}
                                width={80}
                                height={80}
                                className="size-full object-cover"
                                unoptimized
                            />
                        ) : (
                            initials
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <UserRoleBadge role={user.role} />
                            <UserStatusBadge status={user.accountStatus} />
                        </div>
                        <div className="flex gap-2">
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarPick}
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
                                    onClick={handleAvatarRemove}
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <Trash2 className="mr-2 size-4" />
                                    {t('profile.avatar.remove')}
                                </Button>
                            )}
                        </div>
                        {(avatarFile || removeFlag) && (
                            <p className="text-xs text-muted-foreground">
                                {t('profile.avatar.pending')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Editable fields */}
                <div className="space-y-4 rounded-xl border bg-card p-5">
                    <Field label={t('user.field.fullName')}>
                        <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label={t('user.field.email')}>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <Field label={t('user.field.phone')}>
                            <Input
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            disabled={saving}
                            className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                        >
                            {saving && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            )}
                            {t('profile.save.submit')}
                        </Button>
                    </div>
                </div>
            </form>
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
