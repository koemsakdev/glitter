'use client';

import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n, type TranslationKey } from '@/lib/i18n';

interface PlaceholderPageProps {
    titleKey: TranslationKey;
}

/**
 * Reusable placeholder for pages we haven't built yet.
 * Each Chunk 4-onward feature will replace these with real implementations.
 */
export function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
    const { t, language } = useI18n();
    const khmerClass = language === 'km' ? 'font-khmer' : '';

    return (
        <div className="space-y-6">
            <h1 className={`text-3xl font-bold tracking-tight ${khmerClass}`}>
                {t(titleKey)}
            </h1>

            <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <Construction className="size-12 text-muted-foreground/50" />
                    <p className={`text-muted-foreground ${khmerClass}`}>
                        {t('common.comingSoon')}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}