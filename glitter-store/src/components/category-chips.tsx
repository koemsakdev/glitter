'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { useLang } from '@/lib/lang-context';
import { pick, tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';

export type CategoryChip = {
    id: string;
    nameEn: string;
    nameKm: string;
    iconUrl?: string | null;
};

/**
 * Category filter chips with INSTANT feedback: the tapped chip highlights and
 * shows a spinner immediately (optimistic), while the filtered list loads in a
 * transition — instead of feeling like the click did nothing until the page
 * finally changed.
 */
export function CategoryChips({
    categories,
    activeId,
    lang: initialLang,
}: {
    categories: CategoryChip[];
    activeId: string;
    lang: Lang;
}) {
    const { lang } = useLang(initialLang);
    const router = useRouter();
    const params = useSearchParams();
    const [isPending, startTransition] = useTransition();
    // Which chip the user just tapped (optimistic highlight while loading).
    const [target, setTarget] = useState(activeId);

    function go(id: string) {
        if (id === activeId) return;
        setTarget(id);
        const p = new URLSearchParams(params.toString());
        if (id) p.set('categoryId', id);
        else p.delete('categoryId');
        p.delete('page');
        startTransition(() => {
            router.push(`/products?${p.toString()}`, { scroll: false });
        });
    }

    // During loading show the tapped chip as active; otherwise trust the URL.
    const shown = isPending ? target : activeId;

    const chipBase =
        'flex shrink-0 items-center gap-2 rounded-full text-sm font-semibold transition-all disabled:cursor-default';
    const activeCls =
        'bg-(--brand) text-white shadow-lg shadow-(--brand)/30';
    const idleCls =
        'bg-white text-zinc-600 border border-zinc-200 hover:text-(--brand) hover:border-(--brand)/40 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700';

    return (
        <div className="mt-5 flex gap-2.5 overflow-x-auto pb-2 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
            <button
                type="button"
                onClick={() => go('')}
                className={cn(chipBase, 'px-4 py-2', !shown ? activeCls : idleCls)}
            >
                {isPending && target === '' ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <LayoutGrid className="size-4" />
                )}
                {tr(lang, 'all')}
            </button>
            {categories.map((c) => {
                const isActive = shown === c.id;
                const loading = isPending && target === c.id;
                const icon = fileUrl(c.iconUrl);
                const cname = pick(lang, c.nameEn, c.nameKm);
                return (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => go(c.id)}
                        className={cn(
                            chipBase,
                            'py-1.5 pl-1.5 pr-4',
                            isActive ? activeCls : idleCls,
                        )}
                    >
                        <span className="flex size-6 items-center justify-center overflow-hidden rounded-full">
                            {loading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : icon ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={icon}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                <span
                                    className={cn(
                                        'text-xs font-bold',
                                        isActive ? 'text-white' : 'text-(--brand)',
                                    )}
                                >
                                    {cname.charAt(0)}
                                </span>
                            )}
                        </span>
                        {cname}
                    </button>
                );
            })}
        </div>
    );
}
