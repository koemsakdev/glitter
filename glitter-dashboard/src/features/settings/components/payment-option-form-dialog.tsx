'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Banknote,
    CircleCheck,
    CircleX,
    CreditCard,
    Eye,
    EyeOff,
    FlaskConical,
    ImageIcon,
    KeyRound,
    Loader2,
    Lock,
    PlugZap,
    Plus,
    QrCode,
    Radio,
    Save,
    ShieldCheck,
    Store,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import {
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import { getFileUrl } from '@/lib/file-url';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { uploadImage } from '@/lib/uploads';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const PAY_CONFIG_KEY = ['payment-config'] as const;

const TYPES: {
    value: PaymentOptionType;
    labelKey: TranslationKey;
    hintKey: TranslationKey;
    icon: LucideIcon;
}[] = [
    {
        value: 'aba_khqr',
        labelKey: 'settings.delivery.typeAbaKhqr',
        hintKey: 'settings.pay.khqrHint',
        icon: QrCode,
    },
    {
        value: 'aba_ecommerce',
        labelKey: 'settings.delivery.typeAbaEcom',
        hintKey: 'settings.pay.ecomHint',
        icon: CreditCard,
    },
    {
        value: 'cod',
        labelKey: 'settings.delivery.typeCod',
        hintKey: 'settings.pay.codHint',
        icon: Banknote,
    },
];

type AbaStatus = 'ready' | 'incomplete' | 'off';

const STATUS_STYLE: Record<AbaStatus, { key: TranslationKey; cls: string }> = {
    ready: {
        key: 'settings.pay.statusReady',
        cls: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
    },
    incomplete: {
        key: 'settings.pay.statusIncomplete',
        cls: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',
    },
    off: {
        key: 'settings.pay.statusOff',
        cls: 'bg-muted text-muted-foreground ring-border',
    },
};

function newId(): string {
    return `pay-${Math.random().toString(36).slice(2, 8)}`;
}

export function PaymentOptionFormDialog({
    open,
    option,
    siblings = [],
    onOpenChange,
    onSave,
}: {
    open: boolean;
    option?: PaymentOption | null;
    /** Other existing payment options (used to enforce one-per-family). */
    siblings?: PaymentOption[];
    onOpenChange: (open: boolean) => void;
    onSave: (option: PaymentOption) => void;
}) {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isEdit = Boolean(option);

    const [nameEn, setNameEn] = useState(option?.nameEn ?? '');
    const [nameKm, setNameKm] = useState(option?.nameKm ?? '');
    const [descEn, setDescEn] = useState(option?.descEn ?? '');
    const [descKm, setDescKm] = useState(option?.descKm ?? '');
    const [iconUrl, setIconUrl] = useState(option?.iconUrl ?? '');
    const [file, setFile] = useState<File | null>(null);
    const [color, setColor] = useState(option?.color || '#015f7a');
    // One ABA option + one COD option max: a family is "taken" if a sibling uses
    // it. Disable types that are already taken by another option.
    const abaTaken = siblings.some((p) => ABA_PAYMENT_TYPES.includes(p.type));
    const codTaken = siblings.some((p) => p.type === 'cod');
    const typeAvailable = (v: PaymentOptionType) =>
        v === 'cod' ? !codTaken : !abaTaken;
    const [type, setType] = useState<PaymentOptionType>(
        option?.type ??
            TYPES.find((ty) => typeAvailable(ty.value))?.value ??
            'aba_khqr',
    );
    const [enabled, setEnabled] = useState(option?.enabled ?? true);
    // Confirmation that the merchant has ABA eCommerce enabled (required for
    // aba_ecommerce). Pre-confirmed when editing an existing eCommerce option.
    const [ecomConfirmed, setEcomConfirmed] = useState(
        option?.type === 'aba_ecommerce',
    );
    const [saving, setSaving] = useState(false);

    const isAba = ABA_PAYMENT_TYPES.includes(type);

    // Private ABA credentials — one shared config (never in the public blob).
    const { data: cfg, isLoading: cfgLoading } = useQuery({
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
    if (cfg && !credHydrated) {
        setCredHydrated(true);
        setCredLive(cfg.enabled);
        setSandbox(cfg.sandbox);
        setMerchantId(cfg.merchantId);
        setWebhookUrl(cfg.webhookUrl);
        setRsaPublicKey(cfg.rsaPublicKey);
        setApiKey(cfg.apiKey);
        setRsaPrivateKey(cfg.rsaPrivateKey);
    }

    // Live preview of the picked logo (before it's uploaded).
    const objectUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    );
    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);
    const logoSrc = objectUrl ?? getFileUrl(iconUrl);

    const hasApiKey = Boolean(apiKey.trim()) || Boolean(cfg?.hasApiKey);
    const hasPrivate =
        Boolean(rsaPrivateKey.trim()) || Boolean(cfg?.hasRsaPrivateKey);
    const abaStatus: AbaStatus = !credLive
        ? 'off'
        : merchantId.trim() && hasApiKey && hasPrivate
          ? 'ready'
          : 'incomplete';

    const previewName =
        (language === 'km' ? nameKm || nameEn : nameEn || nameKm) ||
        t('settings.pay.untitled');
    const previewDesc = language === 'km' ? descKm || descEn : descEn || descKm;

    async function handleSave() {
        if (!nameEn.trim() && !nameKm.trim()) {
            toast({
                title: t('settings.delivery.nameRequired'),
                variant: 'destructive',
            });
            return;
        }
        // One-per-family guard (the type picker already disables taken types,
        // but re-check in case the option's own type changed).
        if (!typeAvailable(type)) {
            toast({
                title: t('settings.delivery.onePerFamily'),
                variant: 'destructive',
            });
            return;
        }
        // ABA E-Commerce requires the merchant to have hosted checkout enabled.
        if (type === 'aba_ecommerce' && !ecomConfirmed) {
            toast({
                title: t('settings.delivery.ecomRequired'),
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

    const typeMeta = TYPES.find((ty) => ty.value === type);

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={(o) => !saving && onOpenChange(o)}
            className="sm:max-w-2xl"
        >
            <div className="flex max-h-[90vh] flex-col">
                {/* Header + live checkout preview */}
                <div className="space-y-4 border-b px-6 pb-5 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit
                            ? t('settings.delivery.editPayment')
                            : t('settings.delivery.addPayment')}
                    </h2>
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('settings.pay.preview')}
                        </p>
                        <div
                            className={cn(
                                'flex items-center gap-3 rounded-xl border bg-card p-3 transition-opacity',
                                !enabled && 'opacity-60',
                            )}
                            style={{ borderLeft: `4px solid ${color}` }}
                        >
                            <div
                                className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                                style={{ backgroundColor: `${color}1a` }}
                            >
                                {logoSrc ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={logoSrc}
                                        alt=""
                                        className="size-full object-contain p-1"
                                    />
                                ) : typeMeta ? (
                                    <typeMeta.icon
                                        className="size-5"
                                        style={{ color }}
                                    />
                                ) : (
                                    <ImageIcon className="size-5 text-muted-foreground" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">
                                    {previewName}
                                </p>
                                {previewDesc && (
                                    <p className="truncate text-xs text-muted-foreground">
                                        {previewDesc}
                                    </p>
                                )}
                            </div>
                            <span
                                className={cn(
                                    'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                                    enabled
                                        ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300'
                                        : 'bg-muted text-muted-foreground ring-border',
                                )}
                            >
                                {enabled
                                    ? t('settings.pay.visible')
                                    : t('settings.pay.hidden')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {/* 1 — Display */}
                    <Section
                        icon={Store}
                        title={t('settings.pay.secDisplay')}
                        hint={t('settings.pay.secDisplayHint')}
                    >
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
                                        onChange={(e) =>
                                            setColor(e.target.value)
                                        }
                                        className="size-11 shrink-0 cursor-pointer rounded-lg border bg-background p-1"
                                    />
                                    <Input
                                        value={color}
                                        onChange={(e) =>
                                            setColor(e.target.value)
                                        }
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
                    </Section>

                    {/* 2 — Method */}
                    <Section
                        icon={Wallet}
                        title={t('settings.pay.secMethod')}
                        hint={t('settings.pay.secMethodHint')}
                    >
                        <div
                            role="radiogroup"
                            aria-label={t('settings.delivery.paymentType')}
                            className="grid gap-2 sm:grid-cols-3"
                        >
                            {TYPES.map((ty) => {
                                const taken =
                                    !typeAvailable(ty.value) &&
                                    ty.value !== option?.type;
                                const active = type === ty.value;
                                return (
                                    <button
                                        key={ty.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        disabled={taken}
                                        onClick={() => setType(ty.value)}
                                        className={cn(
                                            'relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
                                            'disabled:cursor-not-allowed disabled:opacity-50',
                                            active
                                                ? 'border-pink-400 bg-pink-50/60 ring-1 ring-pink-400 dark:border-pink-700 dark:bg-pink-500/10 dark:ring-pink-700'
                                                : 'hover:border-foreground/20 hover:bg-muted/40',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-8 items-center justify-center rounded-lg',
                                                active
                                                    ? 'bg-pink-500 text-white dark:bg-pink-700'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <ty.icon className="size-4" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold">
                                                {t(ty.labelKey)}
                                            </span>
                                            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                                                {taken
                                                    ? t(
                                                          'settings.delivery.typeTaken',
                                                      )
                                                    : t(ty.hintKey)}
                                            </span>
                                        </span>
                                        {active && (
                                            <CircleCheck className="absolute right-2.5 top-2.5 size-4 text-pink-500 dark:text-pink-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* ABA E-Commerce requires a merchant with hosted checkout */}
                        {type === 'aba_ecommerce' && (
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                                <input
                                    type="checkbox"
                                    checked={ecomConfirmed}
                                    onChange={(e) =>
                                        setEcomConfirmed(e.target.checked)
                                    }
                                    className="mt-0.5 size-4 shrink-0 accent-amber-600"
                                />
                                <span className="text-sm">
                                    <span className="block font-medium text-amber-800 dark:text-amber-200">
                                        {t('settings.delivery.ecomConfirm')}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-amber-700/80 dark:text-amber-300/70">
                                        {t('settings.delivery.ecomConfirmHint')}
                                    </span>
                                </span>
                            </label>
                        )}

                        <ToggleRow
                            title={t('settings.pay.showAtCheckout')}
                            hint={t('settings.delivery.paymentsNote')}
                            checked={enabled}
                            onChange={setEnabled}
                        />
                    </Section>

                    {/* 3 — ABA account (only for ABA-based payment types) */}
                    {isAba && (
                        <Section
                            icon={ShieldCheck}
                            title={t('settings.delivery.abaSection')}
                            hint={t('settings.delivery.abaSectionHint')}
                            aside={
                                cfgLoading ? (
                                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <span
                                        className={cn(
                                            'rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                                            STATUS_STYLE[abaStatus].cls,
                                        )}
                                    >
                                        {t(STATUS_STYLE[abaStatus].key)}
                                    </span>
                                )
                            }
                        >
                            <ToggleRow
                                title={t('settings.aba.enable')}
                                hint={t('settings.aba.enableHint')}
                                checked={credLive}
                                onChange={setCredLive}
                            />

                            {/* Environment — segmented Sandbox / Production */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">
                                    {t('settings.pay.env')}
                                </p>
                                <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                                    {[
                                        {
                                            value: true,
                                            icon: FlaskConical,
                                            label: t('settings.pay.envSandbox'),
                                        },
                                        {
                                            value: false,
                                            icon: Radio,
                                            label: t(
                                                'settings.pay.envProduction',
                                            ),
                                        },
                                    ].map((env) => (
                                        <button
                                            key={String(env.value)}
                                            type="button"
                                            aria-pressed={sandbox === env.value}
                                            onClick={() =>
                                                setSandbox(env.value)
                                            }
                                            className={cn(
                                                'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                                                sandbox === env.value
                                                    ? 'bg-background text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            <env.icon
                                                className={cn(
                                                    'size-4',
                                                    sandbox === env.value &&
                                                        (env.value
                                                            ? 'text-sky-500'
                                                            : 'text-emerald-500'),
                                                )}
                                            />
                                            {env.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {sandbox
                                        ? t('settings.pay.envSandboxHint')
                                        : t('settings.pay.envProductionHint')}
                                </p>
                            </div>

                            {/* Keys */}
                            <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                                <p className="flex items-center gap-2 text-sm font-semibold">
                                    <KeyRound className="size-4 text-muted-foreground" />
                                    {t('settings.pay.keys')}
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2">
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
                                        <FieldLabel
                                            htmlFor="aba-key"
                                            className="flex items-center justify-between gap-2"
                                        >
                                            {t('settings.aba.apiKey')}
                                            <SecretChip set={hasApiKey} />
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
                                        <FieldLabel
                                            htmlFor="aba-rsa-priv"
                                            className="flex items-center justify-between gap-2"
                                        >
                                            {t('settings.aba.rsaPrivate')}
                                            <SecretChip set={hasPrivate} />
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
                                                    setShowRsaPrivate((s) => !s)
                                                }
                                                label={t(
                                                    'settings.aba.toggleSecret',
                                                )}
                                                className="top-2"
                                            />
                                        </div>
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
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Lock className="size-3" />
                                    {t('settings.pay.secureNote')}
                                </p>
                            </div>

                            <AbaConnectionTest />
                        </Section>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
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
                        className="min-w-36 bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {saving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isEdit ? (
                            <Save className="size-4" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        {saving
                            ? t('common.saving')
                            : isEdit
                              ? t('settings.saveChanges')
                              : t('settings.delivery.addPayment')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}

/** A titled card that groups one step of the form. */
function Section({
    icon: Icon,
    title,
    hint,
    aside,
    children,
}: {
    icon: LucideIcon;
    title: string;
    hint?: string;
    aside?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border bg-card">
            <div className="flex items-start gap-3 border-b px-4 py-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    {hint && (
                        <p className="text-xs text-muted-foreground">{hint}</p>
                    )}
                </div>
                {aside && <div className="shrink-0 self-center">{aside}</div>}
            </div>
            <div className="space-y-5 p-4">{children}</div>
        </section>
    );
}

/** A label + hint on the left, a switch on the right. */
function ToggleRow({
    title,
    hint,
    checked,
    onChange,
}: {
    title: string;
    hint?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30">
            <span className="min-w-0">
                <span className="block text-sm font-medium">{title}</span>
                {hint && (
                    <span className="block text-xs text-muted-foreground">
                        {hint}
                    </span>
                )}
            </span>
            <Switch
                checked={checked}
                onCheckedChange={(v) => onChange(Boolean(v))}
            />
        </label>
    );
}

/** Tiny "Saved" / "Not set yet" marker next to a secret field's label. */
function SecretChip({ set }: { set: boolean }) {
    const { t } = useI18n();
    return set ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CircleCheck className="size-3" />
            {t('settings.aba.secretSaved').replace(/[.។]$/, '')}
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <CircleX className="size-3" />
            {t('settings.aba.secretMissing').replace(/[.។]$/, '')}
        </span>
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
            {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
    );
}

/** Live check of the saved ABA settings: credentials + each PayWay service. */
function AbaConnectionTest() {
    const { t } = useI18n();
    const test = useMutation({ mutationFn: paymentConfigApi.test });
    const label: Record<string, TranslationKey> = {
        credentials: 'settings.aba.test.credentials',
        khqr_api: 'settings.aba.test.khqr',
        hosted_checkout: 'settings.aba.test.hosted',
    };
    return (
        <div className="space-y-3 rounded-xl border border-dashed p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold">
                        {t('settings.aba.test.title')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t('settings.aba.test.hint')}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={test.isPending}
                    onClick={() => test.mutate()}
                >
                    {test.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <PlugZap className="size-4" />
                    )}
                    {t('settings.aba.test.run')}
                </Button>
            </div>
            {test.isError && (
                <p className="text-sm text-destructive">
                    {getErrorMessage(test.error)}
                </p>
            )}
            {test.data && (
                <ul className="space-y-2">
                    {test.data.checks.map((c) => (
                        <li
                            key={c.id}
                            className="flex items-start gap-2.5 text-sm"
                        >
                            {c.ok ? (
                                <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" />
                            )}
                            <span className="min-w-0">
                                <span className="font-medium">
                                    {t(label[c.id])}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    {c.detail}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
