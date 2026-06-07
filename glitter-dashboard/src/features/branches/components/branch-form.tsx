'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {Loader2} from 'lucide-react';
import dynamic from 'next/dynamic';
import {useRouter} from 'next/navigation';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';
import {Button} from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/hooks/use-toast';
import {
    useCreateBranch,
    useUpdateBranch,
} from '@/features/branches/use-branches';
import {getErrorMessage} from '@/lib/api-client';
import {useI18n} from '@/lib/i18n';
import type {Branch, BranchFormValues, BranchStatus} from '@/types/branch';

// Map widget is client-only (Leaflet doesn't SSR)
const MapPicker = dynamic(
    () => import('@/components/ui/map-picker').then((m) => m.MapPicker),
    {ssr: false, loading: () => <MapSkeleton/>},
);

const inputClass =
    'h-11 shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

const textareaClass =
    'shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

const schema = z.object({
    branchCode: z
        .string()
        .min(2, 'branch.validation.codeRequired')
        .max(20, 'branch.validation.codeTooLong'),
    branchNameEn: z
        .string()
        .min(3, 'branch.validation.nameEnRequired')
        .max(100, 'branch.validation.nameTooLong'),
    branchNameKm: z
        .string()
        .min(3, 'branch.validation.nameKmRequired')
        .max(100, 'branch.validation.nameTooLong'),
    streetAddress: z
        .string()
        .min(1, 'branch.validation.addressRequired')
        .max(255, 'branch.validation.addressTooLong'),
    city: z
        .string()
        .min(1, 'branch.validation.cityRequired')
        .max(100, 'branch.validation.cityTooLong'),
    phoneNumber: z
        .string()
        .min(1, 'branch.validation.phoneRequired')
        .max(20, 'branch.validation.phoneTooLong'),
    email: z.string().email('branch.validation.emailInvalid'),
    latitude: z
        .number()
        .min(-90, 'branch.validation.latRange')
        .max(90, 'branch.validation.latRange'),
    longitude: z
        .number()
        .min(-180, 'branch.validation.lngRange')
        .max(180, 'branch.validation.lngRange'),
    openingHours: z.string().optional().nullable(),
    branchStatus: z.enum(['active', 'inactive', 'closed']).optional(),
});

type FormValues = z.infer<typeof schema>;

interface BranchFormProps {
    branch?: Branch | null;
    title: string;
    subtitle?: string;
}

