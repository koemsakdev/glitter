'use client';

import { Loader2, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BilingualField,
    TextField,
} from '@/features/settings/components/settings-shared';
import { useBrands } from '@/features/brands/use-brands';
import { useCategories } from '@/features/categories/use-categories';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import type { MenuFormValues, MenuItem, MenuLocation } from '@/types/menu';

const LOCATION_LABEL: Record<MenuLocation, TranslationKey> = {
    header: 'settings.menu.header',
    footer: 'settings.menu.footer',
};

type LinkType = 'home' | 'products' | 'category' | 'brand' | 'custom';
const LINK_LABEL: Record<LinkType, TranslationKey> = {
    home: 'settings.menu.linkHome',
    products: 'settings.menu.linkProducts',
    category: 'settings.menu.linkCategory',
    brand: 'settings.menu.linkBrand',
    custom: 'settings.menu.linkCustom',
};

/** Parse a stored url back into the picker's selection. */
function parseLink(url: string): {
    type: LinkType;
    categoryId: string;
    brandId: string;
    custom: string;
} {
    if (url === '/') return { type: 'home', categoryId: '', brandId: '', custom: '' };
    if (url === '/products')
        return { type: 'products', categoryId: '', brandId: '', custom: '' };
    if (url.startsWith('/products?categoryId='))
        return {
            type: 'category',
            categoryId: url.slice('/products?categoryId='.length),
            brandId: '',
            custom: '',
        };
    if (url.startsWith('/products?brandId='))
        return {
            type: 'brand',
            categoryId: '',
            brandId: url.slice('/products?brandId='.length),
            custom: '',
        };
    return { type: 'custom', categoryId: '', brandId: '', custom: url };
}

interface MenuFormDialogProps {
    open: boolean;
    item?: MenuItem | null;
    allItems: MenuItem[];
    defaultLocation: MenuLocation;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: MenuFormValues) => void;
}

