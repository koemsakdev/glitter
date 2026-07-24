'use client';

import { useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { tr, type Lang } from '@/lib/locale';

/**
 * Capture a receipt card (referenced by `receiptRef`) to a high-quality PNG and
 * either download it or share it. On mobile the native share sheet includes
 * Telegram (send straight to the store); on desktop we save the image and open
 * the store's Telegram so it can be attached.
 */
export function useReceiptDownload({
    orderNumber,
    lang,
    telegramUrl,
}: {
    orderNumber: string;
    lang: Lang;
    telegramUrl?: string;
}) {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [saving, setSaving] = useState(false);

    async function capture(): Promise<Blob | null> {
        const node = receiptRef.current;
        if (!node) return null;
        const dark = document.documentElement.classList.contains('dark');
        return toBlob(node, {
            pixelRatio: 3, // 3× for a crisp, high-quality image
            cacheBust: true,
            backgroundColor: dark ? '#09090b' : '#ffffff',
        });
    }

    function saveBlob(blob: Blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${orderNumber || 'order'}.png`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function download() {
        setSaving(true);
        try {
            const blob = await capture();
            if (blob) saveBlob(blob);
        } catch {
            // ignore — capture failed
        } finally {
            setSaving(false);
        }
    }

    async function share() {
        setSaving(true);
        try {
            const blob = await capture();
            if (!blob) return;
            const file = new File([blob], `receipt-${orderNumber || 'order'}.png`, {
                type: 'image/png',
            });
            const nav = navigator as Navigator & {
                canShare?: (data?: ShareData) => boolean;
            };
            if (nav.share && nav.canShare?.({ files: [file] })) {
                await nav.share({
                    files: [file],
                    title: tr(lang, 'orderPlaced'),
                    text: `${tr(lang, 'orderNumber')}: ${orderNumber}`,
                });
                return;
            }
            // Desktop fallback: save + open the store's Telegram to attach it.
            saveBlob(blob);
            if (telegramUrl) window.open(telegramUrl, '_blank', 'noopener');
        } catch {
            // user cancelled the share sheet, or capture failed — ignore
        } finally {
            setSaving(false);
        }
    }

    return { receiptRef, saving, download, share };
}
