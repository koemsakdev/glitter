'use client';

import {Languages} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n, type Language } from '@/lib/i18n';

export function LanguageToggle() {
    const { language, setLanguage, t } = useI18n();

    const options: Array<{ code: Language; label: string }> = [
        { code: 'en', label: t('language.english') },
        { code: 'km', label: t('language.khmer') },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 rounded-full"
                        aria-label={t('language.toggle')}
                    >
                        <Languages className="h-4 w-4" />
                        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-pink-400 px-1 text-[8px] font-bold leading-tight text-white dark:bg-pink-300 dark:text-pink-950">
                          {language === 'en' ? 'EN' : 'KH'}
                        </span>
                    </Button>
                }
            />
            <DropdownMenuContent align="end">
                {options.map((opt) => (
                    <DropdownMenuItem
                        key={opt.code}
                        onClick={() => setLanguage(opt.code)}
                        className={language === opt.code ? 'font-semibold' : ''}
                    >
                        {opt.label}
                        {language === opt.code && (
                            <span className="ml-auto text-pink-500 dark:text-pink-300">
                                ✓
                            </span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}