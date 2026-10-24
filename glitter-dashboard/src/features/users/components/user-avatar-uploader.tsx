'use client';

import { Camera, Loader2, Save, Trash2, Upload, X } from 'lucide-react';
import { SafeImage as Image } from '@/components/ui/safe-image';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    /** 'hero' = large avatar with a camera badge menu (profile headers). */
    variant?: 'default' | 'hero';
    /** Whether the viewer may change the photo (hero variant). */
    editable?: boolean;
}

/** Avatar image that falls back to initials if the URL fails to load. */
function AvatarImage({
    src,
    name,
    initials,
}: {
    src: string;
    name: string;
    initials: string;
}) {
    const [failed, setFailed] = useState(false);
    if (failed) return <>{initials}</>;
    return (
        <Image
            src={src}
            alt={name}
            width={80}
            height={80}
            className="size-full object-cover"
            unoptimized
            onError={() => setFailed(true)}
        />
    );
}

export function UserAvatarUploader({
    userId,
    profileImageUrl,
    name,
    variant = 'default',
    editable = true,
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

    if (variant === 'hero') {
        return (
            <div className="flex flex-col items-start gap-2">
                <div className="relative">
                    <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-semibold text-foreground/70 ring-1 ring-border">
                        {shown ? (
                            <AvatarImage
                                key={shown}
                                src={shown}
                                name={name}
                                initials={initials}
                            />
                        ) : (
                            initials
                        )}
                    </div>
                    {busy && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                            <Loader2 className="size-6 animate-spin text-white" />
                        </div>
                    )}
                    {editable && !file && (
                        <>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={pick}
                            />
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <button
                                            type="button"
                                            disabled={busy}
                                            aria-label={t(
                                                'profile.avatar.change',
                                            )}
                                            className="absolute -bottom-0.5 -right-0.5 flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-pink-500"
                                        />
                                    }
                                >
                                    <Camera className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    className="w-48"
                                >
                                    <DropdownMenuItem
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <Upload className="mr-2 size-4" />
                                        {t('user.form.uploadPhoto')}
                                    </DropdownMenuItem>
                                    {currentAvatar && (
                                        <DropdownMenuItem
                                            onClick={() => void remove()}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="mr-2 size-4" />
                                            {t('profile.avatar.remove')}
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
                {/* New photo picked — confirm before uploading */}
                {file && (
                    <div className="flex gap-1.5">
                        <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={save}
                            className="h-8 rounded-full bg-pink-500 text-white hover:bg-pink-600 dark:bg-pink-700 dark:hover:bg-pink-800"
                        >
                            <Save className="size-3.5" />
                            {t('user.avatar.save')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={cancelStaged}
                            className="h-8 rounded-full"
                        >
                            <X className="size-3.5" />
                            {t('common.cancel')}
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <div className="relative">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-pink-100 text-xl font-semibold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                    {shown ? (
                        <AvatarImage
                            key={shown}
                            src={shown}
                            name={name}
                            initials={initials}
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
