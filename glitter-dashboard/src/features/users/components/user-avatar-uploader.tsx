'use client';

import { Camera, Loader2, Save, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    useRemoveUserAvatar,
    useUploadUserAvatar,
} from '@/features/users/use-users';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

interface UserAvatarUploaderProps {
    userId: string;
    profileImageUrl: string | null;
    name: string;
}

export function UserAvatarUploader({
    userId,
    profileImageUrl,
    name,
}: UserAvatarUploaderProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);

    const uploadAvatar = useUploadUserAvatar();
    const removeAvatar = useRemoveUserAvatar();

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const currentAvatar = getFileUrl(profileImageUrl);
    const shown = preview ?? currentAvatar;
    const initials =
        name
            .split(' ')
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';
    const busy = uploadAvatar.isPending || removeAvatar.isPending;

    function pick(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        if (preview) URL.revokeObjectURL(preview);
        setFile(f);
        setPreview(URL.createObjectURL(f));
    }

    function cancelStaged() {
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
    }

    async function save() {
        if (!file) return;
        try {
            await uploadAvatar.mutateAsync({ id: userId, file });
            cancelStaged();
            toast({ title: t('profile.avatar.updated'), variant: 'success' });
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    async function remove() {
        try {
            await removeAvatar.mutateAsync(userId);
            toast({ title: t('profile.avatar.removed'), variant: 'success' });
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    return (
        <div className="flex items-center gap-4">
            <div className="relative">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-pink-100 text-xl font-semibold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                    {shown ? (
                        <Image
                            src={shown}
                            alt={name}
                            width={80}
                            height={80}
                            className="size-full object-cover"
                            unoptimized
                        />
                    ) : (
                        initials
                    )}
                </div>
                {busy && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                        <Loader2 className="size-5 animate-spin text-white" />
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={pick}
                />
                {file ? (
                    <>
                        <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={save}
                            className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                        >
                            <Save className="size-4" />
                            {t('user.avatar.save')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={cancelStaged}
                        >
                            <X className="size-4" />
                            {t('common.cancel')}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => fileRef.current?.click()}
                        >
                            <Camera className="size-4" />
                            {t('profile.avatar.change')}
                        </Button>
                        {currentAvatar && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={remove}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="size-4" />
                                {t('profile.avatar.remove')}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
