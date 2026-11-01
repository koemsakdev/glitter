'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
    Clock,
    Construction,
    CreditCard,
    Lock,
    PackageCheck,
    PartyPopper,
    Power,
    RefreshCw,
    type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    BilingualField,
    SettingsCard,
} from '@/features/settings/components/settings-shared';
import { StorePhonePreview } from '@/features/settings/components/store-phone-preview';
import type { StoreMaintenance } from '@/features/settings/store-config';
import {
    useSaveStoreConfig,
    useStoreConfig,
} from '@/features/settings/use-settings';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useIsAdmin } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const CONFIG_KEY = ['app-settings', 'store-config'] as const;

/** Ready-made messages (English + Khmer) — one tap fills both. */
const TEMPLATES: {
    key: TranslationKey;
    icon: LucideIcon;
    en: string;
    km: string;
}[] = [
    {
        key: 'settings.maintenance.tpl.update',
        icon: RefreshCw,
        en: 'We’re giving our shop a quick upgrade so shopping is faster and smoother for you. Your account, wishlist and past orders are all safe — please come back in a little while. Thank you for your patience! 💗',
        km: 'យើងកំពុងកែលម្អហាងរបស់យើង ដើម្បីឱ្យការទិញទំនិញកាន់តែលឿន និងងាយស្រួលសម្រាប់អ្នក។ គណនី បញ្ជីចូលចិត្ត និងការបញ្ជាទិញពីមុនរបស់អ្នកមានសុវត្ថិភាព — សូមត្រឡប់មកវិញបន្តិចទៀត។ សូមអរគុណចំពោះការអត់ធ្មត់! 💗',
    },
    {
        key: 'settings.maintenance.tpl.stock',
        icon: PackageCheck,
        en: 'We’re restocking and adding new arrivals ✨ The shop will reopen very soon with fresh styles — thank you for waiting!',
        km: 'យើងកំពុងបំពេញស្តុក និងបន្ថែមទំនិញថ្មីៗ ✨ ហាងនឹងបើកវិញឆាប់ៗនេះជាមួយម៉ូដថ្មីៗ — សូមអរគុណដែលបានរង់ចាំ!',
    },
    {
        key: 'settings.maintenance.tpl.payment',
        icon: CreditCard,
        en: 'We’re upgrading our payment system to keep every purchase safe and secure. Online orders are paused for a short while — please check back soon.',
        km: 'យើងកំពុងធ្វើបច្ចុប្បន្នភាពប្រព័ន្ធទូទាត់ ដើម្បីរក្សាសុវត្ថិភាពរាល់ការទិញ។ ការបញ្ជាទិញតាមអនឡាញត្រូវបានផ្អាកមួយរយៈខ្លី — សូមត្រឡប់មកវិញឆាប់ៗ។',
    },
    {
        key: 'settings.maintenance.tpl.holiday',
        icon: PartyPopper,
        en: 'We’re taking a short holiday break 🎉 Online orders will reopen soon. You can still reach us by phone or Telegram. See you soon!',
        km: 'យើងកំពុងសម្រាកថ្ងៃបុណ្យមួយរយៈខ្លី 🎉 ការបញ្ជាទិញតាមអនឡាញនឹងបើកវិញឆាប់ៗ។ អ្នកនៅតែអាចទាក់ទងយើងតាមទូរស័ព្ទ ឬ Telegram។ ជួបគ្នាឆាប់ៗ!',
    },
];

/** Every half hour, "00:00" … "23:30". */
const TIMES = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, '0');
    return `${h}:${i % 2 ? '30' : '00'}`;
});

