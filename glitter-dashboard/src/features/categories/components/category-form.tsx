'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    ImagePlus,
    Loader2,
    RotateCcw,
    Sparkles,
    Trash2,
} from 'lucide-react';
import Image from 'next/image';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { useGenerateCategoryInfo } from '@/features/ai/use-ai';
import {
    useCreateCategory,
    useUpdateCategory,
} from '@/features/categories/use-categories';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import type { Category, CategoryFormValues } from '@/types/category';
import {useToast} from "@/hooks/use-toast";
import { SavingOverlay } from '@/components/feedback/saving-overlay';

const MAX_ICON_SIZE_MB = 2;
const MAX_ICON_SIZE = MAX_ICON_SIZE_MB * 1024 * 1024;

const inputClass =
    'h-11 shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

const TYPE_LABEL_KEYS: Record<string, TranslationKey> = {
    main: 'category.type.main',
    sub: 'category.type.sub',
    featured: 'category.type.featured',
};

const textareaClass =
    'shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

function extractFilename(url: string | null): string | null {
    if (!url) return null;
    const last = url.split('/').pop() ?? url;
    return last.replace(/^\d+-/, '');
}

const formSchema = z.object({
    nameEn: z.string().min(1, 'category.validation.nameEnRequired'),
    nameKm: z.string().min(1, 'category.validation.nameKmRequired'),
    slug: z
        .string()
        .min(1, 'category.validation.slugRequired')
        .regex(/^[a-z0-9-]+$/, 'category.validation.slugFormat'),
    descriptionEn: z.string().optional(),
    descriptionKm: z.string().optional(),
    displayOrder: z.number().int().min(0).optional(),
    categoryType: z.enum(['main', 'sub', 'featured']),
});

type FormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
    category?: Category | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function CategoryForm({
 category,
 onSuccess,
 onCancel,
}: CategoryFormProps) {
    const { t } = useI18n();
    const isEditMode = Boolean(category);

    const { toast } = useToast();

    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const isPending = createMutation.isPending || updateMutation.isPending;

    // AI generation — separate instances per field so each loads independently
    const generateDescEn = useGenerateCategoryInfo();
    const generateDescKm = useGenerateCategoryInfo();

    // Icon state
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(() =>
        getFileUrl(category?.iconUrl ?? null),
    );
    const [existingIconName, setExistingIconName] = useState<string | null>(() =>
        extractFilename(category?.iconUrl ?? null),
    );
    const [isIconRemoved, setIsIconRemoved] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nameEn: category?.nameEn ?? '',
            nameKm: category?.nameKm ?? '',
            slug: category?.slug ?? '',
            descriptionEn: category?.descriptionEn ?? '',
            descriptionKm: category?.descriptionKm ?? '',
            displayOrder: category?.displayOrder ?? 0,
            categoryType: category?.categoryType ?? 'main',
        },
    });

    function processFile(file: File) {
        if (file.size > MAX_ICON_SIZE) {
            toast({
                title: t('common.toast.error'),
                description: `Icon must be less than ${MAX_ICON_SIZE_MB} MB`,
                variant: 'destructive',
            });
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast({
                title: t('common.toast.error'),
                description: 'Please select an image file',
                variant: 'destructive',
            });
            return;
        }
        setIconFile(file);
        setIconPreview(URL.createObjectURL(file));
        setExistingIconName(null);
        setIsIconRemoved(false);
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

    function handleRemoveIcon() {
        setIconFile(null);
        setIconPreview(null);
        setExistingIconName(null);
        if (category?.iconUrl) {
            setIsIconRemoved(true);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleNameEnBlur(name: string) {
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

    async function handleGenerateDescription(language: 'en' | 'km') {
        // Use the appropriate name field as the prompt source
        const name =
            language === 'km'
                ? form.getValues('nameKm').trim()
                : form.getValues('nameEn').trim();

        if (!name) {
            toast({
                title: t('common.toast.warning'),
                description: t('category.ai.nameRequired'),
                variant: 'warning',
            })
            return;
        }

        const mutation = language === 'km' ? generateDescKm : generateDescEn;

        try {
            const result = await mutation.mutateAsync({
                name,
                field: 'description',
                language,
            });
            if (!result.value) {
                toast({
                    title: t('common.toast.error'),
                    description: t('category.ai.notFound'),
                    variant: 'destructive',
                })
                return;
            }
            const fieldName = language === 'km' ? 'descriptionKm' : 'descriptionEn';
            form.setValue(fieldName, result.value, {
                shouldValidate: true,
                shouldDirty: true,
            });
            toast({
                title: t('common.toast.success'),
                description: t('category.ai.success'),
                variant: 'success',
            })
        } catch (error) {
            const message = getErrorMessage(error);
            if (
                message.toLowerCase().includes('unavailable') ||
                message.toLowerCase().includes('high demand')
            ) {
                toast({
                    title: t('common.toast.warning'),
                    description: t('category.ai.busy'),
                    variant: 'warning'
                })
            } else {
                toast({
                    title: t('common.toast.error'),
                    description: message,
                    variant: 'destructive',
                })
            }
        }
    }

    async function onSubmit(values: FormValues) {
        const payload: CategoryFormValues = {
            slug: values.slug,
            nameEn: values.nameEn,
            nameKm: values.nameKm,
            descriptionEn: values.descriptionEn || undefined,
            descriptionKm: values.descriptionKm || undefined,
            displayOrder: values.displayOrder,
            categoryType: values.categoryType,
            icon: iconFile,
            clearIcon: isIconRemoved,
        };

        try {
            if (category) {
                await updateMutation.mutateAsync({ id: category.id, values: payload });
                toast({
                    title: t('common.toast.success'),
                    description: t('category.edit.success'),
                    variant: 'success',
                })
            } else {
                await createMutation.mutateAsync(payload);
                toast({
                    title: t('common.toast.success'),
                    description: t('category.create.success'),
                    variant: 'success',
                })
            }
            onSuccess?.();
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: "destructive"
            })
        }
    }

    function translateError(message: string | undefined): string {
        if (!message) return '';
        if (message.startsWith('category.validation.')) {
            return t(message as never);
        }
        return message;
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
            <SavingOverlay open={isPending} />
            <div className="space-y-5 px-6 pb-2 pt-2">
                {/* Icon */}
                <Field>
                    <FieldLabel>{t('category.field.icon')}</FieldLabel>
                    {iconPreview ? (
                        <div className="relative flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-6">
                            <div className="absolute right-3 top-3 flex gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="size-8 rounded-md bg-background/80 backdrop-blur-sm"
                                    aria-label={t('category.field.icon.replace')}
                                    title={t('category.field.icon.replace')}
                                >
                                    <RotateCcw className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleRemoveIcon}
                                    className="size-8 rounded-md bg-background/80 text-destructive backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={t('category.field.icon.remove')}
                                    title={t('category.field.icon.remove')}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                            <div className="relative size-32 overflow-hidden rounded-lg border bg-background">
                                <Image
                                    src={iconPreview}
                                    alt="Icon preview"
                                    fill
                                    className="object-contain p-2"
                                    unoptimized
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {iconFile?.name ?? existingIconName ?? 'Current icon'}
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
                            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10 transition-all ${
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
                                    Drop your icon here, or
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
                    <FieldDescription>{t('category.field.icon.help')}</FieldDescription>
                </Field>

                <FieldGroup>
                    {/* Name (En + Km) side-by-side on desktop, stacked on mobile */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Controller
                            name="nameEn"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="category-name-en">
                                        {t('category.field.nameEn')}
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="category-name-en"
                                        placeholder="Designer Bags"
                                        className={inputClass}
                                        aria-invalid={fieldState.invalid}
                                        onBlur={(e) => {
                                            field.onBlur();
                                            handleNameEnBlur(e.target.value);
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
                            name="nameKm"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="category-name-km">
                                        {t('category.field.nameKm')}
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="category-name-km"
                                        placeholder="កាបូបលម្អប្រដាប់"
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
                    </div>

                    {/* Slug */}
                    <Controller
                        name="slug"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="category-slug">
                                    {t('category.field.slug')}
                                </FieldLabel>
                                <Input
                                    {...field}
                                    id="category-slug"
                                    placeholder="designer-bags"
                                    className={inputClass}
                                    aria-invalid={fieldState.invalid}
                                />
                                <FieldDescription>
                                    {t('category.field.slug.help')}
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

                    {/* Description English with AI sparkle */}
                    <Controller
                        name="descriptionEn"
                        control={form.control}
                        render={({ field }) => (
                            <Field>
                                <FieldLabel htmlFor="category-desc-en">
                                    {t('category.field.descriptionEn')}
                                </FieldLabel>
                                <div className="relative">
                                    <Textarea
                                        {...field}
                                        id="category-desc-en"
                                        rows={3}
                                        placeholder="Stylish bags and handbags from top brands"
                                        className={`${textareaClass} pr-12`}
                                        disabled={generateDescEn.isPending}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateDescription('en')}
                                        disabled={generateDescEn.isPending}
                                        className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-pink-100 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-pink-500/15 dark:hover:text-pink-300"
                                        aria-label={t('category.ai.generateDescriptionEn')}
                                        title={t('category.ai.generateDescriptionEn')}
                                    >
                                        {generateDescEn.isPending ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="size-4" />
                                        )}
                                    </button>
                                </div>
                            </Field>
                        )}
                    />

                    {/* Description Khmer with AI sparkle */}
                    <Controller
                        name="descriptionKm"
                        control={form.control}
                        render={({ field }) => (
                            <Field>
                                <FieldLabel htmlFor="category-desc-km">
                                    {t('category.field.descriptionKm')}
                                </FieldLabel>
                                <div className="relative">
                                    <Textarea
                                        {...field}
                                        id="category-desc-km"
                                        rows={3}
                                        placeholder="កាបូបស្ទាប់ល្អ និងសម្លៀកបំពាក់ពីម៉ាកលំដាប់កំពូល"
                                        className={`${textareaClass} pr-12`}
                                        disabled={generateDescKm.isPending}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateDescription('km')}
                                        disabled={generateDescKm.isPending}
                                        className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-pink-100 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-pink-500/15 dark:hover:text-pink-300"
                                        aria-label={t('category.ai.generateDescriptionKm')}
                                        title={t('category.ai.generateDescriptionKm')}
                                    >
                                        {generateDescKm.isPending ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="size-4" />
                                        )}
                                    </button>
                                </div>
                            </Field>
                        )}
                    />

                    {/* Display Order + Type side-by-side */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Controller
                            name="displayOrder"
                            control={form.control}
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel htmlFor="category-display-order">
                                        {t('category.field.displayOrder')}
                                    </FieldLabel>
                                    <Input
                                        id="category-display-order"
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        className={inputClass}
                                        value={field.value ?? 0}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            field.onChange(v === '' ? undefined : Number(v));
                                        }}
                                        onBlur={field.onBlur}
                                        name={field.name}
                                        ref={field.ref}
                                    />
                                    <FieldDescription>
                                        {t('category.field.displayOrder.help')}
                                    </FieldDescription>
                                </Field>
                            )}
                        />

                        <Controller
                            name="categoryType"
                            control={form.control}
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel htmlFor="category-type">
                                        {t('category.field.type')}
                                    </FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={(v) => v && field.onChange(v)}
                                    >
                                        <SelectTrigger id="category-type" className={inputClass}>
                                            <SelectValue>
                                                {(value: string) =>
                                                    TYPE_LABEL_KEYS[value]
                                                        ? t(TYPE_LABEL_KEYS[value])
                                                        : value
                                                }
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="main">
                                                {t('category.type.main')}
                                            </SelectItem>
                                            <SelectItem value="sub">
                                                {t('category.type.sub')}
                                            </SelectItem>
                                            <SelectItem value="featured">
                                                {t('category.type.featured')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        />
                    </div>
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
                    {isEditMode
                        ? t('category.edit.submit')
                        : t('category.create.submit')}
                </Button>
            </div>
        </form>
    );
}