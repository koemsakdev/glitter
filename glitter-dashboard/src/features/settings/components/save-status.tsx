'use client';

import { CircleCheck, Loader2 } from 'lucide-react';
import { useSettingsSaveStatus } from '@/features/settings/use-settings';
import { useI18n } from '@/lib/i18n';

/** Quiet "Saving… / ✓ Saved" indicator for App settings (no toasts). */
export function SaveStatus() {
    const { t } = useI18n();
    const status = useSettingsSaveStatus((s) => s.status);
    if (status === 'idle') return null;
    return (
        <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground duration-200 animate-in fade-in"
        >
            {status === 'saving' ? (
                <Loader2 className="size-3.5 animate-spin" />
            ) : (
                <CircleCheck className="size-3.5 text-emerald-500" />
            )}
            {status === 'saving' ? t('common.saving') : t('settings.savedShort')}
        </span>
    );
}
