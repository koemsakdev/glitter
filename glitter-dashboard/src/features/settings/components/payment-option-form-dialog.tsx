'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2, Plus, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { IconUploader } from '@/features/settings/components/icon-uploader';
import { BilingualField } from '@/features/settings/components/settings-shared';
import {
    paymentConfigApi,
    type PaymentConfigInput,
} from '@/features/settings/payment-config-api';
import {
    ABA_PAYMENT_TYPES,
    type PaymentOption,
    type PaymentOptionType,
} from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { uploadImage } from '@/lib/uploads';
import { useToast } from '@/hooks/use-toast';

const PAY_CONFIG_KEY = ['payment-config'] as const;

const TYPES: { value: PaymentOptionType; labelKey: TranslationKey }[] = [
    { value: 'aba_khqr', labelKey: 'settings.delivery.typeAbaKhqr' },
    { value: 'khqr', labelKey: 'settings.delivery.typeKhqrOnly' },
    { value: 'cod', labelKey: 'settings.delivery.typeCod' },
];

function newId(): string {
    return `pay-${Math.random().toString(36).slice(2, 8)}`;
}

export function PaymentOptionFormDialog({
    open,
    option,
    onOpenChange,
    onSave,
}: {
    open: boolean;
    option?: PaymentOption | null;
    onOpenChange: (open: boolean) => void;
    onSave: (option: PaymentOption) => void;
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isEdit = Boolean(option);

    const [nameEn, setNameEn] = useState(option?.nameEn ?? '');
    const [nameKm, setNameKm] = useState(option?.nameKm ?? '');
    const [descEn, setDescEn] = useState(option?.descEn ?? '');
    const [descKm, setDescKm] = useState(option?.descKm ?? '');
    const [iconUrl, setIconUrl] = useState(option?.iconUrl ?? '');
    const [file, setFile] = useState<File | null>(null);
    const [color, setColor] = useState(option?.color || '#00529C');
    const [type, setType] = useState<PaymentOptionType>(
        option?.type ?? 'aba_khqr',
    );
    const [enabled, setEnabled] = useState(option?.enabled ?? true);
    const [saving, setSaving] = useState(false);

    const isAba = ABA_PAYMENT_TYPES.includes(type);

    // Private ABA credentials — one shared config (never in the public blob).
    const { data: cfg } = useQuery({
        queryKey: PAY_CONFIG_KEY,
        queryFn: paymentConfigApi.get,
        enabled: open,
    });
    const [credLive, setCredLive] = useState(false);
    const [sandbox, setSandbox] = useState(true);
    const [merchantId, setMerchantId] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [rsaPublicKey, setRsaPublicKey] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [rsaPrivateKey, setRsaPrivateKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [showRsaPrivate, setShowRsaPrivate] = useState(false);
    const [credHydrated, setCredHydrated] = useState(false);

    // Populate the credential fields (incl. secrets) once the private config
    // has loaded, so the admin can review/edit their existing keys.
    useEffect(() => {
        if (!cfg || credHydrated) return;
        setCredLive(cfg.enabled);
        setSandbox(cfg.sandbox);
        setMerchantId(cfg.merchantId);
        setWebhookUrl(cfg.webhookUrl);
        setRsaPublicKey(cfg.rsaPublicKey);
        setApiKey(cfg.apiKey);
        setRsaPrivateKey(cfg.rsaPrivateKey);
        setCredHydrated(true);
    }, [cfg, credHydrated]);

    function typeLabel(v: string): string {
        const found = TYPES.find((ty) => ty.value === v);
        return found ? t(found.labelKey) : v;
    }

    async function handleSave() {
        if (!nameEn.trim() && !nameKm.trim()) {
            toast({
                title: t('settings.delivery.nameRequired'),
                variant: 'destructive',
            });
            return;
        }
        setSaving(true);
        try {
            const finalIcon = file ? (await uploadImage(file, 0)).url : iconUrl;

            // For ABA-based options, persist the private credentials too.
            if (isAba) {
                const input: PaymentConfigInput = {
                    enabled: credLive,
                    sandbox,
                    merchantId: merchantId.trim(),
                    webhookUrl: webhookUrl.trim(),
                    rsaPublicKey,
                };
                if (apiKey.trim()) input.apiKey = apiKey.trim();
                if (rsaPrivateKey.trim())
                    input.rsaPrivateKey = rsaPrivateKey.trim();
                const fresh = await paymentConfigApi.update(input);
                queryClient.setQueryData(PAY_CONFIG_KEY, fresh);
            }

            onSave({
                id: option?.id ?? newId(),
                nameEn: nameEn.trim(),
                nameKm: nameKm.trim(),
                descEn: descEn.trim(),
                descKm: descKm.trim(),
                iconUrl: finalIcon,
                color,
                type,
                enabled,
            });
        } catch (error) {
            toast({
                title: t('settings.couldNotSave'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
            setSaving(false);
        }
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-2xl"
        >
            <div className="flex max-h-[90vh] flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit
                            ? t('settings.delivery.editPayment')
                            : t('settings.delivery.addPayment')}
                    </h2>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-2">
                    {/* Logo + accent colour */}
                    <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                        <IconUploader
                            value={iconUrl}
                            file={file}
                            onPick={(f) => {
                                setFile(f);
                                if (!f) setIconUrl('');
                            }}
                            label={t('settings.delivery.paymentLogo')}
                            hint={t('settings.delivery.paymentLogoHint')}
                        />
                        <Field>
                            <FieldLabel htmlFor="pay-color">
                                {t('settings.delivery.paymentColor')}
                            </FieldLabel>
                            <div className="flex items-center gap-2">
                                <input
                                    id="pay-color"
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="size-11 shrink-0 cursor-pointer rounded-lg border bg-background p-1"
                                />
                                <Input
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-28 font-mono uppercase"
                                    maxLength={7}
                                />
                            </div>
                            <FieldDescription>
                                {t('settings.delivery.paymentColorHint')}
                            </FieldDescription>
                        </Field>
                    </div>

                    <BilingualField
                        label={t('settings.delivery.paymentName')}
                        en={nameEn}
                        km={nameKm}
                        onEn={setNameEn}
                        onKm={setNameKm}
                    />
                    <BilingualField
                        label={t('settings.delivery.paymentDesc')}
                        en={descEn}
                        km={descKm}
                        onEn={setDescEn}
                        onKm={setDescKm}
                        maxLength={80}
                    />

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="pay-type">
                                {t('settings.delivery.paymentType')}
                            </FieldLabel>
                            <Select
                                value={type}
                                onValueChange={(v) =>
                                    setType(v as PaymentOptionType)
                                }
                            >
                                <SelectTrigger id="pay-type" className="h-11 w-full">
                                    <SelectValue>
                                        {(val: string) => typeLabel(val)}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {TYPES.map((ty) => (
                                        <SelectItem
                                            key={ty.value}
                                            value={ty.value}
                                        >
                                            {t(ty.labelKey)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="pay-visible">
                                {t('settings.sections.visible')}
                            </FieldLabel>
                            <label className="flex h-11 cursor-pointer items-center gap-2">
                                <Switch
                                    id="pay-visible"
                                    checked={enabled}
                                    onCheckedChange={(v) =>
                                        setEnabled(Boolean(v))
                                    }
                                />
                                <span className="text-sm text-muted-foreground">
                                    {t('settings.delivery.paymentsNote')}
                                </span>
                            </label>
                        </Field>
                    </div>

                    {/* ABA credentials — only for ABA-based payment types */}
                    {isAba && (
                        <div className="rounded-xl border bg-muted/30 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <ShieldCheck className="size-4 text-emerald-500" />
                                <div>
                                    <h3 className="text-sm font-semibold">
                                        {t('settings.delivery.abaSection')}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {t('settings.delivery.abaSectionHint')}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex cursor-pointer items-center justify-between gap-4">
                                    <span className="min-w-0">
                                        <span className="block text-sm font-medium">
                                            {t('settings.aba.enable')}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            {t('settings.aba.enableHint')}
                                        </span>
                                    </span>
                                    <Switch
                                        checked={credLive}
                                        onCheckedChange={(v) =>
                                            setCredLive(Boolean(v))
                                        }
                                    />
                                </label>
                                <label className="flex cursor-pointer items-center justify-between gap-4">
                                    <span className="min-w-0">
                                        <span className="block text-sm font-medium">
                                            {t('settings.aba.sandbox')}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            {t('settings.aba.sandboxHint')}
                                        </span>
                                    </span>
                                    <Switch
                                        checked={sandbox}
                                        onCheckedChange={(v) =>
                                            setSandbox(Boolean(v))
                                        }
                                    />
                                </label>

                                <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                                    <Field>
                                        <FieldLabel htmlFor="aba-merchant">
                                            {t('settings.aba.merchantId')}
                                        </FieldLabel>
                                        <Input
                                            id="aba-merchant"
                                            value={merchantId}
                                            onChange={(e) =>
                                                setMerchantId(e.target.value)
                                            }
                                            placeholder="ec476655"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="aba-key">
                                            {t('settings.aba.apiKey')}
                                        </FieldLabel>
                                        <div className="relative">
                                            <Input
                                                id="aba-key"
                                                type={
                                                    showApiKey
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                autoComplete="off"
                                                className="pr-10 font-mono"
                                                value={apiKey}
                                                onChange={(e) =>
                                                    setApiKey(e.target.value)
                                                }
                                                placeholder="0dcd6d71…"
                                            />
                                            <EyeButton
                                                shown={showApiKey}
                                                onToggle={() =>
                                                    setShowApiKey((s) => !s)
                                                }
                                                label={t(
                                                    'settings.aba.toggleSecret',
                                                )}
                                            />
                                        </div>
                                        <FieldDescription>
                                            {cfg?.hasApiKey
                                                ? t('settings.aba.secretSaved')
                                                : t(
                                                      'settings.aba.secretMissing',
                                                  )}
                                        </FieldDescription>
                                    </Field>
                                    <Field className="sm:col-span-2">
                                        <FieldLabel htmlFor="aba-rsa-pub">
                                            {t('settings.aba.rsaPublic')}
                                        </FieldLabel>
                                        <Textarea
                                            id="aba-rsa-pub"
                                            rows={2}
                                            className="font-mono text-xs"
                                            value={rsaPublicKey}
                                            onChange={(e) =>
                                                setRsaPublicKey(e.target.value)
                                            }
                                            placeholder="-----BEGIN PUBLIC KEY-----"
                                        />
                                    </Field>
                                    <Field className="sm:col-span-2">
                                        <FieldLabel htmlFor="aba-rsa-priv">
                                            {t('settings.aba.rsaPrivate')}
                                        </FieldLabel>
                                        <div className="relative">
                                            <Textarea
                                                id="aba-rsa-priv"
                                                rows={3}
                                                autoComplete="off"
                                                className="pr-10 font-mono text-xs"
                                                style={
                                                    showRsaPrivate
                                                        ? undefined
                                                        : ({
                                                              WebkitTextSecurity:
                                                                  'disc',
                                                          } as CSSProperties)
                                                }
                                                value={rsaPrivateKey}
                                                onChange={(e) =>
                                                    setRsaPrivateKey(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="-----BEGIN RSA PRIVATE KEY-----"
                                            />
                                            <EyeButton
                                                shown={showRsaPrivate}
                                                onToggle={() =>
                                                    setShowRsaPrivate(
                                                        (s) => !s,
                                                    )
                                                }
                                                label={t(
                                                    'settings.aba.toggleSecret',
                                                )}
                                                className="top-2"
                                            />
                                        </div>
                                        <FieldDescription>
                                            {cfg?.hasRsaPrivateKey
                                                ? t('settings.aba.secretSaved')
                                                : t(
                                                      'settings.aba.secretMissing',
                                                  )}
                                        </FieldDescription>
                                    </Field>
                                    <Field className="sm:col-span-2">
                                        <FieldLabel htmlFor="aba-webhook">
                                            {t('settings.aba.webhook')}
                                        </FieldLabel>
                                        <Input
                                            id="aba-webhook"
                                            value={webhookUrl}
                                            onChange={(e) =>
                                                setWebhookUrl(e.target.value)
                                            }
                                            placeholder="https://your-domain.com/api/payments/aba/webhook"
                                        />
                                        <FieldDescription>
                                            {t('settings.aba.webhookHint')}
                                        </FieldDescription>
                                    </Field>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {saving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isEdit ? (
                            <Save className="size-4" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        {t('settings.saveChanges')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}

/** Eye toggle overlaid on a secret input/textarea to reveal or hide its value. */
function EyeButton({
    shown,
    onToggle,
    label,
    className,
}: {
    shown: boolean;
    onToggle: () => void;
    label: string;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={label}
            title={label}
            className={`absolute right-2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground ${
                className ?? 'top-1/2 -translate-y-1/2'
            }`}
        >
            {shown ? (
                <EyeOff className="size-4" />
            ) : (
                <Eye className="size-4" />
            )}
        </button>
    );
}
