'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Banknote,
    Check,
    CircleCheck,
    CircleX,
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
    ScanLine,
    Radio,
    Save,
    ShieldCheck,
    Store,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { BilingualField } from '@/features/settings/components/settings-shared';
import { LogoPicker } from '@/features/settings/components/logo-picker';
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
import { ImageCropDialog } from '@/components/ui/image-crop-dialog';

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
        value: 'cod',
        labelKey: 'settings.delivery.typeCod',
        hintKey: 'settings.pay.codHint',
        icon: Banknote,
    },
    {
        value: 'manual_qr',
        labelKey: 'settings.delivery.typeManualQr',
        hintKey: 'settings.pay.manualQrHint',
        icon: ScanLine,
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
    // Bank QR options are unlimited (one per bank); ABA and Cash, one each.
    const typeAvailable = (v: PaymentOptionType) =>
        v === 'manual_qr' ? true : v === 'cod' ? !codTaken : !abaTaken;
    // There is one ABA option now (checkout picks ABA's embedded popup or our
    // KHQR dialog by itself), so an older "E-Commerce" option edits as ABA.
    const [type, setType] = useState<PaymentOptionType>(
        (option?.type === 'aba_ecommerce' ? 'aba_khqr' : option?.type) ??
            TYPES.find((ty) => typeAvailable(ty.value))?.value ??
            'aba_khqr',
    );
    const [enabled, setEnabled] = useState(option?.enabled ?? true);
    const [saving, setSaving] = useState(false);

    const isAba = ABA_PAYMENT_TYPES.includes(type);
    const isManual = type === 'manual_qr';
    // Bank QR details (manual_qr).
    const [qrImageUrl, setQrImageUrl] = useState(option?.qrImageUrl ?? '');
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [accountName, setAccountName] = useState(option?.accountName ?? '');
    const [accountNumber, setAccountNumber] = useState(
        option?.accountNumber ?? '',
    );

    // Private ABA credentials — one shared config (never in the public blob).
    const { data: cfg, isLoading: cfgLoading } = useQuery({
        queryKey: PAY_CONFIG_KEY,
        queryFn: paymentConfigApi.get,
        enabled: open,
    });
    const [credLive, setCredLive] = useState(false);
    const [sandbox, setSandbox] = useState(true);
    // ABA only needs the merchant ID + API key (the hash key) for checkout,
    // KHQR and status checks — nothing else is asked.
    const [merchantId, setMerchantId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [credHydrated, setCredHydrated] = useState(false);

    // Populate the credential fields (incl. secrets) once the private config
    // has loaded, so the admin can review/edit their existing keys.
    if (cfg && !credHydrated) {
        setCredHydrated(true);
        setCredLive(cfg.enabled);
        setSandbox(cfg.sandbox);
        setMerchantId(cfg.merchantId);
        setApiKey(cfg.apiKey);
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
    const abaStatus: AbaStatus = !credLive
        ? 'off'
        : merchantId.trim() && hasApiKey
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
        if (isManual && !qrFile && !qrImageUrl) {
            toast({
                title: t('settings.pay.qrRequired'),
                variant: 'destructive',
            });
            return;
        }
        setSaving(true);
        try {
            const finalIcon = file ? (await uploadImage(file, 0)).url : iconUrl;
            const finalQr = isManual
                ? qrFile
                    ? (await uploadImage(qrFile, 0)).url
                    : qrImageUrl
                : '';

            // For ABA-based options, persist the private credentials too.
            if (isAba) {
                const input: PaymentConfigInput = {
                    enabled: credLive,
                    sandbox,
                    merchantId: merchantId.trim(),
                };
                if (apiKey.trim()) input.apiKey = apiKey.trim();
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
                ...(isManual
                    ? {
                          qrImageUrl: finalQr,
                          accountName: accountName.trim(),
                          accountNumber: accountNumber.trim(),
                      }
                    : {}),
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
            {/* Fit inside the modal (85vh on desktop) / bottom sheet (screen
                minus 6rem on phones): only the middle scrolls, so the title
                and the Save / Cancel bar always stay in view. */}
            <div className="flex max-h-[calc(100dvh-7.5rem)] flex-col min-[1027px]:max-h-[85vh]">
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
                        <div className="grid gap-5 sm:grid-cols-2">
                            <LogoPicker
                                value={iconUrl}
                                file={file}
                                onPick={(f) => {
                                    setFile(f);
                                    if (!f) setIconUrl('');
                                }}
                                onChooseUrl={(url) => {
                                    setFile(null);
                                    setIconUrl(url);
                                }}
                                label={t('settings.delivery.paymentLogo')}
                                hint={t('settings.pay.logoHint')}
                            />
                            <ColorPicker value={color} onChange={setColor} />
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
                                    ty.value !== option?.type &&
                                    !(
                                        option &&
                                        ABA_PAYMENT_TYPES.includes(
                                            option.type,
                                        ) &&
                                        ty.value === 'aba_khqr'
                                    );
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

                        <ToggleRow
                            title={t('settings.pay.showAtCheckout')}
                            hint={t('settings.delivery.paymentsNote')}
                            checked={enabled}
                            onChange={setEnabled}
                        />
                    </Section>

                    {/* 3 — Bank QR details (manual payment) */}
                    {isManual && (
                        <Section
                            icon={ScanLine}
                            title={t('settings.pay.manualSection')}
                            hint={t('settings.pay.manualSectionHint')}
                        >
                            <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
                                <QrPicker
                                    value={qrImageUrl}
                                    file={qrFile}
                                    onPick={(f) => {
                                        setQrFile(f);
                                        if (!f) setQrImageUrl('');
                                    }}
                                />
                                <div className="space-y-4">
                                    <Field>
                                        <FieldLabel htmlFor="mq-name">
                                            {t('settings.pay.accountName')}
                                        </FieldLabel>
                                        <Input
                                            id="mq-name"
                                            value={accountName}
                                            onChange={(e) =>
                                                setAccountName(e.target.value)
                                            }
                                            placeholder="GLITTER SHOP"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="mq-number">
                                            {t('settings.pay.accountNumber')}
                                        </FieldLabel>
                                        <Input
                                            id="mq-number"
                                            value={accountNumber}
                                            onChange={(e) =>
                                                setAccountNumber(e.target.value)
                                            }
                                            placeholder="000 123 456"
                                            className="font-mono"
                                        />
                                    </Field>
                                    <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                        {t('settings.pay.manualHowItWorks')}
                                    </p>
                                </div>
                            </div>
                        </Section>
                    )}

                    {/* 4 — ABA account (only for ABA-based payment types) */}
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
                                <div>
                                    <p className="flex items-center gap-2 text-sm font-semibold">
                                        <KeyRound className="size-4 text-muted-foreground" />
                                        {t('settings.pay.keys')}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {t('settings.pay.keysHint')}
                                    </p>
                                </div>
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

const PAY_COLORS = [
    '#015f7a',
    '#e1232e',
    '#16a34a',
    '#2563eb',
    '#7c3aed',
    '#ec4899',
    '#f59e0b',
    '#18181b',
];

/** Accent colour: preset swatches, a custom swatch and the hex value. */
function ColorPicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const { t } = useI18n();
    const current = value.toLowerCase();
    const custom = !PAY_COLORS.includes(current);
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">
                {t('settings.delivery.paymentColor')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
                {PAY_COLORS.map((c) => (
                    <button
                        key={c}
                        type="button"
                        aria-label={c}
                        onClick={() => onChange(c)}
                        className={cn(
                            'flex size-7 items-center justify-center rounded-full ring-1 ring-black/10 transition-transform hover:scale-110',
                            current === c &&
                                'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                        )}
                        style={{ backgroundColor: c }}
                    >
                        {current === c && (
                            <Check className="size-3.5 text-white" />
                        )}
                    </button>
                ))}
                {/* Any other colour: the swatch opens the system picker */}
                <label
                    className={cn(
                        'relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10',
                        custom &&
                            'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                    )}
                    style={{
                        background: custom
                            ? value
                            : 'conic-gradient(#f43f5e,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef,#f43f5e)',
                    }}
                    title={t('settings.pay.customColor')}
                >
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    {custom && <Check className="size-3.5 text-white" />}
                </label>
            </div>
            <div className="flex items-center gap-2">
                <span
                    className="size-5 shrink-0 rounded-md ring-1 ring-black/10"
                    style={{ backgroundColor: value }}
                />
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={7}
                    aria-label={t('settings.delivery.paymentColor')}
                    className="h-8 w-28 font-mono text-xs uppercase"
                />
            </div>
        </div>
    );
}

/** The bank KHQR image for a manual payment option — a big square preview. */
function QrPicker({
    value,
    file,
    onPick,
}: {
    value: string;
    file: File | null;
    onPick: (file: File | null) => void;
}) {
    const { t } = useI18n();
    const inputRef = useRef<HTMLInputElement>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const objectUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    );
    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);
    const src = objectUrl ?? getFileUrl(value);

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{t('settings.pay.qrImage')}</p>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="group relative flex size-40 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/30 transition hover:border-pink-300 dark:hover:border-pink-700"
            >
                {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={src}
                        alt=""
                        className="size-full object-contain bg-white"
                    />
                ) : (
                    <span className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                        <ScanLine className="size-6" />
                        {t('settings.pay.uploadQr')}
                    </span>
                )}
            </button>
            {src && (
                <div className="flex gap-3 text-xs">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="font-medium text-pink-600 hover:underline dark:text-pink-400"
                    >
                        {t('settings.banner.replace')}
                    </button>
                    <button
                        type="button"
                        onClick={() => onPick(null)}
                        className="text-muted-foreground hover:text-destructive"
                    >
                        {t('common.delete')}
                    </button>
                </div>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) setCropFile(f);
                }}
            />
            {/* PNG keeps the QR crisp enough to scan */}
            <ImageCropDialog
                file={cropFile}
                output="image/png"
                maxSize={1200}
                title={t('crop.qrTitle')}
                onCancel={() => setCropFile(null)}
                onDone={(cropped) => {
                    setCropFile(null);
                    onPick(cropped);
                }}
            />
        </div>
    );
}
