'use client';

import { useEffect, useState } from 'react';
import { MaintenanceScreen } from '@/components/maintenance-screen';
import type { Lang } from '@/lib/locale';
import type { StoreConfig, StoreMaintenance } from '@/lib/store-config';

/**
 * Dashboard preview (App settings → Maintenance) loads the real store with
 * `?mtPreview=1` and sends the draft message / time with postMessage. Shows
 * the maintenance screen on top — only on that viewer's screen; nothing is
 * saved and real shoppers are unaffected.
 */
export function MaintenancePreview({
    config,
    lang,
}: {
    config: StoreConfig;
    lang: Lang;
}) {
    const [draft, setDraft] = useState<StoreMaintenance | null>(null);

    useEffect(() => {
        if (!new URLSearchParams(window.location.search).has('mtPreview'))
            return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- preview flag is only known in the browser
        setDraft({ ...config.maintenance, enabled: true });
        function onMessage(e: MessageEvent) {
            const d = e.data as Partial<StoreMaintenance> & { type?: string };
            if (d?.type !== 'glitter-mt-preview') return;
            setDraft((prev) => ({
                enabled: true,
                messageEn:
                    typeof d.messageEn === 'string'
                        ? d.messageEn
                        : (prev?.messageEn ?? ''),
                messageKm:
                    typeof d.messageKm === 'string'
                        ? d.messageKm
                        : (prev?.messageKm ?? ''),
                endsAt:
                    d.endsAt === null || typeof d.endsAt === 'string'
                        ? d.endsAt
                        : (prev?.endsAt ?? null),
            }));
        }
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [config.maintenance]);

    // The store page underneath must not scroll behind the preview.
    useEffect(() => {
        if (!draft) return;
        const html = document.documentElement;
        const prev = html.style.overflow;
        html.style.overflow = 'hidden';
        return () => {
            html.style.overflow = prev;
        };
    }, [draft]);

    if (!draft) return null;
    return (
        <MaintenanceScreen
            config={{ ...config, maintenance: draft }}
            lang={lang}
        />
    );
}
