'use client';

import { Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BilingualField,
    inputClass,
} from '@/features/settings/components/settings-shared';
import { useCategories } from '@/features/categories/use-categories';
import type {
    HomeSection,
    HomeSectionType,
    SectionPage,
} from '@/features/settings/store-config';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

function newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
}

const TYPES: HomeSectionType[] = [
    'new-arrivals',
    'best-selling',
    'categories',
    'category-products',
];
const TYPE_LABEL: Record<HomeSectionType, TranslationKey> = {
    'new-arrivals': 'settings.sections.typeNewArrivals',
    'best-selling': 'settings.sections.typeBestSelling',
    categories: 'settings.sections.typeCategories',
    'category-products': 'settings.sections.typeCategoryProducts',
};
const PAGE_LABEL: Record<SectionPage, TranslationKey> = {
    home: 'settings.sections.pageHome',
    products: 'settings.sections.pageProducts',
};

interface SectionFormDialogProps {
    open: boolean;
    section?: HomeSection | null;
    onOpenChange: (open: boolean) => void;
    onSave: (section: HomeSection) => void;
}

export function SectionFormDialog({
    open,
    section,
    onOpenChange,
    onSave,
}: SectionFormDialogProps) {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(section);

    const [page, setPage] = useState<SectionPage>(section?.page ?? 'home');
    const [type, setType] = useState<HomeSectionType>(
        section?.type ?? 'new-arrivals',
    );
    const [titleEn, setTitleEn] = useState(section?.titleEn ?? '');
    const [titleKm, setTitleKm] = useState(section?.titleKm ?? '');
    const [categoryId, setCategoryId] = useState(section?.categoryId ?? '');
    const [limit, setLimit] = useState(section?.limit ?? 8);

    const { data: categoryData } = useCategories({ limit: 100 });
    const categories = categoryData?.data ?? [];

    const showCategory = type === 'category-products';
    const showLimit =
        type === 'new-arrivals' ||
        type === 'category-products' ||
        type === 'best-selling';

    function handleSave() {
        if (!titleEn.trim() && !titleKm.trim()) {
            toast({
                title: t('settings.sections.titleRequired'),
                variant: 'destructive',
            });
            return;
        }
        if (showCategory && !categoryId) {
            toast({
                title: t('settings.sections.categoryRequired'),
                variant: 'destructive',
            });
            return;
        }
        onSave({
            id: section?.id ?? newId(),
            page,
            type,
            titleEn: titleEn.trim(),
            titleKm: titleKm.trim(),
            enabled: section?.enabled ?? true,
            categoryId: showCategory ? categoryId : undefined,
            limit: showLimit ? limit : undefined,
        });
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-lg"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit
                            ? t('settings.sections.editTitle')
                            : t('settings.sections.add')}
                    </h2>
                </div>

                <div className="space-y-4 px-6 pb-2">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.sections.page')}
                            </label>
                            <Select
                                value={page}
                                onValueChange={(v) =>
                                    v && setPage(v as SectionPage)
                                }
                            >
                                <SelectTrigger className="h-11 w-full">
                                    <SelectValue>
                                        {(v: string) =>
                                            t(PAGE_LABEL[v as SectionPage])
                                        }
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="home">
                                        {t('settings.sections.pageHome')}
                                    </SelectItem>
                                    <SelectItem value="products">
                                        {t('settings.sections.pageProducts')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.sections.type')}
                            </label>
                            <Select
                                value={type}
                                onValueChange={(v) =>
                                    v && setType(v as HomeSectionType)
                                }
                            >
                                <SelectTrigger className="h-11 w-full">
                                    <SelectValue>
                                        {(v: string) =>
                                            t(TYPE_LABEL[v as HomeSectionType])
                                        }
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {TYPES.map((ty) => (
                                        <SelectItem key={ty} value={ty}>
                                            {t(TYPE_LABEL[ty])}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <BilingualField
                        label={t('settings.home.heroTitle')}
                        en={titleEn}
                        km={titleKm}
                        onEn={setTitleEn}
                        onKm={setTitleKm}
                    />

                    {showCategory && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.sections.category')}
                            </label>
                            <Select
                                value={categoryId}
                                onValueChange={(v) => setCategoryId(v ?? '')}
                            >
                                <SelectTrigger className="h-11 w-full">
                                    <SelectValue
                                        placeholder={t(
                                            'settings.sections.categoryPlaceholder',
                                        )}
                                    >
                                        {(v: string) => {
                                            const c = categories.find(
                                                (x) => x.id === v,
                                            );
                                            if (!c)
                                                return t(
                                                    'settings.sections.categoryPlaceholder',
                                                );
                                            return language === 'km'
                                                ? c.nameKm
                                                : c.nameEn;
                                        }}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {language === 'km'
                                                ? c.nameKm
                                                : c.nameEn}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {showLimit && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.sections.limit')}
                            </label>
                            <Input
                                type="number"
                                min={1}
                                max={24}
                                value={limit}
                                onChange={(e) =>
                                    setLimit(
                                        Math.max(
                                            1,
                                            Number(e.target.value) || 1,
                                        ),
                                    )
                                }
                                className={`${inputClass} w-32`}
                            />
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common.cancel')}
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
                        {isEdit
                            ? t('settings.saveChanges')
                            : t('settings.sections.add')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
