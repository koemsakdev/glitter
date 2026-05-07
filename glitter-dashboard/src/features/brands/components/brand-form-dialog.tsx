'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

interface BrandFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    brand?: Brand | null; // null = create, brand = edit
}

export function BrandFormDialog({
                                    open,
                                    onOpenChange,
                                    brand,
                                }: BrandFormDialogProps) {
    const { t } = useI18n();
    const isEditMode = Boolean(brand);

    const createMutation = useCreateBrand();
    const updateMutation = useUpdateBrand();
    const isPending = createMutation.isPending || updateMutation.isPending;

    // Logo state — separate from form because File can't go in zod schema cleanly
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            slug: '',
            websiteUrl: '',
            description: '',
            status: 'active',
        },
    });

    useEffect(() => {
        if (!open) return;

        if (brand) {
            form.reset({
                name: brand.name,
                slug: brand.slug,
                websiteUrl: brand.websiteUrl ?? '',
                description: brand.description ?? '',
                status: brand.status,
            });

            setLogoPreview(getFileUrl(brand.logoUrl));
        } else {
            form.reset({
                name: '',
                slug: '',
                websiteUrl: '',
                description: '',
                status: 'active',
            });
            setLogoPreview(null);
        }
        setLogoFile(null);
    }, [open, brand, form]);

    function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

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
    }

    function handleRemoveLogo() {
        setLogoFile(null);
        setLogoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    // Auto-suggest slug from name (only when creating)
    function handleNameBlur(name: string) {
        if (isEditMode) return;
        const currentSlug = form.getValues('slug');
        if (currentSlug) return; // user already typed something
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
        };

        try {
            if (brand) {
                await updateMutation.mutateAsync({ id: brand.id, values: payload });
                toast.success(t('brand.edit.success'));
            } else {
                await createMutation.mutateAsync(payload);
                toast.success(t('brand.create.success'));
            }
            onOpenChange(false);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    }

    // Translate validation error messages (zod returns translation keys)
    function translateError(message: string | undefined): string {
        if (!message) return '';
        if (message.startsWith('brand.validation.')) {
            return t(message as never);
        }
        return message;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? t('brand.edit.title') : t('brand.create.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode ? brand?.name : t('brand.list.subtitle')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        {/* Logo upload */}
                        <Field>
                            <FieldLabel>{t('brand.field.logo')}</FieldLabel>
                            <div className="flex items-center gap-4">
                                <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40">
                                    {logoPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={logoPreview}
                                            alt="Logo preview"
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <ImagePlus className="size-6 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLogoSelect}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="mr-2 size-4" />
                                            {logoPreview
                                                ? t('brand.field.logo.replace')
                                                : t('brand.field.logo')}
                                        </Button>
                                        {logoPreview && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleRemoveLogo}
                                            >
                                                <X className="mr-2 size-4" />
                                                {t('brand.field.logo.remove')}
                                            </Button>
                                        )}
                                    </div>
                                    <FieldDescription>
                                        {t('brand.field.logo.help')}
                                    </FieldDescription>
                                </div>
                            </div>
                        </Field>

                        {/* Name */}
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

                        {/* Slug */}
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

                        {/* Website URL */}
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

                        {/* Description */}
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
                                    />
                                </Field>
                            )}
                        />

                        {/* Status */}
                        <Controller
                            name="status"
                            control={form.control}
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel htmlFor="brand-status">
                                        {t('brand.field.status')}
                                    </FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger id="brand-status">
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

                    <DialogFooter className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            {isEditMode
                                ? t('brand.edit.submit')
                                : t('brand.create.submit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}