/** "18:30" → "6:30 PM". */
function timeLabel(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

const pad = (n: number) => String(n).padStart(2, '0');
function todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Stored ISO time → local { date: 'YYYY-MM-DD', time: 'HH:MM' }. */
function splitLocal(iso: string | null): { date: string; time: string } {
    if (!iso) return { date: '', time: '' };
    const d = new Date(iso);
    return {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${d.getMinutes() < 30 ? '00' : '30'}`,
    };
}

/** App settings → Maintenance (admin only). */
export default function MaintenanceSettingsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const isAdmin = useIsAdmin();
    const queryClient = useQueryClient();
    const { data, isLoading } = useStoreConfig();
    const save = useSaveStoreConfig();
    // Message drafts are saved on blur (not on every key press).
    const [draft, setDraft] = useState<{ en: string; km: string } | null>(null);

    if (isLoading || !data) return <LoadingScreen variant="page" />;

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-16 text-center">
                <Lock className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                    {t('settings.maintenance.adminOnly')}
                </p>
            </div>
        );
    }

    const m = data.config.maintenance;
    const msg = draft ?? { en: m.messageEn, km: m.messageKm };
    const ends = splitLocal(m.endsAt);
    function setEnds(date: string, time: string) {
        const [y, mo, d] = date.split('-').map(Number);
        const [h, mi] = time.split(':').map(Number);
        setM({ endsAt: new Date(y, mo - 1, d, h, mi).toISOString() });
    }

    function setM(patch: Partial<StoreMaintenance>) {
        if (!data) return;
        const nextConfig = {
            ...data.config,
            maintenance: { ...data.config.maintenance, ...patch },
        };
        queryClient.setQueryData(CONFIG_KEY, { ...data, config: nextConfig });
        save.mutate(
            { config: nextConfig, settingId: data.settingId },
            {
                onError: (error) => {
                    void queryClient.invalidateQueries({
                        queryKey: ['app-settings'],
                    });
                    toast({
                        title: t('settings.couldNotSave'),
                        description: getErrorMessage(error),
                        variant: 'destructive',
                    });
                },
            },
        );
    }

    function commitMessage() {
        if (!draft) return;
        if (draft.en !== m.messageEn || draft.km !== m.messageKm) {
            setM({ messageEn: draft.en, messageKm: draft.km });
        }
        setDraft(null);
    }

    return (
        <div className="space-y-6">
            {/* Status + switch */}
            <div
                className={cn(
                    'flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center',
                    m.enabled
                        ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                        : 'bg-card',
                )}
            >
                <span
                    className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-xl',
                        m.enabled
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                    )}
                >
                    {m.enabled ? (
                        <Construction className="size-6" />
                    ) : (
                        <Power className="size-6" />
                    )}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                        {m.enabled
                            ? t('settings.maintenance.onTitle')
                            : t('settings.maintenance.offTitle')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {m.enabled
                            ? t('settings.maintenance.onBody')
                            : t('settings.maintenance.offBody')}
                    </p>
                </div>
                <label className="flex items-center gap-3 self-start sm:self-center">
                    <span className="text-sm font-medium">
                        {t('settings.maintenance.switch')}
                    </span>
                    <Switch
                        checked={m.enabled}
                        onCheckedChange={(v) => setM({ enabled: Boolean(v) })}
                    />
                </label>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                    <SettingsCard
                        title={t('settings.maintenance.messageTitle')}
                    >
                        <div className="space-y-2">
                            <p className="text-sm font-medium">
                                {t('settings.maintenance.templates')}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {TEMPLATES.map((tpl) => {
                                    const active =
                                        msg.en === tpl.en && msg.km === tpl.km;
                                    return (
                                        <button
                                            key={tpl.key}
                                            type="button"
                                            onClick={() => {
                                                setDraft(null);
                                                setM({
                                                    messageEn: tpl.en,
                                                    messageKm: tpl.km,
                                                });
                                            }}
                                            className={cn(
                                                'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all',
                                                active
                                                    ? 'border-pink-400 bg-pink-50/60 ring-1 ring-pink-400 dark:border-pink-700 dark:bg-pink-500/10 dark:ring-pink-700'
                                                    : 'hover:border-foreground/20 hover:bg-muted/40',
                                            )}
                                        >
                                            <tpl.icon className="size-4 shrink-0 text-muted-foreground" />
                                            {t(tpl.key)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div onBlur={commitMessage} className="space-y-1">
                            <BilingualField
                                label={t('settings.maintenance.message')}
                                en={msg.en}
                                km={msg.km}
                                onEn={(en) => setDraft({ ...msg, en })}
                                onKm={(km) => setDraft({ ...msg, km })}
                                textarea
                                maxLength={300}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('settings.maintenance.messageHint')}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.maintenance.endsAt')}
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-48">
                                    <DatePicker
                                        value={ends.date}
                                        onChange={(date) =>
                                            setEnds(date, ends.time || '18:00')
                                        }
                                        fromYear={new Date().getFullYear()}
                                        toYear={new Date().getFullYear() + 1}
                                    />
                                </div>
                                <Select
                                    value={ends.time}
                                    onValueChange={(v) =>
                                        v && setEnds(ends.date || todayISO(), v)
                                    }
                                >
                                    <SelectTrigger
                                        className="h-10 w-32"
                                        aria-label={t(
                                            'settings.maintenance.time',
                                        )}
                                    >
                                        <Clock className="size-4 text-muted-foreground" />
                                        <SelectValue
                                            placeholder={t(
                                                'settings.maintenance.time',
                                            )}
                                        >
                                            {(v: string) => timeLabel(v)}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        {TIMES.map((tm) => (
                                            <SelectItem key={tm} value={tm}>
                                                {timeLabel(tm)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {m.endsAt && (
                                    <button
                                        type="button"
                                        onClick={() => setM({ endsAt: null })}
                                        className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                                    >
                                        {t('settings.maintenance.clearTime')}
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('settings.maintenance.endsAtHint')}
                            </p>
                        </div>
                    </SettingsCard>
                </div>

                <aside className="lg:sticky lg:top-24 lg:h-fit">
                    <StorePhonePreview
                        title={t('settings.maintenance.preview')}
                        query="mtPreview=1"
                        message={{
                            type: 'glitter-mt-preview',
                            messageEn: msg.en,
                            messageKm: msg.km,
                            endsAt: m.endsAt,
                        }}
                        note={t('settings.maintenance.previewNote')}
                    />
                </aside>
            </div>
        </div>
    );
}
