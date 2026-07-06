'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
    Award,
    BarChart3,
    FileText,
    Gem,
    Gift,
    Headphones,
    Heart,
    Loader,
    Loader2,
    Pencil,
    Plus,
    Save,
    ShieldCheck,
    Sparkles,
    Star,
    Trash2,
    Truck,
    type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { IconUploader } from '@/features/settings/components/icon-uploader';
import {
    BilingualField,
    inputClass,
} from '@/features/settings/components/settings-shared';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import type {
    AboutHighlight,
    AboutStat,
    StoreConfig,
} from '@/features/settings/store-config';
import { uploadImage } from '@/lib/uploads';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const CONFIG_KEY = ['app-settings', 'store-config'] as const;

const ICONS: Record<string, LucideIcon> = {
    sparkles: Sparkles,
    truck: Truck,
    shield: ShieldCheck,
    heart: Heart,
    star: Star,
    gem: Gem,
    gift: Gift,
    headphones: Headphones,
};
const ICON_KEYS = Object.keys(ICONS);

function newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
}

export default function AboutSettingsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data, isLoading } = useStoreConfig();
    const save = useSaveStoreConfig();

    const [statDialog, setStatDialog] = useState<AboutStat | null | undefined>(
        undefined,
    );
    const [hlDialog, setHlDialog] = useState<
        AboutHighlight | null | undefined
    >(undefined);
    const [deleting, setDeleting] = useState<{
        type: 'stat' | 'hl';
        id: string;
        label: string;
    } | null>(null);

    function persist(patch: Partial<StoreConfig>) {
        if (!data) return;
        const nextConfig = { ...data.config, ...patch };
        queryClient.setQueryData(CONFIG_KEY, { ...data, config: nextConfig });
        save.mutate(
            { config: nextConfig, settingId: data.settingId },
            {
                onError: (error) => {
                    void queryClient.invalidateQueries({
                        queryKey: ['app-settings'],
                    });
                    toast({
                        title: t('settings.couldNotSave'),
                        description: getErrorMessage(error),
                        variant: 'destructive',
                    });
                },
            },
        );
    }

    if (isLoading || !data) return <LoadingScreen variant="page" />;

    const config = data.config;
    const stats = config.aboutStats;
    const highlights = config.aboutHighlights;

    function saveStat(stat: AboutStat) {
        const next = stats.some((s) => s.id === stat.id)
            ? stats.map((s) => (s.id === stat.id ? stat : s))
            : [...stats, stat];
        persist({ aboutStats: next });
        setStatDialog(undefined);
    }
    function saveHighlight(hl: AboutHighlight) {
        const next = highlights.some((h) => h.id === hl.id)
            ? highlights.map((h) => (h.id === hl.id ? hl : h))
            : [...highlights, hl];
        persist({ aboutHighlights: next });
        setHlDialog(undefined);
    }
    function confirmDelete() {
        if (!deleting) return;
        if (deleting.type === 'stat')
            persist({ aboutStats: stats.filter((s) => s.id !== deleting.id) });
        else
            persist({
                aboutHighlights: highlights.filter((h) => h.id !== deleting.id),
            });
        setDeleting(null);
    }

    return (
        <div className="space-y-8">
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">
                        {t('settings.about.title')}
                    </h2>
                    {save.isPending && (
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader className="size-4 animate-spin" />
                            {t('common.saving')}
                        </span>
                    )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    {t('settings.about.subtitle')}
                </p>
            </div>

            {/* Image + headline + story */}
            <AboutContentForm
                key={data.settingId}
                config={config}
                onSave={persist}
            />

            {/* Stats */}
            <section className="rounded-xl border bg-card">
                <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                    <div>
                        <h3 className="text-sm font-semibold">
                            {t('settings.about.stats')}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('settings.about.statsNote')}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatDialog(null)}
                    >
                        <Plus className="size-4" />
                        {t('settings.about.addStat')}
                    </Button>
                </div>
                {stats.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                        {t('settings.about.noStats')}
                    </p>
                ) : (
                    <div className="divide-y">
                        {stats.map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center gap-3 px-5 py-3"
                            >
                                <span className="text-lg font-bold text-pink-600 dark:text-pink-400">
                                    {s.value}
                                </span>
                                <span className="flex-1 text-sm text-muted-foreground">
                                    {s.labelEn}
                                </span>
                                <RowActions
                                    onEdit={() => setStatDialog(s)}
                                    onDelete={() =>
                                        setDeleting({
                                            type: 'stat',
                                            id: s.id,
                                            label: `${s.value} ${s.labelEn}`,
                                        })
                                    }
                                    editLabel={t('common.edit')}
                                    deleteLabel={t('common.delete')}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Highlights */}
            <section className="rounded-xl border bg-card">
                <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                    <div>
                        <h3 className="text-sm font-semibold">
                            {t('settings.about.highlights')}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('settings.about.highlightsNote')}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setHlDialog(null)}
                    >
                        <Plus className="size-4" />
                        {t('settings.about.addHighlight')}
                    </Button>
                </div>
                {highlights.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                        {t('settings.about.noHighlights')}
                    </p>
                ) : (
                    <div className="divide-y">
                        {highlights.map((h) => {
                            const Icon = ICONS[h.icon] ?? Sparkles;
                            return (
                                <div
                                    key={h.id}
                                    className="flex items-center gap-3 px-5 py-3"
                                >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300">
                                        <Icon className="size-4.5" />
                                    </span>
                                    <span className="flex-1 text-sm font-medium">
                                        {h.titleEn}
                                    </span>
                                    <RowActions
                                        onEdit={() => setHlDialog(h)}
                                        onDelete={() =>
                                            setDeleting({
                                                type: 'hl',
                                                id: h.id,
                                                label: h.titleEn,
                                            })
                                        }
                                        editLabel={t('common.edit')}
                                        deleteLabel={t('common.delete')}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <p className="max-w-2xl text-xs text-muted-foreground">
                {t('settings.about.note')}
            </p>

            {statDialog !== undefined && (
                <StatDialog
                    item={statDialog}
                    onClose={() => setStatDialog(undefined)}
                    onSave={saveStat}
                />
            )}
            {hlDialog !== undefined && (
                <HighlightDialog
                    item={hlDialog}
                    onClose={() => setHlDialog(undefined)}
                    onSave={saveHighlight}
                />
            )}
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => {
                    if (!o) setDeleting(null);
                }}
                title={t('settings.confirmDelete')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting?.label ?? '',
                )}
                confirmLabel={t('settings.confirmDelete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                onConfirm={confirmDelete}
            />
        </div>
    );
}

function RowActions({
    onEdit,
    onDelete,
    editLabel,
    deleteLabel,
}: {
    onEdit: () => void;
    onDelete: () => void;
    editLabel: string;
    deleteLabel: string;
}) {
    return (
        <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                title={editLabel}
                onClick={onEdit}
            >
                <Pencil className="size-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title={deleteLabel}
                onClick={onDelete}
            >
                <Trash2 className="size-4" />
            </Button>
        </div>
    );
}

function AboutContentForm({
    config,
    onSave,
}: {
    config: StoreConfig;
    onSave: (patch: Partial<StoreConfig>) => void;
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const [headlineEn, setHeadlineEn] = useState(config.aboutHeadlineEn);
    const [headlineKm, setHeadlineKm] = useState(config.aboutHeadlineKm);
    const [storyEn, setStoryEn] = useState(config.aboutStoryEn);
    const [storyKm, setStoryKm] = useState(config.aboutStoryKm);
    const [url, setUrl] = useState(config.aboutImageUrl);
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const dirty =
        headlineEn !== config.aboutHeadlineEn ||
        headlineKm !== config.aboutHeadlineKm ||
        storyEn !== config.aboutStoryEn ||
        storyKm !== config.aboutStoryKm ||
        url !== config.aboutImageUrl ||
        file !== null;

    async function handleSave() {
        setSaving(true);
        try {
            let imageUrl = url;
            if (file) imageUrl = (await uploadImage(file, 80)).url;
            onSave({
                aboutHeadlineEn: headlineEn.trim(),
                aboutHeadlineKm: headlineKm.trim(),
                aboutStoryEn: storyEn,
                aboutStoryKm: storyKm,
                aboutImageUrl: imageUrl,
            });
            setUrl(imageUrl);
            setFile(null);
        } catch (error) {
            toast({
                title: t('settings.uploadFailed'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-2xl space-y-5 rounded-xl border bg-card p-5">
            <IconUploader
                value={url}
                file={file}
                onPick={setFile}
                label={t('settings.about.image')}
                hint={t('settings.about.imageHint')}
            />
            <BilingualField
                label={t('settings.about.headline')}
                en={headlineEn}
                km={headlineKm}
                onEn={setHeadlineEn}
                onKm={setHeadlineKm}
            />
            <BilingualField
                label={t('settings.about.story')}
                en={storyEn}
                km={storyKm}
                onEn={setStoryEn}
                onKm={setStoryKm}
                textarea
            />
            <div className="flex justify-end">
                <Button
                    type="button"
                    disabled={!dirty || saving}
                    onClick={handleSave}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Save className="size-4" />
                    )}
                    {t('settings.saveChanges')}
                </Button>
            </div>
        </div>
    );
}

function StatDialog({
    item,
    onClose,
    onSave,
}: {
    item: AboutStat | null;
    onClose: () => void;
    onSave: (stat: AboutStat) => void;
}) {
    const { t } = useI18n();
    const [value, setValue] = useState(item?.value ?? '');
    const [labelEn, setLabelEn] = useState(item?.labelEn ?? '');
    const [labelKm, setLabelKm] = useState(item?.labelKm ?? '');

    return (
        <ResponsiveModal open onOpenChange={onClose} className="sm:max-w-md">
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {item
                            ? t('settings.about.editStat')
                            : t('settings.about.addStat')}
                    </h2>
                </div>
                <div className="space-y-4 px-6 pb-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            {t('settings.about.statValue')}
                        </label>
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="10k+"
                            className={inputClass}
                        />
                    </div>
                    <BilingualField
                        label={t('settings.about.statLabel')}
                        en={labelEn}
                        km={labelKm}
                        onEn={setLabelEn}
                        onKm={setLabelKm}
                    />
                </div>
                <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        disabled={!value.trim() || !labelEn.trim()}
                        onClick={() =>
                            onSave({
                                id: item?.id ?? newId(),
                                value: value.trim(),
                                labelEn: labelEn.trim(),
                                labelKm: labelKm.trim(),
                            })
                        }
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {t('settings.saveChanges')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}

function HighlightDialog({
    item,
    onClose,
    onSave,
}: {
    item: AboutHighlight | null;
    onClose: () => void;
    onSave: (hl: AboutHighlight) => void;
}) {
    const { t } = useI18n();
    const [icon, setIcon] = useState(item?.icon ?? ICON_KEYS[0]);
    const [titleEn, setTitleEn] = useState(item?.titleEn ?? '');
    const [titleKm, setTitleKm] = useState(item?.titleKm ?? '');
    const [textEn, setTextEn] = useState(item?.textEn ?? '');
    const [textKm, setTextKm] = useState(item?.textKm ?? '');

    return (
        <ResponsiveModal open onOpenChange={onClose} className="sm:max-w-lg">
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {item
                            ? t('settings.about.editHighlight')
                            : t('settings.about.addHighlight')}
                    </h2>
                </div>
                <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 pb-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium">
                            {t('settings.about.icon')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {ICON_KEYS.map((key) => {
                                const Icon = ICONS[key];
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setIcon(key)}
                                        className={cn(
                                            'flex size-10 items-center justify-center rounded-lg border transition-colors',
                                            icon === key
                                                ? 'border-pink-500 bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300'
                                                : 'border-input text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        <Icon className="size-5" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <BilingualField
                        label={t('settings.about.highlightTitle')}
                        en={titleEn}
                        km={titleKm}
                        onEn={setTitleEn}
                        onKm={setTitleKm}
                    />
                    <BilingualField
                        label={t('settings.about.highlightText')}
                        en={textEn}
                        km={textKm}
                        onEn={setTextEn}
                        onKm={setTextKm}
                        textarea
                    />
                </div>
                <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        disabled={!titleEn.trim()}
                        onClick={() =>
                            onSave({
                                id: item?.id ?? newId(),
                                icon,
                                titleEn: titleEn.trim(),
                                titleKm: titleKm.trim(),
                                textEn: textEn.trim(),
                                textKm: textKm.trim(),
                            })
                        }
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {t('settings.saveChanges')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