export function MenuFormDialog({
    open,
    item,
    allItems,
    defaultLocation,
    pending,
    onOpenChange,
    onSubmit,
}: MenuFormDialogProps) {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(item);

    const initial = parseLink(item?.url ?? '');
    const [labelEn, setLabelEn] = useState(item?.labelEn ?? '');
    const [labelKm, setLabelKm] = useState(item?.labelKm ?? '');
    const [linkType, setLinkType] = useState<LinkType>(
        item ? initial.type : 'products',
    );
    const [categoryId, setCategoryId] = useState(initial.categoryId);
    const [brandId, setBrandId] = useState(initial.brandId);
    const [customUrl, setCustomUrl] = useState(initial.custom);
    const [location, setLocation] = useState<MenuLocation>(
        item?.location ?? defaultLocation,
    );
    const [isActive, setIsActive] = useState(item?.isActive ?? true);
    const [openInNewTab, setOpenInNewTab] = useState(
        item?.openInNewTab ?? false,
    );
    const [parentId, setParentId] = useState(item?.parentId ?? '');

    const { data: categoryData } = useCategories({ limit: 100 });
    const categories = categoryData?.data ?? [];
    const { data: brandData } = useBrands({ limit: 100 });
    const brands = brandData?.data ?? [];

    // Only top-level items in the same location can be a parent.
    const parentOptions = allItems.filter(
        (i) =>
            i.location === location &&
            i.parentId === null &&
            i.id !== item?.id,
    );

    const resolvedUrl =
        linkType === 'home'
            ? '/'
            : linkType === 'products'
              ? '/products'
              : linkType === 'category'
                ? categoryId
                    ? `/products?categoryId=${categoryId}`
                    : ''
                : linkType === 'brand'
                  ? brandId
                      ? `/products?brandId=${brandId}`
                      : ''
                  : customUrl.trim();

    function handleSubmit() {
        if (!labelEn.trim() || !labelKm.trim() || !resolvedUrl) {
            toast({
                title: t('settings.menu.required'),
                variant: 'destructive',
            });
            return;
        }
        onSubmit({
            labelEn: labelEn.trim(),
            labelKm: labelKm.trim(),
            url: resolvedUrl,
            location,
            isActive,
            openInNewTab,
            parentId: parentOptions.some((p) => p.id === parentId)
                ? parentId
                : null,
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
                            ? t('settings.menu.editTitle')
                            : t('settings.menu.add')}
                    </h2>
                </div>

                <div className="space-y-4 px-6 pb-2">
                    <BilingualField
                        label={t('settings.menu.label')}
                        en={labelEn}
                        km={labelKm}
                        onEn={setLabelEn}
                        onKm={setLabelKm}
                    />
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            {t('settings.menu.linkTo')}
                        </label>
                        <Select
                            value={linkType}
                            onValueChange={(v) =>
                                v && setLinkType(v as LinkType)
                            }
                        >
                            <SelectTrigger className="h-11 w-full">
                                <SelectValue>
                                    {(v: string) =>
                                        t(LINK_LABEL[v as LinkType])
                                    }
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="home">
                                    {t('settings.menu.linkHome')}
                                </SelectItem>
                                <SelectItem value="products">
                                    {t('settings.menu.linkProducts')}
                                </SelectItem>
                                <SelectItem value="category">
                                    {t('settings.menu.linkCategory')}
                                </SelectItem>
                                <SelectItem value="brand">
                                    {t('settings.menu.linkBrand')}
                                </SelectItem>
                                <SelectItem value="custom">
                                    {t('settings.menu.linkCustom')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {linkType === 'category' && (
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

                    {linkType === 'brand' && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.menu.brand')}
                            </label>
                            <Select
                                value={brandId}
                                onValueChange={(v) => setBrandId(v ?? '')}
                            >
                                <SelectTrigger className="h-11 w-full">
                                    <SelectValue
                                        placeholder={t(
                                            'settings.menu.selectBrand',
                                        )}
                                    >
                                        {(v: string) => {
                                            const b = brands.find(
                                                (x) => x.id === v,
                                            );
                                            return b
                                                ? b.name
                                                : t('settings.menu.selectBrand');
                                        }}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {brands.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {linkType === 'custom' && (
                        <TextField
                            label={t('settings.menu.url')}
                            value={customUrl}
                            onChange={setCustomUrl}
                            placeholder="/products or https://…"
                        />
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            {t('settings.menu.location')}
                        </label>
                        <Select
                            value={location}
                            onValueChange={(v) =>
                                v && setLocation(v as MenuLocation)
                            }
                        >
                            <SelectTrigger className="h-11 w-full">
                                <SelectValue>
                                    {(v: string) =>
                                        t(LOCATION_LABEL[v as MenuLocation])
                                    }
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="header">
                                    {t('settings.menu.header')}
                                </SelectItem>
                                <SelectItem value="footer">
                                    {t('settings.menu.footer')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            {t('settings.menu.parent')}
                        </label>
                        <Select
                            value={parentId || '__none__'}
                            onValueChange={(v) =>
                                setParentId(v === '__none__' ? '' : (v ?? ''))
                            }
                        >
                            <SelectTrigger className="h-11 w-full">
                                <SelectValue>
                                    {(v: string) => {
                                        if (v === '__none__')
                                            return t('settings.menu.noParent');
                                        const p = parentOptions.find(
                                            (x) => x.id === v,
                                        );
                                        return p
                                            ? p.labelEn
                                            : t('settings.menu.noParent');
                                    }}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">
                                    {t('settings.menu.noParent')}
                                </SelectItem>
                                {parentOptions.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.labelEn}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2">
                        <Switch
                            checked={isActive}
                            onCheckedChange={(v) => setIsActive(Boolean(v))}
                            className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
                        />
                        <span className="text-sm font-medium">
                            {t('settings.sections.visible')}
                        </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                        <Switch
                            checked={openInNewTab}
                            onCheckedChange={(v) => setOpenInNewTab(Boolean(v))}
                            className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
                        />
                        <span className="text-sm font-medium">
                            {t('settings.menu.newTab')}
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
                            : t('settings.menu.add')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
