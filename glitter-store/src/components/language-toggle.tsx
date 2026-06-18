'use client';

import { useRouter } from 'next/navigation';
import type { Lang } from '@/lib/locale';

export function LanguageToggle({ lang }: { lang: Lang }) {
    const router = useRouter();

    function setLang(next: Lang) {
        if (next === lang) return;
        document.cookie = `lang=${next};path=/;max-age=31536000`;
        router.refresh();
    }

    return (
        <div className="flex shrink-0 items-center rounded-full border border-zinc-200 p-0.5 text-xs font-medium">
            {(['en', 'km'] as const).map((l) => (
                <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={
                        l === lang
                            ? 'rounded-full bg-(--brand) px-2.5 py-1 text-white'
                            : 'rounded-full px-2.5 py-1 text-zinc-500 hover:text-zinc-900'
                    }
                >
                    {l === 'en' ? 'EN' : 'ខ្មែរ'}
                </button>
            ))}
        </div>
    );
}
