'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BrandedLoader } from '@/components/feedback/branded-loader';
import { useI18n } from '@/lib/i18n';

interface SavingOverlayProps {
    /** Whether the overlay is shown */
    open: boolean;
    /** Optional label under the spinner (defaults to "Saving…") */
    label?: string;
}

/**
 * Full-screen blocking overlay shown while a form is saving.
 *
 * It is rendered through a portal to `document.body` so it always covers the
 * whole viewport — even if an ancestor uses a CSS transform/filter (which would
 * otherwise trap a `position: fixed` element). Page scroll is locked while it is
 * open so the user can't scroll or interact with the page mid-save.
 */
export function SavingOverlay({ open, label }: SavingOverlayProps) {
    const { t } = useI18n();

    // Lock body scroll while the overlay is open.
    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-background/75 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-8 py-6 shadow-xl">
                <BrandedLoader label={label ?? t('common.saving')} />
            </div>
        </div>,
        document.body,
    );
}