export function BranchForm({branch, title, subtitle}: BranchFormProps) {
    const {t} = useI18n();
    const router = useRouter();
    const {toast} = useToast();
    const isEditMode = Boolean(branch);

    const createMutation = useCreateBranch();
    const updateMutation = useUpdateBranch();
    const isPending = createMutation.isPending || updateMutation.isPending;

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            branchCode: branch?.branchCode ?? '',
            branchNameEn: branch?.branchNameEn ?? '',
            branchNameKm: branch?.branchNameKm ?? '',
            streetAddress: branch?.streetAddress ?? '',
            city: branch?.city ?? '',
            phoneNumber: branch?.phoneNumber ?? '',
            email: branch?.email ?? '',
            latitude: branch?.latitude ?? 11.5564, // Phnom Penh default
            longitude: branch?.longitude ?? 104.9282,
            openingHours: branch?.openingHours ?? '',
            branchStatus: branch?.branchStatus ?? 'active',
        },
    });

    const latitude = form.watch('latitude');
    const longitude = form.watch('longitude');

    function translateError(message: string | undefined): string {
        if (!message) return '';
        if (message.startsWith('branch.validation.')) {
            return t(message as never);
        }
        return message;
    }

    // function handleMapChange(lat: number, lng: number) {
    //     form.setValue('latitude', Number(lat.toFixed(6)), { shouldDirty: true });
    //     form.setValue('longitude', Number(lng.toFixed(6)), { shouldDirty: true });
    // }
    function handleMapChange(
         lat: number,
         lng: number,
         address?: string,
         city?: string
    ) {
        form.setValue('latitude', lat);
        form.setValue('longitude', lng);

        if (address) {
            form.setValue('streetAddress', address);
        }

        if (city) {
            form.setValue('city', city);
        }
    }

    async function onSubmit(values: FormValues) {
        const payload: BranchFormValues = {
            ...values,
            openingHours: values.openingHours?.trim() || null,
            branchStatus: values.branchStatus as BranchStatus,
        };

        try {
            const saved = branch
                ? await updateMutation.mutateAsync({id: branch.id, values: payload})
                : await createMutation.mutateAsync(payload);

            toast({
                title: branch
                    ? t('branch.edit.success')
                    : t('branch.create.success'),
                variant: 'success',
            });
            router.push(`/dashboard/branches/${saved.id}`);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className="flex gap-2 sm:shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isPending}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {isPending && <Loader2 className="mr-2 size-4 animate-spin"/>}
                        {isEditMode ? t('branch.edit.submit') : t('branch.create.submit')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main column */}
                <div className="space-y-6 lg:col-span-2">
                    <FormSection
                        title={t('branch.form.basic')}
                        description={t('branch.form.basicDescription')}
                    >
                        <FieldGroup>
                            <Controller
                                name="branchCode"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="branch-code">
                                            {t('branch.field.code')}
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="branch-code"
                                            placeholder="GS-PHN-TTP"
                                            className={inputClass}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        <FieldDescription>
                                            {t('branch.field.code.help')}
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

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Controller
                                    name="branchNameEn"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="branch-name-en">
                                                {t('branch.field.nameEn')}
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="branch-name-en"
                                                placeholder="Tuol Tompoung Branch"
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
                                    name="branchNameKm"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="branch-name-km">
                                                {t('branch.field.nameKm')}
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="branch-name-km"
                                                placeholder="សាខាទួលទំពូង"
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
                        </FieldGroup>
                    </FormSection>

                    <FormSection
                        title={t('branch.form.contact')}
                        description={t('branch.form.contactDescription')}
                    >
                        <FieldGroup>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Controller
                                    name="phoneNumber"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="branch-phone">
                                                {t('branch.field.phone')}
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="branch-phone"
                                                placeholder="+85515711783"
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
                                    name="email"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="branch-email">
                                                {t('branch.field.email')}
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="branch-email"
                                                type="email"
                                                placeholder="branch@glitter.shop"
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

                            <Controller
                                name="openingHours"
                                control={form.control}
                                render={({field}) => (
                                    <Field>
                                        <FieldLabel htmlFor="branch-hours">
                                            {t('branch.field.openingHours')}
                                        </FieldLabel>
                                        <Textarea
                                            {...field}
                                            value={field.value ?? ''}
                                            id="branch-hours"
                                            rows={2}
                                            placeholder="Mon-Sun: 9AM-8PM"
                                            className={textareaClass}
                                        />
                                        <FieldDescription>
                                            {t('branch.field.openingHours.help')}
                                        </FieldDescription>
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </FormSection>

                    <FormSection
                        title={t('branch.form.address')}
                        description={t('branch.form.addressDescription')}
                    >
                        <FieldGroup>
                            <Controller
                                name="streetAddress"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="branch-street">
                                            {t('branch.field.streetAddress')}
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="branch-street"
                                            placeholder="House 79, St. 432"
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
                                name="city"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="branch-city">
                                            {t('branch.field.city')}
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="branch-city"
                                            placeholder="Phnom Penh"
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
                        </FieldGroup>
                    </FormSection>

                    {/* Map widget */}
                    <FormSection
                        title={t('branch.form.location')}
                        description={t('branch.form.locationDescription')}
                    >
                        <div className="space-y-4">
                            <MapPicker
                                latitude={latitude}
                                longitude={longitude}
                                onChange={handleMapChange}
                                height={360}
                            />

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Controller
                                    name="latitude"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="branch-lat">
                                                {t('branch.field.latitude')}
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="branch-lat"
                                                type="number"
                                                step="0.000001"
                                                value={field.value}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value === '' ? 0 : Number(e.target.value),
                                                    )
                                                }
                                                className={`${inputClass} font-mono`}
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
                                    name="longitude"
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="branch-lng">
                                                {t('branch.field.longitude')}
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="branch-lng"
                                                type="number"
                                                step="0.000001"
                                                value={field.value}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value === '' ? 0 : Number(e.target.value),
                                                    )
                                                }
                                                className={`${inputClass} font-mono`}
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
                        </div>
                    </FormSection>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <FormSection title={t('branch.form.status')}>
                        <Controller
                            name="branchStatus"
                            control={form.control}
                            render={({field}) => (
                                <Field>
                                    <FieldLabel htmlFor="branch-status">
                                        {t('branch.field.status')}
                                    </FieldLabel>
                                    <Select
                                        value={field.value ?? 'active'}
                                        onValueChange={(v) => v && field.onChange(v)}
                                    >
                                        <SelectTrigger id="branch-status" className={inputClass}>
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('branch.status.active')}</SelectItem>
                                            <SelectItem value="inactive">{t('branch.status.inactive')}</SelectItem>
                                            <SelectItem value="closed">{t('branch.status.closed')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        />
                    </FormSection>
                </div>
            </div>
        </form>
    );
}

function FormSection({
                         title,
                         description,
                         children,
                     }: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border bg-card">
            <div className="border-b px-6 py-4">
                <h2 className="text-base font-semibold">{title}</h2>
                {description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                )}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function MapSkeleton() {
    return (
        <div className="flex h-90 w-full items-center justify-center rounded-lg border border-border/60 bg-muted/40">
            <Loader2 className="size-6 animate-spin text-muted-foreground"/>
        </div>
    );
}