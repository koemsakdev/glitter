'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import Image from 'next/image';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    useCreateBrand,
    useUpdateBrand,
} from '@/features/brands/use-brands';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import type { Brand, BrandFormValues } from '@/types/brand';

const MAX_LOGO_SIZE_MB = 2;
const MAX_LOGO_SIZE = MAX_LOGO_SIZE_MB * 1024 * 1024;

const inputClass = 'h-11 shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

function extractFilename(url: string | null): string | null {
    if (!url) return null;
    const last = url.split('/').pop() ?? url;
    return last.replace(/^\d+-/, '');
}

const formSchema = z.object({
    name: z.string().min(1, 'brand.validation.nameRequired'),
    slug: z
        .string()
        .min(1, 'brand.validation.slugRequired')
        .regex(/^[a-z0-9-]+$/, 'brand.validation.slugFormat'),
    websiteUrl: z
        .string()
        .url('brand.validation.urlInvalid')
        .or(z.literal(''))
        .optional(),
    description: z.string().optional(),
    status: z.enum(['active', 'inactive']),
});

type FormValues = z.infer<typeof formSchema>;

interface BrandFormProps {
    brand?: Brand | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function BrandForm({ brand, onSuccess, onCancel }: BrandFormProps) {
    const { t } = useI18n();
    const isEditMode = Boolean(brand);

    const createMutation = useCreateBrand();
    const updateMutation = useUpdateBrand();
    const isPending = createMutation.isPending || updateMutation.isPending;

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(() =>
        getFileUrl(brand?.logoUrl ?? null),
    );
    const [existingLogoName, setExistingLogoName] = useState<string | null>(() =>
        extractFilename(brand?.logoUrl ?? null),
    );
    const [isLogoRemoved, setIsLogoRemoved] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: brand?.name ?? '',
            slug: brand?.slug ?? '',
            websiteUrl: brand?.websiteUrl ?? '',
            description: brand?.description ?? '',
            status: brand?.status ?? 'active',
        },
    });

    function processFile(file: File) {
        if (file.size > MAX_LOGO_SIZE) {
            toast.error(`Logo must be less than ${MAX_LOGO_SIZE_MB} MB`);
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
        setExistingLogoName(null);
        setIsLogoRemoved(false);
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    }

    function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(true);
    }

    function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);
    }

    function handleRemoveLogo() {
        setLogoFile(null);
        setLogoPreview(null);
        setExistingLogoName(null);
        if (brand?.logoUrl) {
            setIsLogoRemoved(true);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleNameBlur(name: string) {
        if (isEditMode) return;
        const currentSlug = form.getValues('slug');
        if (currentSlug) return;
        const suggestedSlug = name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
        if (suggestedSlug) form.setValue('slug', suggestedSlug);
    }

    async function onSubmit(values: FormValues) {
        const payload: BrandFormValues = {
            name: values.name,
            slug: values.slug,
            websiteUrl: values.websiteUrl || undefined,
            description: values.description || undefined,
            status: values.status,
            logo: logoFile,
            clearLogo: isLogoRemoved,
        };

        try {
            if (brand) {
                await updateMutation.mutateAsync({ id: brand.id, values: payload });
                toast.success(t('brand.edit.success'));
            } else {
                await createMutation.mutateAsync(payload);
                toast.success(t('brand.create.success'));
            }
            onSuccess?.();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    }

    function translateError(message: string | undefined): string {
        if (!message) return '';
        if (message.startsWith('brand.validation.')) {
            return t(message as never);
        }
        return message;
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
            <div className="space-y-5 px-6 pb-2 pt-2">
                {/* Logo */}
                <Field>
                    <FieldLabel>{t('brand.field.logo')}</FieldLabel>
                    {logoPreview ? (
                        <div className="relative flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-6">
                            <div className="absolute right-3 top-3 flex gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="size-8 rounded-md bg-background/80 backdrop-blur-sm"
                                    aria-label={t('brand.field.logo.replace')}
                                    title={t('brand.field.logo.replace')}
                                >
                                    <RotateCcw className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleRemoveLogo}
                                    className="size-8 rounded-md bg-background/80 text-destructive backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={t('brand.field.logo.remove')}
                                    title={t('brand.field.logo.remove')}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                            <div className="relative size-32 overflow-hidden rounded-lg border bg-background">
                                <Image
                                    src={logoPreview}
                                    alt="Logo preview"
                                    fill
                                    className="object-contain p-2"
                                    unoptimized
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {logoFile?.name ?? existingLogoName ?? 'Current logo'}
                            </p>
                        </div>
                    ) : (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    fileInputRef.current?.click();
                                }
                            }}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10 transition-all cursor-pointer ${
                                isDragging
                                    ? 'border-pink-400 bg-pink-50/50 dark:border-pink-500 dark:bg-pink-500/5'
                                    : 'border-border bg-muted/20 hover:border-pink-300 hover:bg-pink-50/30 dark:hover:border-pink-700 dark:hover:bg-pink-500/5'
                            }`}
                        >
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <ImagePlus className="size-5 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col items-center gap-1.5">
                                <p className="text-sm text-muted-foreground">
                                    Drop your logo here, or
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    Click to browse
                                </Button>
                            </div>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <FieldDescription>{t('brand.field.logo.help')}</FieldDescription>
                </Field>

                <FieldGroup>
                    <Controller
                        name="name"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="brand-name">
                                    {t('brand.field.name')}
                                </FieldLabel>
                                <Input
                                    {...field}
                                    id="brand-name"
                                    placeholder="Gucci"
                                    className={inputClass}
                                    aria-invalid={fieldState.invalid}
                                    onBlur={(e) => {
                                        field.onBlur();
                                        handleNameBlur(e.target.value);
                                    }}
                                />
                                {fieldState.invalid && fieldState.error && (
                                    <FieldError
                                        errors={[
                                            {
                                                ...fieldState.error,
                                                message: translateError(fieldState.error.message),
                                            },
                                        ]}
                                    />
                                )}
                            </Field>
                        )}
                    />

                    <Controller
                        name="slug"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="brand-slug">
                                    {t('brand.field.slug')}
                                </FieldLabel>
                                <Input
                                    {...field}
                                    id="brand-slug"
                                    placeholder="gucci"
                                    className={inputClass}
                                    aria-invalid={fieldState.invalid}
                                />
                                <FieldDescription>
                                    {t('brand.field.slug.help')}
                                </FieldDescription>
                                {fieldState.invalid && fieldState.error && (
                                    <FieldError
                                        errors={[
                                            {
                                                ...fieldState.error,
                                                message: translateError(fieldState.error.message),
                                            },
                                        ]}
                                    />
                                )}
                            </Field>
                        )}
                    />

                    <Controller
                        name="websiteUrl"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="brand-website">
                                    {t('brand.field.website')}
                                </FieldLabel>
                                <Input
                                    {...field}
                                    id="brand-website"
                                    type="url"
                                    placeholder="https://www.gucci.com"
                                    className={inputClass}
                                    aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && fieldState.error && (
                                    <FieldError
                                        errors={[
                                            {
                                                ...fieldState.error,
                                                message: translateError(fieldState.error.message),
                                            },
                                        ]}
                                    />
                                )}
                            </Field>
                        )}
                    />

                    <Controller
                        name="description"
                        control={form.control}
                        render={({ field }) => (
                            <Field>
                                <FieldLabel htmlFor="brand-description">
                                    {t('brand.field.description')}
                                </FieldLabel>
                                <Textarea
                                    {...field}
                                    id="brand-description"
                                    rows={3}
                                    placeholder="Italian luxury fashion house founded in 1921"
                                    className="shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                                />
                            </Field>
                        )}
                    />

                    <Controller
                        name="status"
                        control={form.control}
                        render={({ field }) => (
                            <Field>
                                <FieldLabel htmlFor="brand-status">
                                    {t('brand.field.status')}
                                </FieldLabel>
                                <Select
                                    value={field.value}
                                    onValueChange={(v) => v && field.onChange(v)}
                                >
                                    <SelectTrigger id="brand-status" className={inputClass}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">
                                            {t('brand.status.active')}
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            {t('brand.status.inactive')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        )}
                    />
                </FieldGroup>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 dark:bg-neutral-800 px-6 py-4">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isPending}
                    >
                        {t('common.cancel')}
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {isEditMode ? t('brand.edit.submit') : t('brand.create.submit')}
                </Button>
            </div>
        </form>
    );
}