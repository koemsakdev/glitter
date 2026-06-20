'use client';

import { ImageUp, Loader2, Plus, Save, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inputClass } from '@/features/settings/components/settings-shared';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { uploadImage } from '@/lib/uploads';
import { useToast } from '@/hooks/use-toast';
import type { SocialLink } from '@/features/settings/store-config';

function newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
}

interface SocialLinkDialogProps {
    open: boolean;
    social?: SocialLink | null;
    onOpenChange: (open: boolean) => void;
    onSave: (social: SocialLink) => void;
}

export function SocialLinkDialog({
    open,
    social,
    onOpenChange,
    onSave,
}: SocialLinkDialogProps) {
    const { toast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);
    const isEdit = Boolean(social);
    const [name, setName] = useState(social?.name ?? '');
    const [url, setUrl] = useState(social?.url ?? '');
    const [iconUrl, setIconUrl] = useState(social?.iconUrl ?? '');
    const [uploading, setUploading] = useState(false);

    const iconPreview = getFileUrl(iconUrl);

    async function pickIcon(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setUploading(true);
        try {
            const res = await uploadImage(file, 48);
            setIconUrl(res.url);
        } catch (error) {
            toast({
                title: 'Upload failed',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    }

    function handleSave() {
        if (!name.trim() || !url.trim()) {
            toast({ title: 'Enter a name and URL', variant: 'destructive' });
            return;
        }
        onSave({
            id: social?.id ?? newId(),
            name: name.trim(),
            url: url.trim(),
            iconUrl,
        });
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-md"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit ? 'Edit social link' : 'Add social link'}
                    </h2>
                </div>
                <div className="space-y-4 px-6 pb-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Icon</label>
                        <div className="flex items-center gap-3">
                            <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
                                {iconPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={iconPreview}
                                        alt={name}
                                        className="size-full object-contain"
                                    />
                                ) : (
                                    <ImageUp className="size-5 text-muted-foreground" />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <Loader2 className="size-4 animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={pickIcon}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploading}
                                onClick={() => fileRef.current?.click()}
                            >
                                {iconPreview ? 'Replace' : 'Upload icon'}
                            </Button>
                            {iconPreview && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => setIconUrl('')}
                                >
                                    <X className="size-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="TikTok, YouTube, Facebook…"
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">URL</label>
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://…"
                            className={inputClass}
                        />
                    </div>
                </div>
                <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {isEdit ? (
                            <Save className="size-4" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        {isEdit ? 'Save changes' : 'Add link'}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
