'use client';

import { Loader2, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    BilingualField,
    inputClass,
} from '@/features/settings/components/settings-shared';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import type { Page, PageFormValues } from '@/types/page';

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

interface PageFormDialogProps {
    open: boolean;
    item?: Page | null;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: PageFormValues) => void;
}

export function PageFormDialog({
    open,
    item,
    pending,
    onOpenChange,
    onSubmit,
}: PageFormDialogProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(item);

    const [slug, setSlug] = useState(item?.slug ?? '');
    const [titleEn, setTitleEn] = useState(item?.titleEn ?? '');
    const [titleKm, setTitleKm] = useState(item?.titleKm ?? '');
    const [bodyEn, setBodyEn] = useState(item?.bodyEn ?? '');
    const [bodyKm, setBodyKm] = useState(item?.bodyKm ?? '');
    const [isPublished, setIsPublished] = useState(item?.isPublished ?? true);

    function handleSubmit() {
        const cleanSlug = slugify(slug);
        if (!cleanSlug || !titleEn.trim() || !titleKm.trim()) {
            toast({
                title: t('settings.pages.required'),
                variant: 'destructive',
            });
            return;
        }
        onSubmit({
            slug: cleanSlug,
            titleEn: titleEn.trim(),
            titleKm: titleKm.trim(),
            bodyEn: bodyEn.trim() || undefined,
            bodyKm: bodyKm.trim() || undefined,
            isPublished,
        });
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-2xl"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit
                            ? t('settings.pages.editTitle')
                            : t('settings.pages.add')}
                    </h2>
                </div>

                <div className="space-y-4 px-6 pb-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            {t('settings.pages.slug')}
                        </label>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm text-muted-foreground">
                                /
                            </span>
                            <Input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                onBlur={() => setSlug(slugify(slug))}
                                placeholder="about"
                                className={inputClass}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('settings.pages.slugHelp')}
                        </p>
                    </div>

                    <BilingualField
                        label={t('settings.pages.pageTitle')}
                        en={titleEn}
                        km={titleKm}
                        onEn={setTitleEn}
                        onKm={setTitleKm}
                    />
                    <BilingualField
                        label={t('settings.pages.body')}
                        en={bodyEn}
                        km={bodyKm}
                        onEn={setBodyEn}
                        onKm={setBodyKm}
                        textarea
                    />

                    <label className="flex cursor-pointer items-center gap-2">
                        <Switch
                            checked={isPublished}
                            onCheckedChange={(v) => setIsPublished(Boolean(v))}
                            className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
                        />
                        <span className="text-sm font-medium">
                            {t('settings.pages.published')}
                        </span>
                    </label>
                </div>

                <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={pending}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {pending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isEdit ? (
                            <Save className="size-4" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        {isEdit
                            ? t('settings.saveChanges')
                            : t('settings.pages.add')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
