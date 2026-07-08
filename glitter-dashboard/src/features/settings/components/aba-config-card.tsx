'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    paymentConfigApi,
    type PaymentConfigInput,
    type PaymentConfigView,
} from '@/features/settings/payment-config-api';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

const KEY = ['payment-config'] as const;

/**
 * ABA PayWay (KHQR) connection card. Lives in the General tab beneath the
 * payment options. Reads/writes the private payment_config endpoints — separate
 * from the public store-config blob, so credentials never reach the storefront.
 */
export function AbaConfigCard() {
    const { data, isLoading } = useQuery({
        queryKey: KEY,
        queryFn: paymentConfigApi.get,
    });

    return (
        <div className="rounded-xl border bg-card">
            <div className="border-b px-5 py-4">
                <h3 className="text-sm font-semibold">ABA PayWay (KHQR)</h3>
                <AbaSubtitle />
            </div>
            <div className="p-5">
                {isLoading || !data ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader className="size-4 animate-spin" />
                    </div>
                ) : (
                    <AbaForm
                        key={data.merchantId + String(data.enabled)}
                        config={data}
                    />
                )}
            </div>
        </div>
    );
}

function AbaSubtitle() {
    const { t } = useI18n();
    return (
        <p className="mt-0.5 text-xs text-muted-foreground">
            {t('settings.aba.subtitle')}
        </p>
    );
}

function AbaForm({ config }: { config: PaymentConfigView }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [enabled, setEnabled] = useState(config.enabled);
    const [sandbox, setSandbox] = useState(config.sandbox);
    const [merchantId, setMerchantId] = useState(config.merchantId);
    const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl);
    const [apiKey, setApiKey] = useState('');
    const [rsaPublicKey, setRsaPublicKey] = useState(config.rsaPublicKey);
    const [rsaPrivateKey, setRsaPrivateKey] = useState('');

    const save = useMutation({
        mutationFn: (input: PaymentConfigInput) => paymentConfigApi.update(input),
        onSuccess: (fresh) => {
            queryClient.setQueryData(KEY, fresh);
            setApiKey('');
            setRsaPrivateKey('');
            toast({ title: t('settings.saved') });
        },
        onError: (e) =>
            toast({
                title: t('settings.couldNotSave'),
                description: getErrorMessage(e),
                variant: 'destructive',
            }),
    });

    function onSave() {
        const input: PaymentConfigInput = {
            enabled,
            sandbox,
            merchantId,
            webhookUrl,
            rsaPublicKey,
        };
        if (apiKey.trim()) input.apiKey = apiKey.trim();
        if (rsaPrivateKey.trim()) input.rsaPrivateKey = rsaPrivateKey.trim();
        save.mutate(input);
    }

    return (
        <div className="space-y-5">
            <ToggleRow
                label={t('settings.aba.enable')}
                hint={t('settings.aba.enableHint')}
                checked={enabled}
                onChange={setEnabled}
            />
            <ToggleRow
                label={t('settings.aba.sandbox')}
                hint={t('settings.aba.sandboxHint')}
                checked={sandbox}
                onChange={setSandbox}
            />

            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    {t('settings.aba.credentials')}
                </div>
                <Field label={t('settings.aba.merchantId')}>
                    <input
                        value={merchantId}
                        onChange={(e) => setMerchantId(e.target.value)}
                        className={inputCls}
                        placeholder="ec476655"
                    />
                </Field>
                <Field
                    label={t('settings.aba.apiKey')}
                    hint={
                        config.hasApiKey
                            ? t('settings.aba.secretSaved')
                            : t('settings.aba.secretMissing')
                    }
                >
                    <input
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        type="password"
                        autoComplete="off"
                        className={inputCls}
                        placeholder={config.hasApiKey ? '••••••••' : ''}
                    />
                </Field>
                <Field label={t('settings.aba.rsaPublic')}>
                    <textarea
                        value={rsaPublicKey}
                        onChange={(e) => setRsaPublicKey(e.target.value)}
                        rows={4}
                        className={`${inputCls} font-mono text-xs`}
                        placeholder="-----BEGIN PUBLIC KEY-----"
                    />
                </Field>
                <Field
                    label={t('settings.aba.rsaPrivate')}
                    hint={
                        config.hasRsaPrivateKey
                            ? t('settings.aba.secretSaved')
                            : t('settings.aba.secretMissing')
                    }
                >
                    <textarea
                        value={rsaPrivateKey}
                        onChange={(e) => setRsaPrivateKey(e.target.value)}
                        rows={4}
                        autoComplete="off"
                        className={`${inputCls} font-mono text-xs`}
                        placeholder={
                            config.hasRsaPrivateKey
                                ? '•••••••• (saved)'
                                : '-----BEGIN RSA PRIVATE KEY-----'
                        }
                    />
                </Field>
            </div>

            <Field
                label={t('settings.aba.webhook')}
                hint={t('settings.aba.webhookHint')}
            >
                <input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className={inputCls}
                    placeholder="https://your-domain.com/api/payments/aba/webhook"
                />
            </Field>

            <div className="flex justify-end">
                <Button
                    onClick={onSave}
                    disabled={save.isPending}
                    className="bg-pink-500 text-white hover:bg-pink-600"
                >
                    {save.isPending && <Loader className="size-4 animate-spin" />}
                    {t('settings.saveChanges')}
                </Button>
            </div>
        </div>
    );
}

const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/40';

function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function ToggleRow({
    label,
    hint,
    checked,
    onChange,
}: {
    label: string;
    hint: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4">
            <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">
                    {hint}
                </span>
            </span>
            <Switch
                checked={checked}
                onCheckedChange={(v) => onChange(Boolean(v))}
            />
        </label>
    );
}
