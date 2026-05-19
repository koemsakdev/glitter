'use client';

import {Check, Languages} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n, type Language } from '@/lib/i18n';
import {cn} from "@/lib/utils";
import Flag from "react-world-flags";

export function LanguageToggle() {
    const { language, setLanguage, t } = useI18n();

    const options: Array<{ code: Language; label: string, countryCode: string }> = [
        { code: 'en', label: t('language.english'), countryCode: 'US' },
        { code: 'km', label: t('language.khmer'), countryCode: 'KH' },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 rounded-full border border-neutral-200 dark:border-neutral-800"
                        aria-label={t('language.toggle')}
                    >
                        <Languages className="h-4 w-4" />
                        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-pink-400 px-1 text-[8px] font-bold leading-tight text-white dark:bg-pink-300 dark:text-pink-950">
                          {language === 'en' ? 'EN' : 'KH'}
                        </span>
                    </Button>
                }
            />
            <DropdownMenuContent align="end" className="w-52 p-1">
                {options.map((opt) => (
                    <DropdownMenuItem
                        key={opt.code}
                        onClick={() => setLanguage(opt.code)}
                        className={cn(
                            language === opt.code ? 'font-semibold' : '',
                            'flex items-center justify-between cursor-pointer py-2 px-3 focus:bg-pink-50 dark:focus:bg-pink-700/5'
                        )}
                    >

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 verflow-hidden rounded-full border border-neutral-100 dark:border-neutral-800">
                                <Flag code={opt.countryCode} className="object-cover w-full h-full rounded-full" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{opt.label}</span>
                                <span className="text-[10px] text-neutral-500">{opt.label}</span>
                            </div>
                        </div>
                        {language === opt.code && (
                            <Check className="size-4 text-pink-500" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}