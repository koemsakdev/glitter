'use client';

import { Boxes } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function InventoryPage() {
    const { t } = useI18n();
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
            <Boxes className="size-10 text-muted-foreground/50" />
            <h1 className="text-lg font-semibold">{t('nav.inventory')}</h1>
            <p className="text-sm text-muted-foreground">
                {t('nav.comingSoon')}
            </p>
        </div>
    );
}
